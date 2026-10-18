import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { jsonrepair } from "jsonrepair";
import * as limits from "../src/lib/plan-limits";
import * as quality from "../src/lib/generation-quality";
import * as requirementsQuality from "../src/lib/requirements-quality";
import * as scopeQuality from "../src/lib/scope-quality";
import * as architectureQuality from "../src/lib/architecture-quality";
import * as qaLabels from "../src/lib/qa-labels";
import type { GenerateResult, GenerateTask } from "../src/lib/generate";

type Stage = "outline" | "subfeatures" | "architecture" | "database" | "requirements" | "tasks";
type Call = { model: string; stage: Stage; userPrompt: string };

const description = (index: number) => `Pengguna dapat mengelola bagian ${index} dan melihat perubahan data yang tersimpan.`;
const goal = (index: number) => `Pastikan proses bagian ${index} selesai dengan hasil yang bisa diperiksa pengguna.`;
const criteria = (index: number) => [
  `Pengguna dapat menyimpan perubahan pada bagian ${index} dan melihat hasil terbaru.`,
  `Masukan tidak sah pada bagian ${index} menampilkan alasan tanpa menyimpan data.`,
  `Pengguna dapat membuka kembali bagian ${index} dengan data yang sama.`,
];

const architectureFixture = `Pemilik akun membuka ruang kerja dan memilih bagian yang ingin diubah.
Antarmuka mengirim perubahan ke API bersama identitas ruang kerja dan versi bagian terakhir
yang dilihat. API memeriksa sesi serta kepemilikan ruang kerja sebelum membaca atau menulis
bagian tersebut. Penyimpanan memakai transaksi singkat: perubahan diterima hanya jika versi
yang dikirim masih berlaku, lalu versi baru dikembalikan untuk ditampilkan kepada pengguna.

Jika versi sudah berubah, API mengembalikan isi terbaru agar pengguna dapat meninjau ulang
masukannya tanpa menimpa pekerjaan yang tersimpan. Saat ruang kerja dibuka kembali, API
mengambil bagian dan versi terakhir dari database sehingga daftar bagian mencerminkan hasil
simpan yang sama. Alur ini memberi batas jelas antara tampilan, pemeriksaan akun, dan data.

\`\`\`mermaid
flowchart TD
  A[Pemilik akun] --> B[Bagian ruang kerja]
  B --> C[API perubahan bagian]
  C --> D[Periksa sesi dan pemilik]
  D --> E[(Ruang kerja dan bagian)]
  E --> B
\`\`\``;

const databaseFixture = `Tabel accounts menyimpan id UUID PRIMARY KEY dan email TEXT UNIQUE untuk
identitas pemilik. Tabel workspaces menyimpan id UUID PRIMARY KEY, owner_id UUID REFERENCES
accounts(id), dan name TEXT NOT NULL. Index workspaces(owner_id) mendukung daftar ruang kerja
yang dapat dibuka kembali oleh pemilik akun.

Tabel workspace_sections menyimpan id UUID PRIMARY KEY, workspace_id UUID REFERENCES
workspaces(id), title TEXT NOT NULL, content TEXT NOT NULL, dan version INTEGER NOT NULL.
UNIQUE (workspace_id, title) mencegah dua bagian dengan nama sama dalam satu ruang kerja.
UPDATE workspace_sections mengubah content dan menaikkan version hanya WHERE id serta version
lama cocok; jumlah baris yang berubah menentukan apakah API menerima perubahan atau meminta
pengguna memuat bagian terbaru. Foreign key menjaga agar bagian selalu milik ruang kerja sah.

\`\`\`mermaid
erDiagram
  accounts ||--o{ workspaces : owns
  workspaces ||--o{ workspace_sections : contains
\`\`\``;

function stageOf(systemPrompt: string): Stage {
  if (systemPrompt.includes("senior product manager")) return "outline";
  if (systemPrompt.includes("product architect")) return "subfeatures";
  if (systemPrompt.includes("solution architect")) return "architecture";
  if (systemPrompt.includes("database architect")) return "database";
  if (systemPrompt.includes("technical lead")) return "tasks";
  return "requirements";
}

