"use client";

import { useEffect, useRef, useState } from "react";
import { MermaidFlow, mermaidToFlow } from "./mermaid-flow";
import { useTheme } from "next-themes";
import { themeColor } from "@/lib/theme-colors";

export function Mermaid({ code }: { code: string }) {
  const { resolvedTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const surface = themeColor("--theme-surface");
        const text = themeColor("--theme-text");
        const border = themeColor("--theme-border-strong");
        const accent = themeColor("--theme-accent");
        mermaid.initialize({
          startOnLoad: false, theme: "base", securityLevel: "strict",
          themeVariables: {
            darkMode: resolvedTheme !== "light", background: themeColor("--theme-bg"),
            primaryColor: surface, primaryTextColor: text, primaryBorderColor: border,
            secondaryColor: themeColor("--theme-tint"), secondaryTextColor: text,
            tertiaryColor: themeColor("--theme-raised"), tertiaryTextColor: text,
            lineColor: accent, textColor: text, mainBkg: surface, nodeBorder: border,
            clusterBkg: surface, clusterBorder: border, edgeLabelBackground: surface,
            actorBkg: surface, actorBorder: border, actorTextColor: text,
            signalColor: text, signalTextColor: text, labelBoxBkgColor: surface,
            labelBoxBorderColor: border, labelTextColor: text, loopTextColor: text,
            noteBkgColor: themeColor("--theme-tint"), noteTextColor: text, noteBorderColor: border,
          },
        });
        const id = `mmd-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, code.trim());
        if (active) { setSvg(svg); setError(false); }
      } catch {
        if (active) setError(true);
      }
    })();
    return () => { active = false; };
  }, [code, resolvedTheme]);

  if (error) return <pre className="overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">{code}</pre>;
  if (!svg) return <div className="grid h-32 place-items-center text-[10px] text-muted-foreground">Loading diagram...</div>;
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
        return <pre key={i} className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-muted-foreground">{part.trim()}</pre>;
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
        <details className="group rounded-lg border border-border bg-foreground/[.02] px-3 py-2">
          <summary className="cursor-pointer select-none list-none text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground transition-colors hover:text-foreground">
            <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">▸</span>
            Detail & alasan desain
          </summary>
          <pre className="mt-2 whitespace-pre-wrap border-t border-border pt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">{narrative}</pre>
        </details>
      )}
    </div>
  );
}
