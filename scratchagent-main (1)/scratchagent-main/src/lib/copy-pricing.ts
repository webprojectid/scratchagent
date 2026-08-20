import type { Lang } from "./lang";

/** Semua copy halaman /pricing dalam dua bahasa. */
export function pricingCopy(lang: Lang) {
  const en = lang === "en";
  return {
    heroTitle: en
      ? "Start on the Free plan. Upgrade when you need more."
      : "Mulai dari paket Free. Upgrade saat butuh lebih.",
    heroSub: en
      ? "One generate turns your brief into a complete plan: structure, PRD, architecture, all the way to ordered tasks. Pick the plan that matches your working rhythm."
      : "Satu generate memproses brief kamu jadi plan lengkap: struktur, PRD, arsitektur, sampai task terurut. Pilih paket yang sesuai ritme kerjamu.",
    heroCta: en ? "Start with the Free plan" : "Mulai dari paket Free",
    compareLink: en ? "compare all features" : "bandingkan semua fitur",
    trust: en
      ? ["no credit card", "cancel anytime", "plans stay yours"]
      : ["tanpa kartu kredit", "batal kapan saja", "plan tetap milikmu"],

    tiersTitle: en ? "Two plans, one identical pipeline." : "Dua paket, satu pipeline yang sama.",
    tiersNote: en
      ? "every plan produces structure, PRD, architecture, and tasks with the same quality"
      : "semua paket menghasilkan struktur, PRD, arsitektur, dan task dengan kualitas yang sama",

    compareTitle: en ? "Every feature, at a glance." : "Semua fitur, dilihat sekilas.",
    compareSub: en
      ? "Plans differ only in quota, speed, and premium features. The base quality of every generate is the same across all plans."
      : "Perbedaan paket hanya di kuota, kecepatan, dan fitur premium. Kualitas dasar hasil generate sama di semua paket.",
    colFeature: en ? "Feature" : "Fitur",
    yesLabel: en ? "Yes" : "Ya",
    noLabel: en ? "No" : "Tidak",
    comparison: [
      { label: en ? "Plan generates per 24 hours" : "Generate plan per 24 jam", free: "3", pro: en ? "Unlimited" : "Unlimited" },
      { label: en ? "PRD phases per plan" : "Fase PRD per plan", free: "4–8", pro: "10–15" },
      { label: en ? "Sub-features per phase" : "Sub-fitur per fase", free: "3–5", pro: "8–12" },
      { label: en ? "Tasks per plan" : "Task per plan", free: "14–20", pro: "15–25" },
      { label: "Premium AI model", free: true, pro: true },
      { label: en ? "Priority queue" : "Antrean prioritas", free: false, pro: true },
      { label: en ? "Edit and delete plan structure" : "Edit dan delete struktur plan", free: false, pro: true },
      { label: en ? "Export PRD and tasks" : "Export PRD dan task", free: false, pro: true },
      { label: en ? "Private plans in the cloud" : "Plan privat di cloud", free: en ? "Forever" : "Selamanya", pro: en ? "Forever" : "Selamanya" },
      { label: "Support", free: en ? "Community" : "Komunitas", pro: "Private" },
    ] as { label: string; free: string | boolean; pro: string | boolean }[],

    faqTitle: en ? "Plans and billing, answered." : "Seputar paket dan pembayaran.",
    faqSub: en
      ? "Straight answers, no clicking around. If your question is not here, start from the home page."
      : "Jawaban langsung, tanpa perlu klik apa pun. Kalau pertanyaanmu belum terjawab, mulai dari halaman utama.",
    faqs: en
      ? [
          {
            q: "What counts as one generate?",
            a: "One brief you submit until it becomes a complete plan: structure, PRD, architecture, database schema, all the way to ordered tasks. Prompt revisions for the agent do not reduce your quota.",
          },
          {
            q: "When does the Free quota reset?",
            a: "The quota runs on a rolling 24 hour window. Every generate has its own expiry, so once one generate passes 24 hours, that slot opens up again without waiting for a new day.",
          },
          {
            q: "Can I cancel my subscription anytime?",
            a: "Yes. Plans you have created stay yours and remain accessible on the Free plan, only the speed and premium features stop.",
          },
          {
            q: "Which payment methods are supported?",
            a: "Right now, PayPal and bank transfer. Other options are coming, let us know if you need a specific method.",
          },
          {
            q: "What is the premium AI model?",
            a: "Every plan, including Free, uses a top tier AI model with deeper context understanding and more precise output. The structure, PRD, and tasks it produces hold up even for complex briefs. The difference with Pro is only the number of generates and the premium features.",
          },
        ]
      : [
          {
            q: "Apa yang dihitung sebagai satu generate?",
            a: "Satu brief yang kamu kirim sampai jadi plan lengkap: struktur, PRD, arsitektur, database schema, sampai task terurut. Revisi prompt agent tidak mengurangi kuota.",
          },
          {
            q: "Kapan kuota Free di-reset?",
            a: "Kuota dihitung rolling 24 jam. Setiap generate punya masa aktif sendiri, jadi begitu satu generate lewat 24 jam, slotnya terbuka lagi tanpa menunggu hari baru.",
          },
          {
            q: "Bisa berhenti langganan kapan saja?",
            a: "Bisa. Plan yang sudah kamu buat tetap milikmu dan tetap bisa diakses lewat akun Free, hanya kecepatan dan fitur premiumnya yang berhenti.",
          },
          {
            q: "Metode pembayaran apa yang didukung?",
            a: "Untuk sekarang pembayaran lewat PayPal dan transfer bank. Opsi lain menyusul, kabari kami kalau kamu butuh metode tertentu.",
          },
          {
            q: "Apa itu premium AI model?",
            a: "Semua paket, termasuk Free, memakai model AI kelas atas dengan pemahaman konteks yang lebih dalam dan hasil yang lebih presisi. Struktur, PRD, dan task yang dihasilkan matang untuk brief yang kompleks. Bedanya dengan Pro hanya di jumlah generate dan fitur premiumnya.",
          },
        ],

    finalTitle: en ? "Ready to build your first plan?" : "Siap bikin plan pertamamu?",
    finalSub: en
      ? "The Free plan gives you 3 generates per 24 hours. Enough to feel the whole pipeline before you decide anything."
      : "Paket Free kasih 3 generate per 24 jam. Cukup untuk ngerasain seluruh pipeline sebelum kamu mutusin apa pun.",
    finalCta: en ? "Start with the Free plan" : "Mulai dari paket Free",
    footer: en
      ? "© 2026 Scratch Agent. Hire your AI agent, start with the Free plan."
      : "© 2026 Scratch Agent. Hire your AI agent, mulai dari paket Free.",

    // Kartu paket (pricing-cards.tsx)
    billingLabel: en ? "Pick a billing cycle" : "Pilih siklus billing",
    month1: en ? "1 month" : "1 bulan",
    month3: en ? "3 months" : "3 bulan",
    saveBadge: en ? "save 20%" : "hemat 20%",
    popularBadge: en ? "most popular" : "paling populer",
    freeTagline: en ? "Light and fast" : "Ringan dan cepat",
    freeCta: en ? "Start with the Free plan" : "Mulai dengan paket Free",
    freeFeatures: en
      ? [
          { text: "Premium AI model" },
          { text: "3 plan generates per 24 hours" },
          { text: "Quick and lightweight PRD research" },
          { text: "Private plans in the cloud, forever" },
        ]
      : [
          { text: "Premium AI model" },
          { text: "3 generate plan per 24 jam" },
          { text: "PRD riset cepat dan ringan" },
          { text: "Plan privat di cloud, selamanya" },
        ],
    proTagline: en ? "Deep research and takes a long time" : "Riset mendalam dan butuh waktu lama",
    proCta: en ? "Upgrade to Pro" : "Upgrade ke Pro",
    proFeatures: en
      ? [
          { text: "Everything in the Free plan included" },
          { text: "Unlimited plan generates", highlight: true },
          { text: "Deeper PRD research: 10–15 phases, 8–12 sub-features, 15–25 tasks", highlight: true },
          { text: "Add ideas, or delete phases, sub-features, and tasks", highlight: true },
          { text: "Projects stored forever", highlight: true },
        ]
      : [
          { text: "Semua fitur dalam Free sudah termasuk" },
          { text: "Unlimited generate plan", highlight: true },
          { text: "PRD riset lebih dalam: 10–15 fase, 8–12 sub-fitur, 15–25 task", highlight: true },
          { text: "Tambah ide, atau delete fase, sub-fitur, dan task", highlight: true },
          { text: "Project disimpan selamanya", highlight: true },
        ],
    periodForever: en ? "forever" : "selamanya",
    periodMonth: en ? "per month" : "per bulan",
    periodQuarter: en ? "per 3 months" : "per 3 bulan",
  };
}
