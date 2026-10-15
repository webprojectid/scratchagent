import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  removeVagueCriteria,
  validateFeatureDraft,
  validateSubfeatureDraft,
  validateTaskDraft,
  validateFinalPlan,
  type FeatureDraft,
  type SubfeatureDraft,
  type TaskDraft,
} from "../src/lib/generation-quality";
import type { Plan } from "../src/lib/types";

function feature(index: number): FeatureDraft {
  return {
    title: `Akses pengguna ${index}`,
    description: `Pengguna dapat membuka ruang kerja ${index} setelah identitas akun diperiksa.`,
    tujuan: `Batasi akses ruang kerja ${index} kepada pemilik akun yang sah.`,
    selesai_bila: [
      `Pemilik akun ${index} dapat membuka ruang kerja setelah login berhasil.`,
      `Password salah pada ruang kerja ${index} menampilkan pesan tanpa membuka data.`,
      `Pemilik akun ${index} dapat keluar dan sesi sebelumnya tidak berlaku lagi.`,
    ],
  };
}

function subfeature(index: number): SubfeatureDraft {
  return {
    title: `Validasi akun ${index}`,
    tujuan: `Pastikan akses akun ${index} hanya diberikan setelah identitas diverifikasi.`,
    selesai_bila: [
      `Email akun ${index} yang tidak terdaftar menerima pesan kesalahan.`,
      `Akun ${index} yang valid memperoleh sesi setelah password cocok.`,
    ],
  };
}

function tasks(count: number, subTitles: string[]): TaskDraft[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `t${index + 1}`,
    sub_feature: subTitles[index % subTitles.length],
    title: `Bangun validasi langkah ${index + 1} untuk akun pengguna`,
    deps: index === 0 ? [] : [`t${index}`],
  }));
}

function finalPlan(tier: "free" | "pro", featureCount: number, subCount: number, taskCount: number): Pick<Plan, "features" | "tier"> {
  return {
    tier,
    features: Array.from({ length: featureCount }, (_, featureIndex) => ({
      slug: `fase-${featureIndex}`,
      title: `Fase ${featureIndex}`,
      icon: "",
      description: "",
      tujuan: "",
      selesaiBila: [],
      status: "direncanakan" as const,
      subFeatures: Array.from({ length: subCount }, (_, subIndex) => ({
        title: `Bagian ${subIndex}`,
        tasks: Array.from({ length: 1 + (subIndex === 0 ? taskCount - subCount : 0) }, (_, taskIndex) => ({
          ref: `F${featureIndex}-S${subIndex}-T${taskIndex}`,
          title: `Task ${taskIndex}`,
          layer: "backend" as const,
          phase: featureIndex + 1,
          page: null,
          deps: [],
          status: "pending" as const,
        })),
      })),
    })),
  };
}

