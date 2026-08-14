import Link from "next/link";

export const metadata = {
  title: "Docs — Scratch Agent",
  description: "Quickstart, konsep plan, prompt agent, dan FAQ Scratch Agent — gratis 100%.",
};

function Eyebrow({ children }: { children: string }) {
  return <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#9CA9B8]">{children}</p>;
}

function SectionTitle({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div id={id} className="scroll-mt-28 pt-16 md:pt-20">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-[clamp(1.7rem,3.2vw,2.5rem)] font-medium leading-[1.02] tracking-[-.05em] text-[#F0F3F5]">{title}</h2>
    </div>
  );
}

const faqs = [
  {
    q: "Apakah Scratch Agent berbayar?",
    a: "Tidak — Scratch Agent gratis 100%, tanpa tier dan tanpa kuota tersembunyi. Kalau kamu merasa terbantu dan ingin mendukung, donasi tersedia lewat PayPal di halaman utama.",
  },
  {
    q: "AI agent apa saja yang didukung?",
    a: "OpenCode, Claude Code, Cursor, Codex, dan agent lain yang bisa menerima instruksi teks. Cara paling mudah: salin prompt dari tombol \"Mulai implementasi\" di halaman plan, tempel ke agent kamu — sisanya agent yang jalankan.",
  },
  {
    q: "Bagaimana cara mendapatkan token akses?",
    a: "Login ke website, buka halaman Profile, lalu buat token akses baru. Token hanya ditampilkan sekali — simpan baik-baik.",
  },
  {
    q: "Apa yang terjadi kalau task gagal?",
    a: "Plan akan ter-blokir dan task berikutnya tidak diberikan sampai masalahnya ditangani. Agent (atau kamu) bisa membaca alasan gagalnya, memperbaiki, lalu mencoba ulang task tersebut untuk melanjutkan.",
  },
  {
    q: "Apakah perlu setup yang rumit?",
    a: "Tidak. Cukup buat plan dari brief, salin prompt, dan tempel ke agent kamu. Tidak ada konfigurasi tambahan — semuanya berjalan dari satu prompt itu.",
  },
  {
    q: "Di mana data plan saya disimpan?",
    a: "Di cloud (Supabase), terikat ke akun kamu. Plan bersifat privat dan hanya bisa diakses dengan login atau token milikmu.",
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#E8EDEC] selection:bg-[#74FA6A]/30 selection:text-black">
      <header className="sticky top-0 z-40 border-b border-white/[.06] bg-[rgba(10,10,10,0.85)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-[54px] max-w-[1100px] items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-[-.04em] text-[#E8F0E8]">
            <span className="relative grid size-6 place-items-center overflow-hidden text-[#74FA6A]" aria-hidden="true"><span className="absolute left-0 top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#74FA6A]" /><span className="absolute left-[7px] top-[2.5px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#9AFF82]" /><span className="absolute left-[14px] top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#4DDC62]" /></span>
            Scratch Agent
          </Link>
          <div className="flex items-center gap-5 font-mono text-[12px] text-white/60">
            <Link href="/" className="transition-colors hover:text-[#74FA6A]">Home</Link>
            <Link href="/new" className="rounded-full bg-[#74FA6A] px-3.5 py-1.5 font-semibold text-black transition hover:bg-[#A8FF9B]">Buat plan</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-5 pb-24">
        <section className="pt-14 md:pt-20">
          <Eyebrow>dokumentasi</Eyebrow>
          <h1 className="mt-4 max-w-[24ch] text-balance text-[clamp(2.2rem,5vw,3.6rem)] font-medium leading-[1] tracking-[-.06em] text-[#E8F8E5]">Mulai dari brief, biarkan agent bergerak.</h1>
          <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.65] text-[#A9C5A7]">Scratch Agent mengubah brief menjadi PRD dan task terurut, lalu agent AI kamu mengeksekusinya lewat satu prompt — satu task per siklus. Gratis 100%.</p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {[["#quickstart", "Quickstart"], ["#konsep", "Konsep"], ["#prompt", "Prompt Agent"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full border border-white/15 px-3.5 py-1.5 font-mono text-[11px] text-white/70 transition-colors hover:border-[#74FA6A]/50 hover:text-[#74FA6A]">{label}</a>
            ))}
          </div>
        </section>

        <SectionTitle id="quickstart" eyebrow="quickstart" title="Lima menit sampai task pertama." />
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-[16px] font-semibold text-white">1. Buat plan dari brief</h3>
            <p className="mt-2 max-w-[68ch] text-[13.5px] leading-[1.7] text-[#8C97A5]">Login ke website, buka halaman <Link href="/new" className="text-[#74FA6A] underline underline-offset-2">New Project</Link>, tulis brief singkat (contoh: &quot;aplikasi kasir untuk kedai kopi&quot;), lalu biarkan AI menyusun struktur, PRD, dan task. Tunggu sampai status plan <span className="font-mono text-[12px] text-white/70">ready</span>.</p>
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-white">2. Salin prompt & tempel ke agent</h3>
            <p className="mt-2 max-w-[68ch] text-[13.5px] leading-[1.7] text-[#8C97A5]">Di halaman plan, klik <span className="text-white/80">&quot;Mulai implementasi&quot;</span> dan salin prompt yang muncul. Tempel ke AI agent kamu (OpenCode, Claude Code, Cursor, dll). Agent akan terhubung ke plan, membaca PRD, dan mengerjakan task satu per satu secara otomatis.</p>
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-white">3. Pantau progress live</h3>
            <p className="mt-2 max-w-[68ch] text-[13.5px] leading-[1.7] text-[#8C97A5]">Buka halaman project — tiap task yang sedang dikerjakan tampil dengan spinner, yang selesai dicoret, dan progress bar bergerak real-time. Kalau ada task gagal atau checkpoint, agent berhenti dan menunggu keputusanmu.</p>
          </div>
        </div>

        <SectionTitle id="konsep" eyebrow="konsep" title="Cara Scratch Agent berpikir." />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            { t: "Struktur plan", d: "Plan → Feature → Sub-feature → Task. Setiap task punya ref unik seperti F01-S02-T03: fase 1, sub-feature 2, task 3." },
            { t: "Fase", d: "Satu feature = satu fase. Agent menuntaskan seluruh task fase itu dulu sebelum pindah ke fase berikutnya — progress di web ikut bergerak." },
            { t: "Layer", d: "Task punya layer frontend, backend, atau qa. Dalam satu fase, urutan alamiahnya frontend → backend → qa." },
            { t: "Dependensi", d: "Task bisa bergantung pada task lain. Server selalu memilih task berikutnya yang dependensinya sudah selesai — agent tidak pernah salah urutan." },
            { t: "Checkpoint", d: "Saat berpindah fase atau layer, agent diminta berhenti dan melapor dulu. Kamu verifikasi, lalu bilang \"lanjut\"." },
            { t: "Status", d: "Task: pending → in_progress → done | failed (failed memblokir plan sampai di-retry). Plan: generating → ready → implementing → done." },
          ].map((item) => (
            <div key={item.t} className="rounded-[14px] border border-white/10 bg-[#111413] p-5">
              <h3 className="font-mono text-[11px] uppercase tracking-[.16em] text-[#74FA6A]">{item.t}</h3>
              <p className="mt-2.5 text-[13px] leading-[1.65] text-[#8C97A5]">{item.d}</p>
            </div>
          ))}
        </div>

        <SectionTitle id="prompt" eyebrow="prompt agent" title="Satu prompt, agent langsung kerja." />
        <p className="mt-4 max-w-[70ch] text-[13.5px] leading-[1.7] text-[#8C97A5]">Setiap plan punya prompt misi yang dibuat otomatis — sudah berisi identitas plan dan instruksi lengkap. Kamu tidak perlu menulis instruksi sendiri atau menghafal perintah apa pun.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            { t: "Cara mendapatkannya", d: "Buka plan yang sudah ready, klik tombol \"Mulai implementasi\", lalu salin prompt yang muncul. Token aksesmu sudah termasuk di dalamnya." },
            { t: "Isi prompt-nya", d: "Perintah untuk terhubung ke plan, membaca PRD, lalu loop: ambil task berikutnya → kerjakan → tandai selesai. Urutan dan dependensi diatur server." },
            { t: "Agent yang didukung", d: "OpenCode, Claude Code, Cursor, Codex, dan agent lain yang bisa menerima instruksi teks. Tempel prompt-nya, biarkan agent bekerja." },
            { t: "Mekanisme aman", d: "Jika task gagal, plan ter-blokir dan agent berhenti lalu melapor. Saat checkpoint, agent menunggu verifikasi darimu sebelum lanjut." },
          ].map((item) => (
            <div key={item.t} className="rounded-[14px] border border-white/10 bg-[#111413] p-5">
              <h3 className="font-mono text-[11px] uppercase tracking-[.16em] text-[#74FA6A]">{item.t}</h3>
              <p className="mt-2.5 text-[13px] leading-[1.65] text-[#8C97A5]">{item.d}</p>
            </div>
          ))}
        </div>

        <SectionTitle id="faq" eyebrow="faq" title="Yang sering ditanyakan." />
        <div className="mt-8 space-y-3">
          {faqs.map((item) => (
            <details key={item.q} className="group rounded-[14px] border border-white/10 bg-[#111413] px-5 py-4 transition-colors open:border-[#74FA6A]/30">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-medium text-[#E8F0E8] [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="shrink-0 font-mono text-[14px] text-[#74FA6A] transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-[72ch] text-[13px] leading-[1.7] text-[#8C97A5]">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-[#74FA6A]/20 bg-[#74FA6A]/[.05] px-6 py-5">
          <p className="max-w-[52ch] text-sm leading-6 text-[#A9C5A7]">Siap mengubah brief jadi plan yang bisa langsung dieksekusi agent?</p>
          <Link href="/new" className="rounded-full bg-[#74FA6A] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#A8FF9B]">Buat plan — gratis</Link>
        </div>
      </div>

      <footer className="border-t border-white/10 px-5 py-8">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-[#5B6676]">
          <span>© 2026 Scratch Agent — hire your AI agent, 100% gratis.</span>
          <span className="flex gap-5">
            <Link href="/" className="transition-colors hover:text-[#74FA6A]">home</Link>
            <Link href="/project/demo" className="transition-colors hover:text-[#74FA6A]">demo</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}
