const categories = [
  { key: "habit", words: /\b(habit\w*|kebiasaan|routine|rutinitas|mindful\w*|meditasi)\b/, icons: ["Sprout", "Leaf", "Flower2"] },
  { key: "health", words: /\b(health\w*|sehat|kesehatan|clinic\w*|klinik|medical|medis|fitness|gym|workout|olahraga)\b/, icons: ["HeartPulse", "Activity", "Dumbbell"] },
  { key: "finance", words: /\b(finance|finansial|keuangan|budget\w*|anggaran|invoice\w*|akuntansi|accounting|payment\w*|pembayaran|wallet|dompet|bank\w*)\b/, icons: ["Wallet", "Receipt", "ChartNoAxesCombined"] },
  { key: "education", words: /\b(learn\w*|belajar|education|edukasi|pendidikan|school|sekolah|course\w*|kursus|tutor\w*|quiz|kuis)\b/, icons: ["BookOpen", "GraduationCap", "NotebookPen"] },
  { key: "travel", words: /\b(travel\w*|wisata|trip|liburan|hotel\w*|booking|reservasi|tour\w*)\b/, icons: ["Plane", "MapPinned", "Luggage"] },
  { key: "food", words: /\b(food|makanan|kuliner|restaurant|restoran|resep|recipe\w*|katering|catering|cafe|coffee|kopi)\b/, icons: ["Utensils", "CookingPot", "Coffee"] },
  { key: "commerce", words: /\b(toko\w*|store|shop\w*|marketplace|commerce|retail|kasir|jualan|pos)\b/, icons: ["ShoppingCart", "Store", "Package"] },
  { key: "services", words: /\b(laundry\w*|laundri|cuci\w*|cleaning|kebersihan|salon|barber\w*|bengkel|repair|servis|jasa)\b/, icons: ["WashingMachine", "Scissors", "Wrench"] },
  { key: "logistics", words: /\b(logistic\w*|logistik|delivery|pengiriman|kurir|cargo|kargo|warehouse|gudang|inventory|inventori|stok)\b/, icons: ["Truck", "Boxes", "PackageCheck"] },
  { key: "property", words: /\b(property|properti|estate|rumah|housing|hunian|kost|kos|apartment|apartemen|rental|sewa)\b/, icons: ["House", "Building2", "KeyRound"] },
  { key: "security", words: /\b(security|keamanan|password|sandi|auth\w*|privasi|privacy|cyber\w*)\b/, icons: ["ShieldCheck", "LockKeyhole", "Fingerprint"] },
  { key: "social", words: /\b(social|sosial|community|komunitas|chat\w*|messag\w*|pesan|forum|team|tim|kolaborasi|collaborat\w*)\b/, icons: ["MessagesSquare", "UsersRound", "Handshake"] },
  { key: "creative", words: /\b(design|desain|creative|kreatif|portfolio|portofolio|foto\w*|photo\w*|video|music|musik|audio|content|konten)\b/, icons: ["Palette", "Camera", "Clapperboard"] },
  { key: "marketing", words: /\b(marketing|kampanye|campaign|crm|sales|penjualan|iklan|advertis\w*|newsletter)\b/, icons: ["Megaphone", "Target", "Send"] },
  { key: "productivity", words: /\b(task\w*|tugas|project|proyek|productivity|produktivitas|todo|planner|planning|manajemen|management|schedule|jadwal|notion|freelance\w*)\b/, icons: ["ListTodo", "KanbanSquare", "CalendarDays"] },
  { key: "developer", words: /\b(developer|coding|code|kode|api|devops|deploy\w*|terminal|cli|github|agent\w*|automation|otomasi)\b/, icons: ["CodeXml", "Terminal", "Workflow"] },
  { key: "data", words: /\b(data|analytic\w*|analitik|dashboard|laporan|report\w*|survey|survei|ai|machine|intelligence)\b/, icons: ["ChartColumn", "Database", "BrainCircuit"] },
] as const;

const fallbackIcons = ["Compass", "Orbit", "Waypoints", "Route", "Network", "Puzzle", "Feather", "Telescope", "Radio", "Flag", "Focus", "ScanLine"] as const;
export type ProjectIconName = typeof categories[number]["icons"][number] | typeof fallbackIcons[number];
export const projectIdentityTones = ["green", "blue", "violet", "amber", "teal", "rose"] as const;

function identityHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

export function getProjectIdentity(project: { id: string; title: string }) {
  const title = project.title.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
  const category = categories.find(item => item.words.test(title));
  const icons: readonly ProjectIconName[] = category?.icons ?? fallbackIcons;
  // Separate seeds keep icon and color choices independent and identical across surfaces.
  const seed = project.id.trim() || title || "untitled";
  return {
    category: category?.key ?? "general",
    icon: icons[identityHash(`icon:${seed}`) % icons.length],
    tone: projectIdentityTones[identityHash(`tone:${seed}`) % projectIdentityTones.length],
  };
}
