import { z } from "zod";

export const physicalDisciplines = ["systems", "mechanical", "electronics", "power", "language", "firmware", "control", "fabrication", "assembly", "calibration", "testing", "companion_software", "documentation"] as const;
export type PhysicalDiscipline = typeof physicalDisciplines[number];
export const choiceSchema = z.object({ mode: z.enum(["auto", "manual", "custom", "none"]), value: z.string().trim().max(300).default("") });
export const physicalCategories = ["controller", "sensors", "actuators", "mechanical", "power", "language", "firmware", "communication", "interface", "companion", "tools", "control", "learning"] as const;
export type PhysicalCategory = typeof physicalCategories[number];
export const physicalDraftSchema = z.object({
  version: z.literal(1), kind: z.enum(["machine", "robot", "electronic_device", "connected_device"]),
  goal: z.enum(["concept", "prototype", "improvement"]),
  foundation: z.record(z.string().max(60), z.string().trim().max(1500)).refine(v => Object.keys(v).length <= 24, "Too many Foundation answers."),
  choices: z.partialRecord(z.enum(physicalCategories), choiceSchema).default({}),
});
export const physicalInputSchema = physicalDraftSchema.superRefine((input, context) => {
  for (const [key, choice] of Object.entries(input.choices)) if (choice && ["manual", "custom"].includes(choice.mode) && !choice.value) context.addIssue({ code: "custom", path: ["choices", key, "value"], message: "Enter your selection or request a recommendation." });
});
export type PhysicalInput = z.infer<typeof physicalInputSchema>;
export const physicalLayer = (value: string): value is PhysicalDiscipline => (physicalDisciplines as readonly string[]).includes(value);
export type Localized = { en: string; id: string };
const copy = (en: string, id: string): Localized => ({ en, id });
export const physicalCategoryCopy: Record<PhysicalCategory, Localized> = {
  controller: copy("Controller & compute", "Kontroler & komputasi"), sensors: copy("Sensors", "Sensor"), actuators: copy("Actuators", "Penggerak"),
  mechanical: copy("Mechanics & materials", "Mekanik & material"), power: copy("Power", "Daya"), language: copy("Programming language", "Bahasa pemrograman"), firmware: copy("Framework, runtime & toolchain", "Framework, runtime & toolchain"),
  communication: copy("Communication", "Komunikasi"), interface: copy("Buttons, indicators & display", "Tombol, indikator & layar"),
  companion: copy("Companion application", "Aplikasi pendamping"), tools: copy("Design & test tools", "Tools desain & pengujian"),
  control: copy("Control approach", "Pendekatan kontrol"), learning: copy("AI & robot learning", "AI & pembelajaran robot"),
};
export const physicalQuestions: { key: string; title: Localized; hint: Localized; kinds?: PhysicalInput["kind"][] }[] = [
  { key: "users", title: copy("Who will use it?", "Siapa yang memakai alat ini?"), hint: copy("Include people working near the device.", "Termasuk orang yang bekerja di dekat alat.") },
  { key: "environment", title: copy("Where will it operate?", "Di lingkungan apa alat digunakan?"), hint: copy("Indoor or outdoor, surfaces, moisture, dust, temperature.", "Dalam/luar ruangan, permukaan, kelembapan, debu, suhu.") },
  { key: "outcome", title: copy("What counts as success?", "Hasil seperti apa yang dianggap berhasil?"), hint: copy("Describe the result and any known capacity, accuracy, speed, dimensions or payload. Include units.", "Jelaskan hasil, kapasitas, akurasi, kecepatan, ukuran, atau beban yang diketahui. Sertakan satuannya.") },
  { key: "operation", title: copy("How should it work?", "Bagaimana cara kerjanya?"), hint: copy("Manual, automatic, or both; operating duration and response to interruptions.", "Manual, otomatis, atau keduanya; lama operasi dan respons saat terjadi gangguan.") },
  { key: "power", title: copy("What power is available?", "Sumber daya apa yang tersedia?"), hint: copy("Battery or external supply; any known runtime and charging constraints.", "Baterai atau sumber eksternal; batas waktu operasi dan pengisian yang diketahui.") },
  { key: "budget", title: copy("Budget and timeline", "Anggaran dan waktu"), hint: copy("Include currency, target date and whether tools/fabrication are included. Leave unknowns blank.", "Sertakan mata uang, target waktu, serta apakah tools/fabrikasi termasuk. Kosongkan yang belum diketahui.") },
  { key: "existing", title: copy("Existing parts and tools", "Komponen dan tools yang tersedia"), hint: copy("Model/revision, existing designs, workshop access and who will assemble and test it.", "Model/revisi, desain existing, akses bengkel, dan siapa yang merakit serta menguji.") },
  { key: "exclusions", title: copy("Limits and exclusions", "Batasan dan larangan"), hint: copy("What must it never do? What is outside this project?", "Apa yang tidak boleh dilakukan? Apa yang di luar cakupan proyek?") },
  { key: "motion", kinds: ["robot"], title: copy("Movement and workspace", "Gerakan dan area kerja"), hint: copy("Wheels or joints, reach, payload, obstacles, positioning and interaction with people.", "Roda atau sendi, jangkauan, beban, rintangan, posisi, dan interaksi dengan manusia.") },
  { key: "process", kinds: ["machine"], title: copy("Material and process", "Bahan dan proses"), hint: copy("Inputs, outputs, sequence, capacity and loading/unloading. Mention fluids or pressure if relevant.", "Masukan, keluaran, urutan, kapasitas, dan pemasukan/pengeluaran bahan. Sebutkan fluida/tekanan jika relevan.") },
  { key: "measurement", kinds: ["electronic_device"], title: copy("Measurement and local interface", "Pengukuran dan antarmuka lokal"), hint: copy("What is measured, range, calibration, display and storage if needed.", "Apa yang diukur, rentang, kalibrasi, layar, dan penyimpanan bila diperlukan.") },
  { key: "connectivity", title: copy("Connectivity and companion software", "Koneksi dan aplikasi pendamping"), hint: copy("Offline is fine. If connected: permissions, remote commands and behavior without a connection.", "Offline boleh. Jika terhubung: izin, perintah jarak jauh, dan perilaku saat koneksi putus.") },
  { key: "intelligence", title: copy("Control, perception or learning?", "Kontrol, persepsi, atau pembelajaran?"), hint: copy("A fixed sequence may be enough. If using cameras or learning: task, recordings, available examples and local/cloud constraints.", "Urutan tetap mungkin cukup. Jika memakai kamera/pembelajaran: tugas, rekaman, contoh data, dan batas lokal/cloud.") },
];