describe("generation quality gates", () => {
  test("fase Free dan Pro lulus pada batas minimum, gagal di bawah dan di atas batas", () => {
    assert.deepEqual(validateFeatureDraft(Array.from({ length: 4 }, (_, i) => feature(i)), "free"), []);
    assert.deepEqual(validateFeatureDraft(Array.from({ length: 10 }, (_, i) => feature(i)), "pro"), []);
    for (const [count, tier] of [[3, "free"], [9, "free"], [9, "pro"], [16, "pro"]] as const) {
      assert.ok(validateFeatureDraft(Array.from({ length: count }, (_, i) => feature(i)), tier)
        .some((issue) => issue.includes("perlu")), `${tier}: ${count} fitur harus ditolak`);
    }
  });

  test("kriteria fase ringkas boleh dua; ekstra yang samar dibuang bila aman", () => {
    const phases = Array.from({ length: 4 }, (_, i) => feature(i));
    const criteria = feature(0).selesai_bila as string[];
    phases[0] = { ...phases[0], selesai_bila: criteria.slice(0, 2) };
    assert.deepEqual(validateFeatureDraft(phases, "free"), []);
    phases[0] = { ...phases[0], selesai_bila: criteria.slice(0, 1) };
    assert.ok(validateFeatureDraft(phases, "free").some((issue) => issue.includes("2-8")));
    assert.deepEqual(removeVagueCriteria([
      "A duplicate callback returns HTTP 200 without creating a second receipt.",
      "A failed payment keeps the booking unconfirmed and displays the reason.",
      "Duplicate callbacks are handled safely.",
    ], 2), [
      "A duplicate callback returns HTTP 200 without creating a second receipt.",
      "A failed payment keeps the booking unconfirmed and displays the reason.",
    ]);
  });

  test("fase kosong, generik, dan duplikat ditolak walau jumlahnya benar", () => {
    const features = Array.from({ length: 4 }, (_, i) => feature(i));
    features[0] = { ...features[0], tujuan: "Berfungsi dengan baik", selesai_bila: ["Done", "Done", "Done"] };
    features[1] = { ...features[1], title: features[0].title };
    const issues = validateFeatureDraft(features, "free");
    assert.ok(issues.some((issue) => issue.includes("tujuan")));
    assert.ok(issues.some((issue) => issue.includes("kriteria")));
    assert.ok(issues.some((issue) => issue.includes("duplikat")));
  });

  test("fase lintas sistem yang terlalu sempit tidak memaksa padding Pro", () => {
    const phases = Array.from({ length: 10 }, (_, i) => feature(i));
    phases[4] = { ...phases[4], title: "Timezone Handling" };
    phases[5] = { ...phases[5], title: "Role Enforcement" };
    phases[6] = { ...phases[6], title: "Double-booking Prevention" };
    const issues = validateFeatureDraft(phases, "pro", "Booking app with server-side roles and no overlapping slots.");
    assert.equal(issues.filter((issue) => issue.includes("terlalu sempit")).length, 3);
  });

  test("alur admin eksplisit tidak boleh hilang dari kerangka Free", () => {
    const phases = Array.from({ length: 4 }, (_, i) => feature(i));
    const brief = "Customers book courts. Administrators review owner onboarding and moderate venue listings.";
    assert.ok(validateFeatureDraft(phases, "free", brief).some((issue) => issue.includes("administrator")));
    phases[3] = { ...phases[3], title: "Administrator moderation", description: "Admin reviews owner onboarding and moderates venue listings." };
    assert.deepEqual(validateFeatureDraft(phases, "free", brief), []);
  });

  test("subfitur per fase harus dalam rentang dan punya tujuan serta kriteria konkret", () => {
    const parent = feature(1);
    assert.deepEqual(validateSubfeatureDraft(parent, Array.from({ length: 3 }, (_, i) => subfeature(i)), "free"), []);
    assert.deepEqual(validateSubfeatureDraft(parent, Array.from({ length: 12 }, (_, i) => subfeature(i)), "pro"), []);
    assert.ok(validateSubfeatureDraft(parent, Array.from({ length: 2 }, (_, i) => subfeature(i)), "free")
      .some((issue) => issue.includes("3-5")));
    assert.ok(validateSubfeatureDraft(parent, Array.from({ length: 21 }, (_, i) => subfeature(i)), "pro")
      .some((issue) => issue.includes("12-20")));

    const weak = Array.from({ length: 3 }, (_, i) => subfeature(i));
    weak[0] = { title: parent.title, tujuan: "Implementasi fitur", selesai_bila: ["Done", "Integrasi antar modul berhasil"] };
    weak[1] = { ...weak[1], title: weak[2].title };
    const issues = validateSubfeatureDraft(parent, weak, "free");
    assert.ok(issues.some((issue) => issue.includes("lebih spesifik")));
    assert.ok(issues.some((issue) => issue.includes("tujuan")));
    assert.ok(issues.some((issue) => issue.includes("duplikat")));
    const prematureQa = [subfeature(0), subfeature(1), { ...subfeature(2), title: "QA & Integrasi" }];
    assert.ok(validateSubfeatureDraft(parent, prematureQa, "free").some((issue) => issue.includes("ditambahkan oleh sistem")));
  });

  test("subfitur filler bahasa Indonesia dan scope yang dikecualikan ditolak", () => {
    const parent = { title: "Manajemen booking" };
    const subs = [
      { ...subfeature(0), title: "Dokumentasi booking" },
      { ...subfeature(1), title: "Ulasan venue" },
      subfeature(2),
    ];
    const issues = validateSubfeatureDraft(parent, subs, "free", {
      brief: "Users can book courts. Do not add marketplace reviews.",
    });
    assert.ok(issues.some((issue) => issue.includes("Dokumentasi")));
    assert.ok(issues.some((issue) => issue.includes("Ulasan")));
    assert.deepEqual(validateSubfeatureDraft(parent, [{ ...subfeature(0), title: "Analitik booking" }, subfeature(1), subfeature(2)], "free", {
      brief: "Owners need booking analytics and revenue reports.",
    }), []);
    assert.deepEqual(validateSubfeatureDraft(parent, [
      { ...subfeature(0), title: "Owner Maintenance Block Collision Protection" },
      { ...subfeature(1), title: "Concurrent Collision Handling and Rejection Feedback" },
      subfeature(2),
    ], "free", { brief: "Owners can block courts for maintenance. Prevent double-booking during checkout." }), []);
  });

  test("fase Pro menolak tugas teknis yang menyamar sebagai subfitur dan judul sinonim", () => {
    const parent = { title: "Payment Gateway Orchestration" };
    const subs = Array.from({ length: 12 }, (_, i) => subfeature(i));
    subs[0] = { ...subs[0], title: "Payment Gateway Documentation" };
    subs[1] = { ...subs[1], title: "Payment Gateway Testing" };
    subs[2] = { ...subs[2], title: "Initiate Database Lock for Timeslot" };
    subs[3] = { ...subs[3], title: "Password Reset" };
    subs[4] = { ...subs[4], title: "Secure Password Reset" };
    const issues = validateSubfeatureDraft(parent, subs, "pro", { brief: "Court bookings require payment callback verification." });
    assert.ok(issues.some((issue) => issue.includes("Payment Gateway Documentation")));
    assert.ok(issues.some((issue) => issue.includes("Payment Gateway Testing")));
    assert.ok(issues.some((issue) => issue.includes("Initiate Database Lock")));
    assert.ok(issues.some((issue) => issue.includes("duplikat")));
  });

  test("Pro menolak subfitur pengisi dan janji browser-close yang tidak andal", () => {
    const subs = Array.from({ length: 12 }, (_, i) => subfeature(i));
    subs[0] = { ...subs[0], title: "Staff Onboarding Tutorial" };
    subs[1] = { ...subs[1], title: "Analytics Data Help and Support" };
    subs[2] = { ...subs[2], title: "Timeslot Hold Release on Browser Close" };
    subs[3] = { ...subs[3], title: "Responsive Layout" };
    const issues = validateSubfeatureDraft({ title: "Staff and Checkout Operations" }, subs, "pro", {
      brief: "Staff check in arrivals. Customers pay through a checkout hold.",
    });
    for (const title of subs.slice(0, 4).map((sub) => sub.title)) {
      assert.ok(issues.some((issue) => issue.includes(title as string)), title as string);
    }
  });

  test("kriteria selesai menolak klaim kosong yang tidak bisa diuji", () => {
    const parent = feature(1);
    const subs = Array.from({ length: 3 }, (_, i) => subfeature(i));
    subs[0] = {
      ...subs[0],
      selesai_bila: ["Duplicate callbacks are handled safely.", "Notifications are sent in a timely manner."],
    };
    const issues = validateSubfeatureDraft(parent, subs, "free");
    assert.equal(issues.filter((issue) => issue.includes("terlalu umum")).length, 2);
    subs[0].selesai_bila = [
      "A duplicate provider event ID returns HTTP 200 without creating a second receipt.",
      "When email delivery fails, the in-app notification remains visible to the recipient.",
    ];
    assert.deepEqual(validateSubfeatureDraft(parent, subs, "free"), []);
  });

  test("fase terakhir dapat menyisihkan satu subfitur dan empat task untuk QA", () => {
    const parent = feature(1);
    const proSubs = Array.from({ length: 11 }, (_, i) => subfeature(i));
    assert.deepEqual(validateSubfeatureDraft(parent, proSubs, "pro", { reservedQa: true }), []);
    assert.ok(validateSubfeatureDraft(parent, proSubs, "pro").some((issue) => issue.includes("12-20")));
    assert.ok(validateSubfeatureDraft(parent, Array.from({ length: 20 }, (_, i) => subfeature(i)), "pro", { reservedQa: true })
      .some((issue) => issue.includes("11-19")));

    const freeSubTitles = ["Validasi akun 0", "Validasi akun 1"];
    assert.deepEqual(validateTaskDraft(tasks(4, freeSubTitles), freeSubTitles, "free", { reservedQa: true }), []);
    assert.ok(validateTaskDraft(tasks(4, freeSubTitles), freeSubTitles, "free")
      .some((issue) => issue.includes("8-12")));
  });

  test("task Pro lolos jika setiap subfitur tercakup dan dependency membentuk DAG", () => {
    const subTitles = Array.from({ length: 12 }, (_, i) => `Validasi akun ${i}`);
    assert.deepEqual(validateTaskDraft(tasks(15, subTitles), subTitles, "pro"), []);
    assert.ok(validateTaskDraft(tasks(14, subTitles), subTitles, "pro")
      .some((issue) => issue.includes("15-25")));
  });

  test("task hilang, duplikat, dependency asing dan siklus dilaporkan", () => {
    const subTitles = ["Validasi akun 0", "Validasi akun 1", "Validasi akun 2"];
    const draft = tasks(8, subTitles);
    draft[0] = { ...draft[0], sub_feature: "Fitur lain", deps: ["t8"] };
    draft[1] = { ...draft[1], id: "t1", title: draft[0].title, deps: ["t99"] };
    draft[2] = { ...draft[2], sub_feature: "Fitur lain", deps: ["t3"] };
    draft[5] = { ...draft[5], sub_feature: "Fitur lain" };
    const issues = validateTaskDraft(draft, subTitles, "free");
    assert.ok(issues.some((issue) => issue.includes("belum memiliki task")));
    assert.ok(issues.some((issue) => issue.includes("judul task duplikat")));
    assert.ok(issues.some((issue) => issue.includes("ID t1 duplikat")));
    assert.ok(issues.some((issue) => issue.includes("t99 tidak ditemukan")));
    assert.ok(issues.some((issue) => issue.includes("dirinya sendiri")));
    assert.ok(issues.some((issue) => issue.includes("siklus")));
  });

  test("hasil akhir perlu batas penuh dan task pada setiap subfitur", () => {
    const free = finalPlan("free", 4, 3, 8);
    const pro = finalPlan("pro", 10, 12, 15);
    assert.deepEqual(validateFinalPlan(free), []);
    assert.deepEqual(validateFinalPlan(pro), []);

    free.features[0].subFeatures[1].tasks = [];
    free.features[1].subFeatures.pop();
    assert.ok(validateFinalPlan(free).some((issue) => issue.includes("belum memiliki task")));
    assert.ok(validateFinalPlan(free).some((issue) => issue.includes("3-5 subfitur")));
    assert.ok(validateFinalPlan(free).some((issue) => issue.includes("8-12 task")));

    pro.features.pop();
    assert.ok(validateFinalPlan(pro).some((issue) => issue.includes("10-15 fase")));
  });
});
