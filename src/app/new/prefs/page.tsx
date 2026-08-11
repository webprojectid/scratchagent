"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Wrench, Clock, Layers, Cpu } from "lucide-react";
import { Shell } from "@/components/brand";

const opts = {
  Frontend: [
    "Next.js",
    "TanStack Start",
    "Svelte / SvelteKit",
    "Astro",
    "Nuxt",
    "React",
    "Vue",
    "Angular",
    "HTMX",
    "Qwik",
    "Solid / SolidStart",
    "Flutter",
    "React Native / Expo",
    "Jetpack Compose",
    "SwiftUI (iOS Native)",
    "Tauri (Desktop)",
    "Electron (Desktop)",
  ],
  Backend: [
    "Next.js",
    "Node.js",
    "Bun",
    "Hono",
    "Deno",
    "tRPC",
    "Python (FastAPI / Django)",
    "Go (Fiber / Echo)",
    "Rust (Axum / Actix)",
    "Ruby on Rails",
    "Java",
    ".NET",
    "Laravel",
    "Cloudflare Workers",
    "Convex (BaaS)",
    "InstantForge (BaaS)",
    "Supabase (BaaS)",
    "Firebase (BaaS)",
    "Appwrite (BaaS)",
    "PocketBase (BaaS)",
  ],
  Database: [
    "Supabase (Postgres)",
    "Neon (Serverless Postgres)",
    "Prisma Postgres",
    "PostgreSQL",
    "SurrealDB",
    "Turso (libSQL)",
    "Turborepo (libSQL) / LibSQL",
    "PlanetScale (MySQL)",
    "MySQL",
    "MongoDB",
    "Cloudflare D1",
    "DynamoDB",
    "CockroachDB",
    "ClickHouse",
    "Xata",
    "Redis / Upstash",
    "SQLite",
  ],
  Deployment: [
    "Vercel",
    "Netlify",
    "Cloudflare Pages / Workers",
    "Railway",
    "Render",
    "Fly.io",
    "Koyeb",
    "Northflank",
    "Deno Deploy",
    "SST / Ion",
    "Modal",
    "AWS (Amplify / ECS / Lambda)",
    "Google Cloud (Cloud Run)",
    "Azure (App Service)",
    "Hetzner Cloud",
    "DigitalOcean (App Platform)",
    "VPS",
    "Docker / Kubernetes",
    "Coolify",
  ],
};

