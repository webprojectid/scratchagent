export const QA_COPY = {
  id: {
    subFeature: "QA & Integrasi",
    tasks: [
      "Jalankan aplikasi end-to-end",
      "Uji setiap alur utama terhadap selesai bila",
      "Perbaiki bug yang ditemukan",
      "Bersihkan sisa stub dan console.log",
    ],
    capacityWarning: "QA & Integrasi belum lengkap karena struktur plan tidak memiliki ruang dalam batas paket. Perbaiki struktur plan sebelum digunakan.",
  },
  en: {
    subFeature: "QA & Integration",
    tasks: [
      "Run the app end to end",
      "Check each core flow against its acceptance criteria",
      "Fix bugs found during testing",
      "Remove leftover stubs and console.log calls",
    ],
    capacityWarning: "QA & Integration is incomplete because this plan has no room within its tier limits. Revise the plan structure before implementation.",
  },
} as const;

export function isAutomaticQaSubFeature(title: string): boolean {
  return title === QA_COPY.id.subFeature || title === QA_COPY.en.subFeature;
}

export function isAutomaticQaTaskTitle(title: string): boolean {
  return QA_COPY.id.tasks.some((item) => item === title) || QA_COPY.en.tasks.some((item) => item === title);
}
