"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/types";
import { DiagramWithDetails } from "@/components/mermaid";

interface Section {
  id: string;
  title: string;
  body: ReactNode;
}

const priorityBadge: Record<string, string> = {
  high: "border-red-400/30 bg-red-400/[.08] text-red-300",
  medium: "border-amber-400/30 bg-amber-400/[.08] text-amber-300",
  low: "border-slate-400/30 bg-slate-400/[.08] text-slate-300",
};

const statusChip: Record<string, { label: string; className: string }> = {
  generating: { label: "Menyusun", className: "border-amber-400/30 bg-amber-400/[.08] text-amber-300" },
  ready: { label: "Siap", className: "border-[#74FA6A]/30 bg-[#74FA6A]/[.08] text-[#74FA6A]" },
  implementing: { label: "Berjalan", className: "border-blue-400/30 bg-blue-400/[.08] text-blue-300" },
  done: { label: "Selesai", className: "border-emerald-400/30 bg-emerald-400/[.08] text-emerald-300" },
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[.06] bg-white/[.02] px-3 py-1.5">
      <p className="font-mono text-[13px] font-semibold tabular-nums leading-tight text-white">{value}</p>
      <p className="text-[10px] leading-tight text-slate-500">{label}</p>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-semibold uppercase tracking-[.14em] text-white/30">
      {children}
    </p>
  );
}