export function physicalSource(brief: string, input: PhysicalInput): string {
  return [brief, `Kind: ${input.kind}; goal: ${input.goal}`, ...Object.entries(input.foundation).filter(([key]) => { const question = physicalQuestions.find(q => q.key === key); return !question?.kinds || question.kinds.includes(input.kind); }).map(([key, value]) => `${key}: ${value}`), ...Object.entries(input.choices).map(([key, value]) => `${key}: ${value?.mode} ${value?.value ?? ""}`)].join("\n\n");
}
export const physicalDefaults = (): PhysicalInput => ({ version: 1, kind: "robot", goal: "prototype", foundation: {}, choices: {} });

export const hardwareSections = {
  overview: copy("Product overview", "Gambaran produk"), operation: copy("Operating concept", "Konsep operasi"), architecture: copy("System architecture", "Arsitektur sistem"),
  mechanical: copy("Mechanical design", "Desain mekanik"), electronics: copy("Electronics & power", "Elektronik & daya"), control: copy("Firmware & control", "Firmware & kontrol"),
  interfaces: copy("Interfaces & calibration", "Antarmuka & kalibrasi"), resources: copy("Engineering checks & resource budgets", "Analisis engineering & anggaran sumber daya"),
  failure: copy("Risks & failure handling", "Risiko & penanganan kegagalan"), assembly: copy("Assembly & commissioning", "Perakitan & commissioning"),
  verification: copy("Verification & validation", "Verifikasi & validasi"), maintenance: copy("Maintenance", "Perawatan"),
  learning: copy("AI, data & evaluation", "AI, data & evaluasi"), simulation: copy("Simulation plan", "Rencana simulasi"), companion: copy("Companion software", "Software pendamping"),
} satisfies Record<string, Localized>;
export type HardwareSection = keyof typeof hardwareSections;
const text = z.string().trim().min(1).max(5000);
export const hardwareRequirementSchema = z.object({ id: z.string().regex(/^R\d{2,3}$/), statement: text, sourceQuote: text, verification: text, openDecisions: z.array(text).max(12).default([]) });
export const hardwareFoundationSchema = z.object({ title: z.string().min(3).max(120), requirements: z.array(hardwareRequirementSchema).min(1).max(35), assumptions: z.array(text).max(20), openDecisions: z.array(text).max(30) });
export const hardwareEngineeringSchema = z.object({
  sections: z.array(z.object({ id: z.enum(Object.keys(hardwareSections) as [HardwareSection, ...HardwareSection[]]), applicability: z.enum(["required", "not_applicable"]), content: text })).min(10).max(15),
  components: z.array(z.object({ id: z.string().regex(/^C\d{2,3}$/), role: text, specification: text, candidate: text, quantity: z.number().int().min(1).max(10000).nullable(), unitPrice: z.number().min(0).max(1e9).nullable(), currency: z.string().max(12).nullable(), source: z.string().max(1000), checkedAt: z.string().max(30).nullable(), status: z.literal("unverified"), requirementIds: z.array(z.string()).min(1).max(12) })).max(50),
});
export type HardwareFoundation = z.infer<typeof hardwareFoundationSchema>;
export type HardwareEngineering = z.infer<typeof hardwareEngineeringSchema>;
export type HardwareSpec = HardwareFoundation & HardwareEngineering;
export type PhysicalPlan = { version: 1; revision: number; input: PhysicalInput; spec?: HardwareSpec };
export type HardwareEvidence = { id: string; kind: "digital" | "physical"; outcome: "pass" | "fail" | "inconclusive"; report: string; actor: string; actorType: "human" | "agent"; revision: number; createdAt: string };
export type HardwareTask = {
  discipline: PhysicalDiscipline; executor: "ai" | "human" | "hybrid"; tools: string[]; inputs: string[];
  evidenceKind: "digital" | "physical"; evidence: HardwareEvidence[]; reviewRequired: boolean;
  review?: { actor: string; revision: number; createdAt: string }; revision: number;
  waitReason?: "parts" | "human" | "review" | "tool"; invalidated?: boolean;
};
