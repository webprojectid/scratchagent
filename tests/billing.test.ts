import { test, before } from "node:test";
import assert from "node:assert/strict";
import { getAccountState, grantPro, endPro, banUser, unbanUser, getAccountDetail, isAdminEmail, listAccounts } from "@/lib/billing";
import { memoryGetOrCreateUser } from "@/lib/memory-store";
import { consumeQuota } from "@/lib/quota";

// Memory mode: tanpa DATABASE_URL.
before(() => {
  delete process.env.DATABASE_URL;
  process.env.QUOTA_GENERATE_DAILY = "3";
});

test("teguhends@gmail.com diakui sebagai admin", () => {
  assert.equal(isAdminEmail("teguhends@gmail.com"), true);
  assert.equal(isAdminEmail("TEGUHENDS@GMAIL.COM"), true, "case insensitive");
  assert.equal(isAdminEmail("orang-lain@gmail.com"), false);
});

test("grantPro mengaktifkan tier pro + mencatat langganan", async () => {
  const u = memoryGetOrCreateUser("pelanggan@example.com", "Pelanggan");
  const res = await grantPro(u.id, "teguhends@gmail.com", 31);
  assert.equal(res.ok, true);
  const state = await getAccountState(u.id);
  assert.equal(state?.tier, "pro");
  const detail = await getAccountDetail(u.id);
  assert.ok(detail);
  assert.equal(detail!.proActive, true);
  assert.ok(detail!.firstProAt, "firstProAt terisi setelah grant");
  assert.equal(detail!.lastProEnd, null, "belum pernah berakhir");
});

test("grantPro kedua kali ditolak selama masih aktif", async () => {
  const u = memoryGetOrCreateUser("pelanggan@example.com");
  const res = await grantPro(u.id, "teguhends@gmail.com", 31);
  assert.equal(res.ok, false);
});

test("endPro menutup langganan dan menurunkan tier ke free", async () => {
  const u = memoryGetOrCreateUser("pelanggan@example.com");
  const res = await endPro(u.id, "teguhends@gmail.com");
  assert.equal(res.ok, true);
  const state = await getAccountState(u.id);
  assert.equal(state?.tier, "free");
  const detail = await getAccountDetail(u.id);
  assert.equal(detail!.proActive, false);
  assert.ok(detail!.lastProEnd, "tanggal berakhir tercatat");
});

test("endPro tanpa langganan aktif ditolak", async () => {
  const u = memoryGetOrCreateUser("pelanggan@example.com");
  const res = await endPro(u.id, "teguhends@gmail.com");
  assert.equal(res.ok, false);
});

test("banUser dan unbanUser mengubah status banned", async () => {
  const u = memoryGetOrCreateUser("bandel@example.com");
  assert.equal((await getAccountState(u.id))?.bannedAt, null);
  await banUser(u.id);
  assert.ok((await getAccountState(u.id))?.bannedAt, "bannedAt terisi setelah ban");
  await unbanUser(u.id);
  assert.equal((await getAccountState(u.id))?.bannedAt, null, "banned tercabut");
});

test("riwayat generate tercatat per tier: pro vs free", async () => {
  const u = memoryGetOrCreateUser("pemakaian@example.com");
  // 2 generate sebagai free, lalu jadi pro dan 1 generate.
  await consumeQuota(u.id, "free");
  await consumeQuota(u.id, "free");
  await grantPro(u.id, "teguhends@gmail.com", 31);
  await consumeQuota(u.id, "pro");
  const detail = await getAccountDetail(u.id);
  assert.equal(detail!.proGenerateCount, 1, "generate pro terhitung");
  assert.equal(detail!.freeGenerate24h, 2, "generate free 24 jam terhitung");
});

test("listAccounts bisa dicari berdasarkan email", async () => {
  memoryGetOrCreateUser("cari-aku@example.com", "Target Cari");
  const semua = await listAccounts();
  assert.ok(semua.length >= 3);
  const hasil = await listAccounts("cari-aku");
  assert.equal(hasil.length, 1);
  assert.equal(hasil[0].email, "cari-aku@example.com");
});

test("grantPro setiap durasi: 7, 14, 28, 31, 93 hari mencatat expiresAt", async () => {
  const durations = [7, 14, 28, 31, 93];
  for (const days of durations) {
    const email = `durasi-${days}@example.com`;
    const u = memoryGetOrCreateUser(email);
    const res = await grantPro(u.id, "teguhends@gmail.com", days);
    assert.equal(res.ok, true, `grant ${days} hari harus berhasil`);
    const detail = await getAccountDetail(u.id);
    assert.ok(detail, `detail ${email} ada`);
    assert.equal(detail!.proActive, true);
    assert.ok(detail!.proExpiresAt, `proExpiresAt terisi untuk ${days} hari`);
    const started = new Date(detail!.firstProAt!).getTime();
    const expires = new Date(detail!.proExpiresAt!).getTime();
    const diffDays = Math.round((expires - started) / 86_400_000);
    assert.equal(diffDays, days, `selisih masa aktif ${days} hari`);
    // Riwayat subscription ikut membawa expiresAt.
    assert.ok(detail!.subscriptions.length > 0);
    assert.ok(detail!.subscriptions[0].expiresAt, "subscription mencatat expiresAt");
  }
});

test("grantPro dengan durasi tidak valid ditolak", async () => {
  const u = memoryGetOrCreateUser("durasi-aneh@example.com");
  const res = await grantPro(u.id, "teguhends@gmail.com", 12);
  assert.equal(res.ok, false, "durasi di luar pilihan resmi harus ditolak");
  const state = await getAccountState(u.id);
  assert.equal(state?.tier, "free", "tier tetap free setelah grant gagal");
});

test("pro kedaluwarsa otomatis: tier efektif kembali free", async () => {
  const u = memoryGetOrCreateUser("kadaluarsa@example.com");
  // Grant 7 hari, lalu tarik waktu maju: getAccountState membaca expiry.
  const res = await grantPro(u.id, "teguhends@gmail.com", 7);
  assert.equal(res.ok, true);
  assert.equal((await getAccountState(u.id))?.tier, "pro");
  // Simulasikan waktu lewat masa berlaku dengan memanggil sync dengan now di masa depan.
  const { syncExpiredPro } = await import("@/lib/billing");
  const future = new Date(Date.now() + 8 * 86_400_000);
  await syncExpiredPro(u.id, future);
  const state = await getAccountState(u.id);
  assert.equal(state?.tier, "free", "tier turun ke free setelah kedaluwarsa");
  const detail = await getAccountDetail(u.id);
  assert.equal(detail!.proActive, false, "langganan tidak lagi aktif");
  assert.ok(detail!.lastProEnd, "tanggal berakhir tercatat saat kedaluwarsa");
});
