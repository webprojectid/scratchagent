import type { ProjectIconName } from "./project-identity";
import { stockIconNames, type StockIconName } from "./stock-icon-catalog";

export const projectStockIcons = {
  BallFootball: "ball-football",
  Activity: "activity", BookOpen: "book", Boxes: "package", BrainCircuit: "brain", Building2: "building",
  CalendarDays: "calendar", Camera: "camera", ChartColumn: "chart-bar", ChartNoAxesCombined: "chart-line",
  Clapperboard: "movie", CodeXml: "code", Coffee: "coffee", Compass: "world", CookingPot: "tools-kitchen-2",
  Database: "database", Dumbbell: "barbell", Feather: "feather", Fingerprint: "fingerprint", Flag: "flag",
  Flower2: "flower", Focus: "focus", GraduationCap: "school", Handshake: "heart-handshake",
  HeartPulse: "heartbeat", House: "home", KanbanSquare: "layout-kanban", KeyRound: "key", Leaf: "leaf",
  ListTodo: "list-check", LockKeyhole: "lock", Luggage: "luggage", MapPinned: "map-pin",
  Megaphone: "speakerphone", MessagesSquare: "messages", Network: "topology-star-3", NotebookPen: "notebook",
  Orbit: "planet", Package: "package", PackageCheck: "clipboard-check", Palette: "palette", Plane: "plane",
  Puzzle: "puzzle", Radio: "radio", Receipt: "receipt", Route: "route", ScanLine: "scan", Send: "send",
  ShieldCheck: "shield-check", ShoppingCart: "shopping-cart", Sprout: "plant-2", Store: "building-store",
  Scissors: "scissors", Target: "target", Telescope: "telescope", Terminal: "terminal", Truck: "truck",
  UsersRound: "users", Utensils: "tools-kitchen", Wallet: "wallet", WashingMachine: "wash-machine",
  Waypoints: "route-2", Workflow: "sitemap", Wrench: "tool",
} satisfies Record<ProjectIconName, StockIconName>;

const phaseRules: readonly [RegExp, StockIconName][] = [
  [/\b(refund\w*|pengembalian|reimburse\w*)\b/i, "receipt-refund"],
  [/\b(check.?in|arrival\w*|kedatangan|attendance|absensi|no.?show)\b/i, "user-check"],
  [/\b(auth\w*|autentikasi|login|sign.?in|password|sandi|keamanan|security|akses|permissions?|roles?|otorisasi)\b/i, "shield-lock"],
  [/\b(admin\w*|moder\w*|governance|audit\w*|disput\w*|sengketa)\b/i, "shield-check"],
  [/\b(pay\w*|checkout|pembayaran|qris|deposit\w*|tagihan|billing|cashier|kasir|pos)\b/i, "credit-card"],
  [/\b(wallet|dompet|saving\w*|tabungan|setoran|budget\w*|anggaran|finance|keuangan)\b/i, "wallet"],
  [/\b(search\w*|pencarian|filter\w*|discovery|jelajah)\b/i, "search"],
  [/\b(map\w*|lokasi|location\w*|nearby|terdekat|geogra\w*)\b/i, "map-pin"],
  [/\b(cancel\w*|pembatalan)\b/i, "calendar-cancel"],
  [/\b(reschedul\w*|penjadwalan\s+ulang)\b/i, "calendar-time"],
  [/\b(notif\w*|reminder\w*|pengingat|alert\w*|peringatan)\b/i, "bell"],
  [/\b(book\w*|reserv\w*|jadwal|schedule\w*|timeslot\w*|availability|ketersediaan)\b/i, "calendar-event"],
  [/\b(report\w*|laporan|riwayat|history|transaction\w*|transaksi|receipt\w*|struk)\b/i, "file-analytics"],
  [/\b(analytic\w*|analitik|statistik|metrics?|revenue|pendapatan|progress|progres)\b/i, "chart-line"],
  [/\b(invent\w*|stok|stock|warehouse|gudang|produk|products?|catalog\w*|katalog)\b/i, "package"],
  [/\b(deliver\w*|logistik|logistic\w*|pengiriman|kurir|shipping)\b/i, "truck"],
  [/\b(cart|basket|keranjang|order\w*|pesanan|shopping|belanja)\b/i, "shopping-cart"],
  [/\b(setting\w*|pengaturan|preferenc\w*|konfigurasi|configuration)\b/i, "settings"],
  [/\b(user\w*|pengguna|profile\w*|profil|account\w*|akun|customer\w*|pelanggan|staff|staf|team|tim)\b/i, "users"],
  [/\b(chat\w*|messag\w*|pesan|komunitas|community|forum)\b/i, "messages"],
  [/\b(email|mail|surat)\b/i, "mail"],
  [/\b(video|film|movie|media)\b/i, "movie"],
  [/\b(photo\w*|foto\w*|gallery|galeri|image\w*|gambar)\b/i, "photo"],
  [/\b(music|musik|audio|podcast)\b/i, "music"],
  [/\b(design|desain|creative|kreatif)\b/i, "palette"],
  [/\b(learn\w*|belajar|education|pendidikan|course\w*|kursus)\b/i, "school"],
  [/\b(health\w*|kesehatan|clinic\w*|klinik|medis)\b/i, "heartbeat"],
  [/\b(target\w*|goal\w*|tujuan|challenge\w*|tantangan)\b/i, "target"],
  [/\b(habit\w*|kebiasaan|routine|rutinitas)\b/i, "plant-2"],
  [/\b(qa|test\w*|pengujian|quality|kualitas)\b/i, "clipboard-check"],
  [/\b(api|integrat\w*|integrasi|webhook\w*|callback\w*)\b/i, "plug"],
  [/\b(database|basis\s+data|schema|skema)\b/i, "database"],
  [/\b(ai|agent\w*|automation|otomasi)\b/i, "brain"],
  [/\b(dashboard|beranda|overview|ringkasan)\b/i, "layout-dashboard"],
];
const available = new Set<string>(stockIconNames);

export function getPhaseIconName(phase: { title: string; icon?: string }): StockIconName {
  const title = phase.title.normalize("NFKD").replace(/\p{M}/gu, "");
  const matched = phaseRules.find(([pattern]) => pattern.test(title));
  if (matched) return matched[1];
  const hint = phase.icon?.trim().toLowerCase();
  if (hint && available.has(hint)) return hint as StockIconName;
  return "sitemap";
}