function SectionHeading({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-[#74FA6A]/20 bg-[#74FA6A]/[.06] font-mono text-[11px] font-bold tabular-nums text-[#74FA6A]">
        {num}
      </span>
      <h2 className="!text-[17px] !font-semibold !leading-tight !tracking-tight text-white">{title}</h2>
    </div>
  );
}

/* ---------- Brief parser: ubah enumeration inline (1) (2) / 1. 2. / - - jadi blok menurun ---------- */

type BriefBlock = { type: "p"; text: string } | { type: "list"; ordered: boolean; items: string[] };

function splitAtMarkers(text: string, markers: { index: number; len: number }[]) {
  const first = markers[0];
  const intro = text.slice(0, first.index).trim().replace(/[:;\s]+$/, "");
  const rawItems: string[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + markers[i].len;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    const item = text.slice(start, end).trim().replace(/^[;:\-\s]+/, "").replace(/[;,\s]+$/, "").trim();
    if (item) rawItems.push(item);
  }
  let tail = "";
  if (rawItems.length) {
    const last = rawItems[rawItems.length - 1];
    const parts = last.split(/\.\s+(?=[A-Z])/);
    if (parts.length > 1) {
      rawItems[rawItems.length - 1] = parts[0].replace(/[;,\s]+$/, "").trim();
      tail = parts.slice(1).join(". ").trim();
    }
  }
  return { intro, items: rawItems, tail };
}

function toBlocks(intro: string, items: string[], tail: string, ordered: boolean): BriefBlock[] {
  const blocks: BriefBlock[] = [];
  if (intro) blocks.push({ type: "p", text: intro });
  if (items.length) blocks.push({ type: "list", ordered, items });
  if (tail) blocks.push({ type: "p", text: tail });
  return blocks;
}

function parseBrief(brief: string): BriefBlock[] {
  const text = brief.trim();
  if (!text) return [];

  // 1) angka dalam kurung: (1) (2) ...
  const parenMarkers = [...text.matchAll(/\(\s*\d{1,2}\s*\)/g)].map((m) => ({ index: m.index!, len: m[0].length }));
  if (parenMarkers.length >= 2) {
    const { intro, items, tail } = splitAtMarkers(text, parenMarkers);
    return toBlocks(intro, items, tail, true);
  }

  // 2) angka bertitik: 1. 2. 3. (lookahead spasi menghindarkan desimal seperti 99.9)
  const dotMarkers = [...text.matchAll(/(^|[\s;:])(\d{1,2})\.(?=\s)/g)].map((m) => ({
    index: m.index! + m[1].length,
    len: m[2].length + 1,
  }));
  if (dotMarkers.length >= 2) {
    const { intro, items, tail } = splitAtMarkers(text, dotMarkers);
    return toBlocks(intro, items, tail, true);
  }

  // 3) bullet: - / * / •
  const bulletMarkers = [...text.matchAll(/(^|[\s;:])([-*\u2022])\s+/g)].map((m) => ({
    index: m.index! + m[1].length,
    len: m[0].length - m[1].length,
  }));
  if (bulletMarkers.length >= 2) {
    const { intro, items, tail } = splitAtMarkers(text, bulletMarkers);
    return toBlocks(intro, items, tail, false);
  }

  return [{ type: "p", text }];
}

function BriefBlocks({ brief }: { brief: string }) {
  const blocks = parseBrief(brief);
  return (
    <div className="space-y-3">
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <p key={i} className="text-sm leading-relaxed text-slate-300">
            {b.text}
          </p>
        ) : (
          <ul key={i} className="space-y-2">
            {b.items.map((item, j) => (
              <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
                {b.ordered ? (
                  <span className="mt-[2px] grid size-5 shrink-0 place-items-center rounded-md border border-[#74FA6A]/20 bg-[#74FA6A]/[.06] font-mono text-[10px] font-bold tabular-nums text-[#74FA6A]">
                    {j + 1}
                  </span>
                ) : (
                  <span className="mt-[9px] size-1 shrink-0 rounded-full bg-[#74FA6A]/60" />
                )}
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function buildSections(plan: Plan): Section[] {
  const sections: Section[] = [];

  sections.push({
    id: "overview",
    title: "Overview",
    body: (
      <div className="space-y-4">
        <BriefBlocks brief={plan.brief} />
        {plan.stack.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {plan.stack.map((s) => (
              <span
                key={s}
                className="rounded-md border border-white/[.08] bg-white/[.03] px-2 py-1 font-mono text-[11px] text-slate-300"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    ),
  });

  sections.push({
    id: "requirements",
    title: "Requirements",
    body: (
      <div className="grid gap-5 lg:grid-cols-2">
        {plan.requirements?.fungsional.length ? (
          <div>
            <Label>Fungsional</Label>
            <ul className="mt-2 space-y-1.5">
              {plan.requirements.fungsional.map((x) => (
                <li key={x} className="flex gap-2 text-sm leading-relaxed text-slate-400">
                  <span className="mt-[9px] size-1 shrink-0 rounded-full bg-[#74FA6A]/60" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {plan.requirements?.nonFungsional.length ? (
          <div>
            <Label>Non-Fungsional</Label>
            <ul className="mt-2 space-y-1.5">
              {plan.requirements.nonFungsional.map((x) => (
                <li key={x} className="flex gap-2 text-sm leading-relaxed text-slate-400">
                  <span className="mt-[9px] size-1 shrink-0 rounded-full bg-slate-500" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {plan.asumsi.length > 0 && (
          <div className="lg:col-span-2">
            <Label>Asumsi</Label>
            <ul className="mt-2 space-y-1.5">
              {plan.asumsi.map((x) => (
                <li key={x} className="flex gap-2 text-sm leading-relaxed text-slate-400">
                  <span className="mt-[9px] size-1 shrink-0 rounded-full bg-slate-600" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ),
  });

  const faseMap = new Map<number, typeof plan.features>();
  for (const f of plan.features) {
    const phases = f.subFeatures.flatMap((sf) => sf.tasks.map((t) => t.phase));
    const minPhase = phases.length ? Math.min(...phases) : 1;
    if (!faseMap.has(minPhase)) faseMap.set(minPhase, []);
    faseMap.get(minPhase)!.push(f);
  }

  sections.push({
    id: "features",
    title: "Core Features",
    body: (
      <div className="space-y-6">
        {[...faseMap.keys()].sort((a, b) => a - b).map((fase) => (
          <div key={fase}>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[.14em] text-[#74FA6A]/70">
              Fase {fase}
            </p>
            <div className="mt-2.5 space-y-3">
              {faseMap.get(fase)!.map((f) => {
                const taskCount = f.subFeatures.reduce((a, sf) => a + sf.tasks.length, 0);
                return (
                  <div
                    key={f.slug}
                    className="rounded-xl border border-white/[.06] bg-white/[.02] p-4 transition-colors hover:border-white/[.12]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-white">{f.title}</span>
                      {f.priority && (
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                            priorityBadge[f.priority]
                          )}
                        >
                          {f.priority}
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[10px] tabular-nums text-white/30">
                        {taskCount} task
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.description}</p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Tujuan</Label>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.tujuan}</p>
                      </div>
                      <div>
                        <Label>Selesai bila</Label>
                        <ul className="mt-1.5 space-y-1">
                          {f.selesaiBila.map((x) => (
                            <li key={x} className="flex gap-2 text-[13px] leading-relaxed text-slate-400">
                              <svg
                                className="mt-[3px] size-3.5 shrink-0 text-[#74FA6A]"
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden
                              >
                                <path
                                  d="M3 8.5 6.5 12 13 4.5"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              {x}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {f.subFeatures.length > 0 && (
                      <div className="mt-3 border-t border-white/[.05] pt-3">
                        <Label>Sub-fitur</Label>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {f.subFeatures.map((sf) => (
                            <span
                              key={sf.title}
                              className="inline-flex items-center gap-1.5 rounded-md border border-white/[.07] bg-white/[.02] px-2 py-1 text-[12px] text-slate-300"
                            >
                              {sf.title}
                              <span className="font-mono text-[9px] tabular-nums text-white/30">
                                {sf.tasks.length}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    ),
  });

  if (plan.userFlow?.length) {
    sections.push({
      id: "userflow",
      title: "User Flow",
      body: (
        <div className="grid gap-4 sm:grid-cols-2">
          {plan.userFlow.map((flow, i) => (
            <div key={i} className="rounded-xl border border-white/[.06] bg-white/[.02] p-4">
              <p className="text-[14px] font-semibold text-white">{flow.title}</p>
              <ol className="mt-2.5 space-y-1.5">
                {flow.steps.map((step, si) => (
                  <li key={si} className="flex gap-2.5 text-[13px] leading-relaxed text-slate-400">
                    <span className="font-mono text-[11px] tabular-nums text-[#74FA6A]/70">{si + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (plan.architecture) {
    sections.push({
      id: "architecture",
      title: "Architecture",
      body: <DiagramWithDetails text={plan.architecture} />,
    });
  }

  if (plan.databaseSchema) {
    sections.push({
      id: "database",
      title: "Database Schema",
      body: <DiagramWithDetails text={plan.databaseSchema} />,
    });
  }

  sections.push({
    id: "techstack",
    title: "Tech Stack",
    body: plan.techStack?.length ? (
      <div className="grid gap-2 sm:grid-cols-2">
        {plan.techStack.map((t) => (
          <div key={t.name} className="rounded-lg border border-white/[.06] bg-white/[.02] px-3 py-2.5">
            <p className="text-[13px] font-semibold text-white/80">{t.name}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{t.desc}</p>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-slate-400">{plan.stack.join(" · ")}</p>
    ),
  });

  return sections;
}

export function PrdView({ plan }: { plan: Plan }) {
  const sections = useMemo(() => buildSections(plan), [plan]);
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const suppressSpy = useRef(false);
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = useMemo(() => {
    const subTotal = plan.features.reduce((a, f) => a + f.subFeatures.length, 0);
    const taskTotal = plan.features.reduce(
      (a, f) => a + f.subFeatures.reduce((b, sf) => b + sf.tasks.length, 0),
      0
    );
    const doneTotal = plan.features.reduce(
      (a, f) => a + f.subFeatures.reduce((b, sf) => b + sf.tasks.filter((t) => t.status === "done").length, 0),
      0
    );
    return { subTotal, taskTotal, doneTotal };
  }, [plan]);

  const chip = statusChip[plan.status] ?? statusChip.ready;
  const createdAt = plan.createdAt
    ? new Date(plan.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressSpy.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => {
      observer.disconnect();
      if (suppressTimer.current) clearTimeout(suppressTimer.current);
    };
  }, [sections]);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    suppressSpy.current = true;
    if (suppressTimer.current) clearTimeout(suppressTimer.current);
    suppressTimer.current = setTimeout(() => {
      suppressSpy.current = false;
    }, 900);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const num = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Mobile horizontal nav */}
      <nav className="sticky top-0 z-20 -mx-4 overflow-x-auto border-b border-white/8 bg-[#0A0A0A]/85 px-4 py-2 backdrop-blur-xl md:hidden">
        <div className="flex w-max items-center gap-1">
          {sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                active === s.id
                  ? "bg-[#74FA6A]/[.12] text-[#74FA6A]"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <span className="font-mono tabular-nums">{num(i)}</span>
              {s.title}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex gap-10 px-4 py-8 md:px-6">
        {/* Desktop sidebar */}
        <aside className="sticky top-6 hidden w-56 shrink-0 self-start md:block">
          <p className="px-3 font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-white/25">
            Daftar isi
          </p>
          <nav className="mt-2.5 space-y-0.5 border-l border-white/[.06]">
            {sections.map((s, i) => (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                className={cn(
                  "group -ml-px flex w-full items-center gap-2.5 border-l-2 py-1.5 pl-3.5 pr-2 text-left transition-colors",
                  active === s.id
                    ? "border-[#74FA6A] text-white"
                    : "border-transparent text-slate-500 hover:border-white/20 hover:text-slate-300"
                )}
                aria-current={active === s.id ? "location" : undefined}
              >
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums",
                    active === s.id ? "text-[#74FA6A]" : "text-white/25 group-hover:text-white/40"
                  )}
                >
                  {num(i)}
                </span>
                <span className="text-[12.5px] font-medium leading-tight">{s.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <article className="mx-auto max-w-3xl">
            <p className="eyebrow">Product requirements document</p>
            <h1 className="mt-2 !text-2xl !font-bold !leading-tight !tracking-tight text-white">
              {plan.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", chip.className)}>
                {chip.label}
              </span>
              {createdAt && (
                <span className="font-mono text-[11px] tabular-nums text-slate-500">dibuat {createdAt}</span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Fitur" value={String(plan.features.length)} />
              <Stat label="Sub-fitur" value={String(stats.subTotal)} />
              <Stat label="Task selesai" value={`${stats.doneTotal}/${stats.taskTotal}`} />
              <Stat label="Fase" value={String(new Set(plan.features.flatMap((f) => f.subFeatures.flatMap((sf) => sf.tasks.map((t) => t.phase)))).size || 1)} />
            </div>

            {stats.taskTotal > 0 && (
              <div className="mt-3">
                <div className="h-1 overflow-hidden rounded-full bg-white/[.05]">
                  <div
                    className="h-full rounded-full bg-[#74FA6A] transition-[width] duration-500"
                    style={{ width: `${stats.taskTotal ? (stats.doneTotal / stats.taskTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-8 space-y-10">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <SectionHeading num={num(i)} title={s.title} />
                  <div className="mt-4">{s.body}</div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
