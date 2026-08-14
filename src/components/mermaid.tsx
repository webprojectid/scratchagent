"use client";

import { useEffect, useRef, useState } from "react";
import { MermaidFlow, mermaidToFlow } from "./mermaid-flow";

export function Mermaid({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
        const id = `mmd-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, code.trim());
        if (active) setSvg(svg);
      } catch {
        if (active) setError(true);
      }
    })();
    return () => { active = false; };
  }, [code]);

  if (error) return <pre className="overflow-auto whitespace-pre-wrap rounded-lg border border-white/[.06] bg-[#0e1218] p-3 font-mono text-[10px] leading-relaxed text-slate-400">{code}</pre>;
  if (!svg) return <div className="grid h-32 place-items-center text-[10px] text-white/20">Loading diagram...</div>;
  return <div ref={ref} className="overflow-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function RichContent({ text, diagramOnly = false, flow = false }: { text: string; diagramOnly?: boolean; flow?: boolean }) {
  const parts = text.split(/(```mermaid[\s\S]*?```)/gi);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        const mermaidMatch = part.match(/```mermaid\s*([\s\S]*?)```/i);
        if (mermaidMatch) {
          const code = mermaidMatch[1];
          if (flow && mermaidToFlow(code)) {
            return <MermaidFlow key={i} code={code} />;
          }
          return <Mermaid key={i} code={code} />;
        }
        if (diagramOnly || !part.trim()) return null;
        return <pre key={i} className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-slate-400">{part.trim()}</pre>;
      })}
    </div>
  );
}

/** Diagram interaktif + narasi (trade-off, alasan desain) dalam collapsible. */
export function DiagramWithDetails({ text }: { text: string }) {
  const parts = text.split(/(```mermaid[\s\S]*?```)/gi);
  const diagrams: string[] = [];
  const narrativeParts: string[] = [];
  for (const part of parts) {
    const m = part.match(/```mermaid\s*([\s\S]*?)```/i);
    if (m) diagrams.push(m[1]);
    else if (part.trim()) narrativeParts.push(part.trim());
  }
  const narrative = narrativeParts.join("\n\n");

  return (
    <div className="space-y-2">
      {diagrams.map((code, i) => {
        if (mermaidToFlow(code)) return <MermaidFlow key={i} code={code} />;
        return <Mermaid key={i} code={code} />;
      })}
      {narrative && (
        <details className="group rounded-lg border border-white/[.06] bg-white/[.02] px-3 py-2">
          <summary className="cursor-pointer select-none list-none text-[10px] font-semibold uppercase tracking-[.12em] text-white/30 transition-colors hover:text-white/60">
            <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">▸</span>
            Detail & alasan desain
          </summary>
          <pre className="mt-2 whitespace-pre-wrap border-t border-white/[.06] pt-2 font-mono text-[10px] leading-relaxed text-slate-400">{narrative}</pre>
        </details>
      )}
    </div>
  );
}
