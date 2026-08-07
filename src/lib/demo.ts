import type { Plan } from "./types";

const t = (
  ref: string,
  title: string,
  layer: "frontend" | "backend" | "qa" = "frontend",
  phase = 1,
  deps: string[] = [],
): Plan["features"][0]["subFeatures"][0]["tasks"][0] => ({
  ref,
  title,
  layer,
  phase,
  page: null,
  deps,
  status: "pending",
  retryCount: 0,
  lastFailReason: null,
  failReason: null,
  startedAt: null,
  completedAt: null,
});

export const demoPlan: Plan = {
  id: "demo",
  title: "Kedai Senja",
  brief: "Platform pemesanan dan operasional kedai kopi.",
  stack: ["Next.js", "PostgreSQL", "Railway"],
  asumsi: [
    "Pelanggan memesan tanpa instalasi aplikasi.",
    "Satu akun dapat mengelola satu atau lebih cabang.",
    "Pembayaran awal via tunai dan QRIS statis.",
  ],
  status: "ready",
  features: [
    {
      slug: "pemesanan",
      title: "Pemesanan",
      icon: "ShoppingBag",
      description: "Alur pemesanan menu yang cepat dan jelas.",
      tujuan: "Mengurangi antrean dan kesalahan pesanan.",
      selesaiBila: ["Pelanggan dapat memilih menu", "Total dan status pesanan terlihat", "Pesanan masuk ke dapur otomatis"],
      status: "berjalan",
      subFeatures: [
        {
          title: "Katalog menu",
          tasks: [
            t("F01-S01-T01", "Buat halaman katalog dengan data tiruan"),
            t("F01-S01-T02", "Tambahkan pencarian dan filter menu", "frontend", 1, ["F01-S01-T01"]),
            t("F01-S01-T03", "Integrasikan API katalog", "backend", 2, ["F01-S01-T01"]),
          ],
        },
        {
          title: "Keranjang",
          tasks: [
            t("F01-S02-T01", "Buat panel keranjang", "frontend", 1, ["F01-S01-T01"]),
            t("F01-S02-T02", "Validasi jumlah dan stok", "backend", 2, ["F01-S02-T01"]),
          ],
        },
      ],
    },
    {
      slug: "operasional",
      title: "Operasional",
      icon: "Gauge",
      description: "Pantau pesanan masuk dan proses dapur.",
      tujuan: "Membuat kerja barista terukur.",
      selesaiBila: ["Pesanan baru muncul otomatis", "Status dapat diperbarui"],
      status: "direncanakan",
      subFeatures: [
        {
          title: "Antrian dapur",
          tasks: [
            t("F02-S01-T01", "Buat papan antrian dengan data tiruan", "frontend", 1),
            t("F02-S01-T02", "Integrasikan perubahan status", "backend", 2, ["F02-S01-T01"]),
          ],
        },
      ],
    },
    {
      slug: "laporan",
      title: "Laporan",
      icon: "ChartNoAxesCombined",
      description: "Ringkasan penjualan dan produk populer.",
      tujuan: "Mendukung keputusan operasional.",
      selesaiBila: ["Pemilik melihat omzet harian", "Laporan dapat difilter"],
      status: "direncanakan",
      subFeatures: [
        {
          title: "Ringkasan",
          tasks: [
            t("F03-S01-T01", "Buat kartu metrik penjualan", "frontend", 1),
            t("F03-S01-T02", "Tambahkan agregasi transaksi", "backend", 2, ["F03-S01-T01"]),
            t("F03-S01-T03", "Jalankan verifikasi alur utama", "qa", 3, ["F03-S01-T01", "F03-S01-T02"]),
          ],
        },
      ],
    },
  ],
};