export default function Prefs() {
  const router = useRouter();
  const [custom, setCustom] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, string>>({});

  function start() {
    const brief = sessionStorage.getItem("rv_brief") ?? "";
    const techPrefs = custom
      ? { mode: "custom" as const, frontend: prefs.Frontend ?? "Next.js", backend: prefs.Backend ?? "Node.js", database: prefs.Database ?? "PostgreSQL", deployment: prefs.Deployment ?? "Railway" }
      : { mode: "auto" as const };
    sessionStorage.setItem("rv_prefs", JSON.stringify(techPrefs));
    sessionStorage.setItem("rv_brief", brief);
    router.push("/new/questions");
  }

  return (
    <Shell back="/new" sidebar={false}>
      <section className="mx-auto max-w-[1280px] px-5 py-10 md:px-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#74FA6A]">stack</p>
            <h1 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[.95] tracking-[-.05em]">Pilih senjata.</h1>

            <div className="mt-8 grid gap-3 md:grid-cols-2">
              <button onClick={() => setCustom(false)} className={`rounded-[12px] border p-5 text-left transition ${!custom ? "border-[#74FA6A] bg-[#0F1317]" : "border-white/10 bg-[#0F1317]/50 hover:border-white/20"}`}>
                <div className="flex items-center gap-2.5">
                  <Sparkles className="text-[#74FA6A]" size={16} />
                  <span className="font-mono text-[12px] tracking-[.02em] text-white">auto</span>
                </div>
                <p className="mt-2.5 font-mono text-[11px] leading-5 text-[#8C97A5]">brief -{">"} domain detect -{">"} stack map dari registry 60+ opsi.</p>
              </button>
              <button onClick={() => setCustom(true)} className={`rounded-[12px] border p-5 text-left transition ${custom ? "border-[#74FA6A] bg-[#0F1317]" : "border-white/10 bg-[#0F1317]/50 hover:border-white/20"}`}>
                <div className="flex items-center gap-2.5">
                  <Wrench className="text-[#74FA6A]" size={16} />
                  <span className="font-mono text-[12px] tracking-[.02em] text-white">custom</span>
                </div>
                <p className="mt-2.5 font-mono text-[11px] leading-5 text-[#8C97A5]">frontend, backend, database, deployment. lock di PRD.</p>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {!custom ? (
                <motion.div key="auto" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-4 rounded-[12px] border border-white/10 bg-[#0F1317] p-5">
                  <p className="font-mono text-[10px] tracking-[.14em] text-white/30">AI STEPS</p>
                  <div className="mt-3 space-y-2.5 font-mono text-[11px] leading-5 text-[#8C97A5]">
                    <p><span className="text-white">1.</span> parse brief → domain, platform target, data model</p>
                    <p><span className="text-white">2.</span> map → frontend/backend/db/deploy dari 60+ registry</p>
                    <p><span className="text-white">3.</span> expand → asumsi, fitur, sub-fitur, edge cases</p>
                    <p><span className="text-white">4.</span> graph → phase, layer, deps acyclic, QA last</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="custom" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-4 rounded-[12px] border border-white/10 bg-[#0F1317] p-5">
                  <p className="font-mono text-[10px] tracking-[.14em] text-white/30">LOCK STACK</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {Object.entries(opts).map(([label, values]) => (
                      <label key={label} className="font-mono text-[10px] tracking-[.06em] text-white/40">
                        {label.toLowerCase()}
                        <select className="mt-1.5 w-full rounded-[8px] border border-white/10 bg-[#0A0A0A] px-3 py-2.5 font-mono text-[12px] text-white outline-none focus:border-[#74FA6A]/40" value={prefs[label] ?? values[0]} onChange={(e) => setPrefs((p) => ({ ...p, [label]: e.target.value }))}>
                          {values.map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 flex justify-end">
              <button className="rounded-full border border-[#74FA6A] bg-transparent px-6 py-2.5 font-mono text-[12px] tracking-[.06em] text-[#74FA6A] transition-colors hover:bg-[#74FA6A] hover:text-black" onClick={start}>lanjut — klarifikasi dulu</button>
            </div>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <AnimatePresence mode="wait">
              {!custom ? (
                <motion.div key="auto-preview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-3">
                  <div className="rounded-[12px] border border-white/10 bg-[#0F1317] p-5">
                    <p className="font-mono text-[10px] tracking-[.14em] text-white/30">REGISTRY EXAMPLES</p>
                    <div className="mt-4 space-y-2.5 font-mono text-[11px]">
                      <div className="flex justify-between rounded-[8px] border border-white/10 bg-[#0A0A0A] px-3 py-2.5"><span className="text-white/40">web</span><span className="text-white">Next.js / Supabase / Vercel</span></div>
                      <div className="flex justify-between rounded-[8px] border border-white/10 bg-[#0A0A0A] px-3 py-2.5"><span className="text-white/40">mobile</span><span className="text-white">Flutter / Firebase / Store</span></div>
                      <div className="flex justify-between rounded-[8px] border border-white/10 bg-[#0A0A0A] px-3 py-2.5"><span className="text-white/40">desktop</span><span className="text-white">Tauri / Rust / SQLite</span></div>
                    </div>
                    <p className="mt-4 flex items-center gap-1.5 font-mono text-[10px] text-white/30"><Clock size={12} /> 30–90s · no placeholder · strict json</p>
                  </div>

                  <div className="rounded-[12px] border border-[#74FA6A]/20 bg-[#0F1317] p-4 font-mono text-[10px] leading-5 tracking-[.02em] text-white/40">
                    web → Next.js + Supabase (Postgres) + Vercel<br />mobile → Flutter + Firebase + App Store<br />desktop → Tauri + Rust + SQLite + VPS<br /><span className="text-[#74FA6A]">→ stack ≠ teori, tapi buildable</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="custom-preview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-3">
                  <div className="rounded-[12px] border border-white/10 bg-[#0F1317] p-5">
                    <p className="font-mono text-[10px] tracking-[.14em] text-white/30">SELECTED</p>
                    <div className="mt-4 space-y-2">
                      {Object.entries(opts).map(([label]) => {
                        const value = prefs[label] ?? opts[label as keyof typeof opts][0];
                        return <div key={label} className="flex items-center justify-between rounded-[8px] border border-white/10 bg-[#0A0A0A] px-3 py-2.5"><span className="font-mono text-[10px] uppercase tracking-[.06em] text-white/30">{label}</span><span className="max-w-[160px] truncate font-mono text-[11px] text-[#74FA6A]">{value}</span></div>;
                      })}
                    </div>
                    <div className="mt-4 rounded-[8px] border border-[#74FA6A]/20 bg-[#74FA6A]/5 px-3 py-2 font-mono text-[10px] leading-5 text-[#74FA6A]"><Layers size={12} className="inline-block -translate-y-px" /> lock di PRD — jadi acuan agent, bukan saran.</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-3 rounded-[12px] border border-white/5 bg-[#0A0A0A] p-4">
              <p className="font-mono text-[9px] tracking-[.12em] text-white/20">NEXT</p>
              <div className="mt-2 flex items-center gap-3"><div className="grid size-7 place-items-center rounded-full bg-[#74FA6A]/10 text-[#74FA6A]"><Cpu size={12} /></div><div><p className="font-mono text-[11px] text-white">klarifikasi → generate prd + graph</p><p className="font-mono text-[10px] text-white/30">jawab pertanyaan → 3 stage + qa · polling live</p></div></div>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
