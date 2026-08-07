"use client";

import { useEffect, useRef, useState } from "react";

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

export function RichContent({ text, diagramOnly = false }: { text: string; diagramOnly?: boolean }) {
  const parts = text.split(/(```mermaid[\s\S]*?```)/g);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        const mermaidMatch = part.match(/```mermaid\s*([\s\S]*?)```/);
        if (mermaidMatch) return <Mermaid key={i} code={mermaidMatch[1]} />;
        if (diagramOnly || !part.trim()) return null;
        return <pre key={i} className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-slate-400">{part.trim()}</pre>;
      })}
    </div>
  );
}
