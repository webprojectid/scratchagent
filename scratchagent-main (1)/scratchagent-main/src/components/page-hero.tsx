import type { ReactNode } from "react";

/**
 * Hero halaman publik yang seragam: dipakai Solutions, Pricing, dan Docs.
 * Satu spesifikasi — container, ukuran judul, sub, dan padding — supaya
 * ketiga halaman terasa sama rata dan sama besar.
 *
 * - Container: max-w-[980px], center, px-5, pt-16 md:pt-24, pb-16
 * - Judul: clamp(2.4rem → 3.9rem), tracking rapat, warna hijau-pucat
 * - Sub: 15px, lebar baca 58ch
 * - Isi aksi (CTA / pill / trust badges) dikirim lewat `children`.
 */
export function PageHero({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/[.06]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% -15%, rgba(116,250,106,.10), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-[980px] px-5 pb-16 pt-16 text-center md:pt-24">
        {eyebrow && (
          <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[#8FDB90]">
            {eyebrow}
          </p>
        )}
        <h1
          className={`mx-auto max-w-[20ch] text-balance font-semibold text-[#EDF8EA] ${eyebrow ? "mt-4" : ""}`}
          /* Inline style: rules mentah h1/p di globals.css (di luar @layer) selalu
             mengalahkan utility Tailwind, jadi nilai tipografi dikunci di sini. */
          style={{ fontSize: "clamp(2.4rem, 5.6vw, 3.9rem)", lineHeight: 1.05, letterSpacing: "-0.05em" }}
        >
          {title}
        </h1>
        {sub && (
          <p
            className="mx-auto mt-5 text-balance text-[15px] leading-[1.65] text-[#A9C5A7]"
            style={{ maxWidth: "58ch" }}
          >
            {sub}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
