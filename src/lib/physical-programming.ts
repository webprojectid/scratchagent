import { hardwareCatalog } from "./physical-catalog";
import type { PhysicalInput } from "./physical-domain";

export function physicalProgrammingNotes(input: PhysicalInput, language: "en" | "id"): string[] {
  const selected = (key: "language" | "firmware" | "controller") => {
    const choice = input.choices[key];
    return choice && (choice.mode === "manual" || choice.mode === "custom") ? choice.value.trim() : "";
  };
  const programming = selected("language"), firmware = selected("firmware"), controller = selected("controller");
  const entry = hardwareCatalog.find(item => item.category === "firmware" && item.name === firmware);
  const notes: string[] = [];
  const t = (en: string, id: string) => language === "en" ? en : id;
  if (programming && entry?.languages && !entry.languages.includes(programming)) notes.push(t(
    `${firmware} lists ${entry.languages.join(" / ")} as its application languages. Verify a supported binding or choose another runtime for ${programming}. Your selection has been kept.`,
    `${firmware} mencantumkan ${entry.languages.join(" / ")} sebagai bahasa aplikasi. Periksa binding yang didukung atau pilih runtime lain untuk ${programming}. Pilihanmu tetap disimpan.`));
  const family = /esp32/i.test(controller) ? "esp32" : /\bpico\b|\brp20[045]0\b|\brp2350\b/i.test(controller) ? "pico" : /stm32/i.test(controller) ? "stm32" : /\bplc\b|\bopta\b/i.test(controller) ? "plc" : undefined;
  if (family && entry?.controllerFamily && family !== entry.controllerFamily) notes.push(t(
    `${firmware} targets a different controller family from ${controller}. Confirm a supported port or use it on a separate controller; compatibility has not been established.`,
    `${firmware} menargetkan keluarga kontroler yang berbeda dari ${controller}. Pastikan port tersedia atau gunakan pada kontroler terpisah; kompatibilitas belum dipastikan.`));
  if (input.choices.language?.mode === "none" && firmware) notes.push(t("A framework is selected while programming is marked as not needed. Clarify whether it is for existing firmware or change one of these choices.", "Framework dipilih tetapi pemrograman ditandai tidak diperlukan. Jelaskan apakah framework digunakan untuk firmware yang sudah ada atau ubah salah satu pilihan."));
  if (input.choices.firmware?.mode === "none" && programming) notes.push(t("Specify the compiler, runtime or bare-metal build tools for your language under Custom, or document why no framework is needed.", "Tentukan compiler, runtime, atau build tools bare-metal di Custom, atau jelaskan mengapa framework tidak diperlukan."));
  if ((programming && !hardwareCatalog.some(item => item.category === "language" && item.name === programming)) || (firmware && !entry)) notes.push(t("Custom language or toolchain: board support, bindings and build tools need verification. Your custom value will be passed to the plan unchanged.", "Bahasa atau toolchain custom: dukungan board, binding, dan build tools perlu diverifikasi. Nilai custom diteruskan ke plan tanpa diubah."));
  return notes;
}