function fixture(tier: "free" | "pro", underfillFirstPhase = false, architecture = architectureFixture) {
  const calls: Call[] = [];
  const featureCount = limits.structureLimits(tier).features[0];
  const goodFeatures = Array.from({ length: featureCount }, (_, index) => ({
    title: `Kelola ruang kerja ${index + 1}`,
    icon: "",
    description: description(index),
    tujuan: goal(index),
    selesai_bila: criteria(index),
    priority: "high",
  }));

  function responseFor(call: Call) {
    switch (call.stage) {
      case "outline":
        return {
          title: "RuangKerja",
          assumptions: [],
          stack: ["Next.js", "PostgreSQL"],
          features: call.model === "mistral"
            ? goodFeatures.slice(0, tier === "pro" ? featureCount - 1 : featureCount)
              .map((feature) => ({ ...feature, tujuan: "Berfungsi dengan baik", selesai_bila: ["Done", "Done", "Done"] }))
            : goodFeatures,
        };
      case "subfeatures": {
        const supplement = call.userPrompt.match(/Complete ONLY phase ("(?:\\.|[^"])*") with exactly (\d+) NEW/);
        if (supplement) {
          const title = JSON.parse(supplement[1]) as string;
          const missing = Number(supplement[2]);
          return { features: [{ title, sub_features: Array.from({ length: missing }, (_, index) => ({
            title: `${title} tambahan ${index + 1}`,
            tujuan: `Pastikan tambahan ${index + 1} pada ${title} menyimpan hasil dengan benar.`,
            selesai_bila: [
              `Pengguna dapat menyimpan tambahan ${index + 1} dan melihat hasil terbaru.`,
              `Masukan salah pada tambahan ${index + 1} tidak mengubah data tersimpan.`,
            ],
          })) }] };
        }
        const match = call.userPrompt.match(/Generate sub-features ONLY for these phases: (\[[\s\S]*?\])\. Keep each feature title/);
        assert.ok(match, "prompt subfitur memuat daftar fase yang diminta");
        const requested = JSON.parse(match[1]) as { title: string; subfeatureRange: [number, number] }[];
        return { features: requested.map((feature) => ({
          title: feature.title,
          sub_features: Array.from({ length: feature.subfeatureRange[0] - (underfillFirstPhase && feature.title === goodFeatures[0].title ? 2 : 0) }, (_, index) => ({
            title: `${feature.title} langkah ${index + 1}`,
            tujuan: `Pastikan langkah ${index + 1} pada ${feature.title} menyimpan hasil dengan benar.`,
            selesai_bila: [
              `Pengguna dapat menyimpan langkah ${index + 1} dan melihat hasil terbaru.`,
              `Masukan salah pada langkah ${index + 1} tidak mengubah data tersimpan.`,
            ],
          })),
        })) };
      }
      case "architecture":
        return { architecture };
      case "database":
        return { database_schema: databaseFixture };
      case "requirements":
        return {
          user_flow: [{ title: "Buat ruang kerja", steps: ["Pemilik akun mengisi nama ruang kerja yang ingin dibuat.", "Sistem menyimpan ruang kerja dan menampilkan nama barunya."] }, { title: "Gagal simpan", steps: ["Pemilik akun mengirim nama ruang kerja yang tidak valid.", "Sistem menolak perubahan dan menjelaskan kesalahan input."] }],
          requirements: {
            fungsional: Array.from({ length: 6 }, (_, i) => `Pemilik akun dapat menyimpan perubahan bagian ${i} dan membaca hasilnya.`),
            non_fungsional: Array.from({ length: 4 }, (_, i) => `Sistem mencatat penolakan perubahan bagian ${i} pada audit log akun.`),
          },
          tech_stack: [{ name: "PostgreSQL", desc: "Menyimpan relasi akun dan ruang kerja." }],
        };
      case "tasks": {
        const contextMatch = call.userPrompt.match(/Product context: (\{[^\n]+\})/);
        assert.ok(contextMatch, "prompt task memuat konteks fitur");
        const context = JSON.parse(contextMatch[1]) as { subFeatures: { title: string }[] };
        const subTitles = context.subFeatures.map((sub) => sub.title);
        const fullCount = Math.max(subTitles.length, limits.structureLimits(tier).tasks[0] - 4);
        const count = call.model === "mistral" && tier === "free" ? fullCount - 1 : fullCount;
        return { tasks: Array.from({ length: count }, (_, index) => ({
          id: `t${index + 1}`,
          sub_feature: subTitles[index % subTitles.length],
          title: call.model === "mistral" ? "Buat fitur" : `Bangun validasi langkah ${index + 1} untuk akun pengguna`,
          layer: "backend",
          phase: featureCount,
          page: null,
          deps: index === 0 ? [] : [`t${index}`],
        })) };
      }
    }
  }

  const fixtureModule = { exports: {} as {
    generatePlanStructure: (brief: string, prefs: { mode: "auto" }, answers: unknown, tier: string) => Promise<GenerateResult>;
    generateTasksForFeature: (...args: unknown[]) => Promise<{ tasks: Omit<GenerateTask, "ref">[]; usage: { models: string[] } }>;
  } };
  const output = ts.transpileModule(readFileSync("src/lib/generate.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mocks: Record<string, unknown> = {
    "./provider-network": { publicProviderFetch: async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { model: string; messages: { content: string }[] };
      const call = { model: body.model, stage: stageOf(body.messages[0].content), userPrompt: body.messages[1].content };
      calls.push(call);
      return new Response(JSON.stringify(responseFor(call)), { status: 200, headers: { "content-type": "application/json" } });
    } },
    "./account-preferences": { defaultHandoff: { language: "id" }, legacyHandoff: { language: "id" }, handoffInstructions: () => "" },
    zod: { z },
    jsonrepair: { jsonrepair },
    "./arch-fallback": { applyArchFallback: (_plan: unknown, architecture: string, databaseSchema: string) => ({ architecture, databaseSchema, usedFallback: [] }), extractMermaidLoose: () => null, hasMermaidDiagram: () => true, normalizeMermaidFences: (value: string) => value },
    "./llm-config": { isExhaustedError: () => false, resolveLlmProviders: async () => [
      { baseUrl: "https://mistral.invalid/v1", apiKey: "fixture", models: ["mistral"] },
      { baseUrl: "https://gemini.invalid/v1", apiKey: "fixture", models: ["gemini"] },
    ] },
    "./plan-limits": limits,
    "./generation-quality": quality,
    "./requirements-quality": requirementsQuality,
    "./scope-quality": scopeQuality,
    "./architecture-quality": architectureQuality,
    "./qa-labels": qaLabels,
    "./sse-parser": { parseLLMResponse: async (response: Response) => ({ content: await response.text(), usage: { prompt_tokens: 10, completion_tokens: 20 } }) },
  };
  runInNewContext(output, {
    module: fixtureModule,
    exports: fixtureModule.exports,
    require: (name: string) => {
      if (!(name in mocks)) throw new Error(`Unexpected generation dependency: ${name}`);
      return mocks[name];
    },
    process: { env: {} },
    console: { log() {}, warn() {}, error() {} },
    Response,
    AbortController,
    setTimeout,
    clearTimeout,
    Date,
    Math,
  });
  return { calls, generate: fixtureModule.exports, featureCount };
}

