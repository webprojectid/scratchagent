import type { ClarifyQuestion } from "./generate";

/**
 * Pertanyaan klarifikasi STATIS — template tetap, tidak digenerate LLM.
 * Sama untuk semua brief, biar cepat (instan) dan deterministik.
 * Urutan & isi sengaja generik supaya relevan untuk ide apa pun.
 */
export const CLARIFY_QUESTIONS: ClarifyQuestion[] = [
  {
    question: "Siapa target pengguna utama aplikasi ini?",
    type: "single",
    options: ["Konsumen umum (B2C)", "Bisnis / UMKM (B2B)", "Internal tim / karyawan", "Komunitas spesifik", "Campuran"],
    placeholder: "",
  },
  {
    question: "Apa masalah utama yang ingin diselesaikan aplikasi ini?",
    type: "textarea",
    options: [],
    placeholder: "Contoh: pengguna kesulitan memesan X secara manual, jadi butuh...",
  },
  {
    question: "Fitur inti yang WAJIB ada di versi pertama?",
    type: "textarea",
    options: [],
    placeholder: "Contoh: autentikasi, katalog, pemesanan, pembayaran...",
  },
  {
    question: "Platform mana yang jadi prioritas?",
    type: "multiple",
    options: ["Web", "Mobile Android", "Mobile iOS", "Desktop", "Admin dashboard"],
    placeholder: "",
  },
  {
    question: "Model bisnis / cara menghasilkan uang?",
    type: "single",
    options: ["Gratis", "Langganan (subscription)", "Bayar per transaksi", "Iklan", "Freemium", "Belum tahu"],
    placeholder: "",
  },
  {
    question: "Kapan target rilis versi pertama?",
    type: "single",
    options: ["Secepatnya (MVP)", "< 1 bulan", "1-3 bulan", "3-6 bulan", "Fleksibel"],
    placeholder: "",
  },
];