test("Pro supplements a grounded phase instead of regenerating its full subfeature list", async () => {
  const run = fixture("pro", true);
  const brief = `Kelola akun dan ruang kerja. ${"Kebutuhan rinci pengguna dan data tersimpan. ".repeat(60)}`;
  const plan = await run.generate.generatePlanStructure(brief, { mode: "auto" }, [], "pro");
  assert.equal(plan.features[0].subFeatures.length, limits.structureLimits("pro").subFeatures[0]);
  assert.ok(run.calls.some((call) => call.stage === "subfeatures" && call.userPrompt.includes("Complete ONLY phase")));
  assert.ok(plan.features[0].subFeatures.some((sub) => sub.title.includes("tambahan")));
});

test("a web architecture excluding a native mobile app completes without architecture retries", async () => {
  const run = fixture("free", false, `${architectureFixture}\nThis is a responsive website, not a native mobile app.`);
  const plan = await run.generate.generatePlanStructure("Kelola akun dan ruang kerja lewat website.", { mode: "auto" }, [], "free");
  assert.ok(plan.features.length > 0);
  assert.match(plan.architecture, /not a native mobile app/);
  assert.equal(run.calls.filter((call) => call.stage === "architecture").length, 1);
});

for (const tier of ["free", "pro"] as const) {
  test(`${tier}: supporting reminder wording passes architecture without scope repairs`, async () => {
    const run = fixture(tier, false, `${architectureFixture}\nBooking reminders support the customer's existing reservation workflow.`);
    const plan = await run.generate.generatePlanStructure("Build a browser workspace with a reminder one day before each reservation.", { mode: "auto" }, [], tier);
    assert.match(plan.architecture, /Booking reminders/);
    assert.equal(run.calls.filter(call => call.stage === "architecture").length, 1);
    assert.ok(run.calls.every(call => call.userPrompt.includes("BRIEF FIRST:")));
    assert.ok(run.calls.filter(call => call.stage === "outline").every(call => call.userPrompt.includes("usulan, bukan kebutuhan yang dikonfirmasi")));
    assert.ok(run.calls.every(call => !call.userPrompt.includes("hanya boleh muncul jika secara eksplisit diminta pengguna")));
  });
}

for (const tier of ["free", "pro"] as const) {
  test(`${tier}: shallow valid Mistral output is retried, then Gemini supplies a complete plan and tasks`, async () => {
    const run = fixture(tier);
    const brief = `Kelola akun dan ruang kerja. ${"Kebutuhan rinci pengguna dan data tersimpan. ".repeat(60)}`;
    const plan = await run.generate.generatePlanStructure(brief, { mode: "auto" }, [], tier);
    assert.equal(plan.features.length, run.featureCount);
    assert.equal(plan.features.at(-1)?.subFeatures.length, limits.structureLimits(tier).subFeatures[0] - 1);
    assert.ok(plan.features.every((feature) => feature.subFeatures.every((sub) => sub.selesaiBila.length >= 2)));
    assert.deepEqual(architectureQuality.validateArchitectureDraft(plan.architecture, {
      brief,
      featureTitles: plan.features.map((feature) => feature.title),
    }), []);
    assert.deepEqual(architectureQuality.validateDatabaseSchemaDraft(plan.databaseSchema, {
      brief,
      featureTitles: plan.features.map((feature) => feature.title),
    }), []);
    assert.ok(plan.warnings.length === 0);

    const outline = run.calls.filter((call) => call.stage === "outline");
    assert.deepEqual(outline.map((call) => call.model), ["mistral", "mistral", "gemini"]);
    assert.match(outline[1].userPrompt, /failed these checks:.*tujuan/);
    if (tier === "pro") assert.match(outline[1].userPrompt, /10-15 fase/);
    assert.ok(outline[0].userPrompt.includes(brief), "brief panjang diteruskan utuh");
    assert.ok(run.calls.filter((call) => call.stage === "subfeatures").every((call) => call.model === "mistral"));

    const finalFeature = plan.features.at(-1)!;
    const subTitles = finalFeature.subFeatures.map((sub) => sub.title);
    const generated = await run.generate.generateTasksForFeature(
      brief, finalFeature.title, subTitles, run.featureCount - 1, tier, run.featureCount,
      null, { language: "id" }, { reservedQa: true, subFeatures: finalFeature.subFeatures },
    );
    assert.equal(generated.tasks.length, Math.max(subTitles.length, limits.structureLimits(tier).tasks[0] - 4));
    assert.deepEqual(quality.validateTaskDraft(generated.tasks, subTitles, tier, { reservedQa: true }), []);
    const taskCalls = run.calls.filter((call) => call.stage === "tasks");
    assert.deepEqual(taskCalls.map((call) => call.model), ["mistral", "mistral", "gemini"]);
    assert.match(taskCalls[1].userPrompt, /failed these checks:.*title/);
    if (tier === "free") assert.match(taskCalls[1].userPrompt, /4-8 task/);
  });
}
