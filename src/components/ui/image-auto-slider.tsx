"use client";

const cards = [
  { image: "/slider/Brief masuk, task graph keluar.jpg", title: "Brief masuk, task graph keluar", copy: "Ubah ide mentah menjadi rencana kerja yang bisa langsung dieksekusi." },
  { image: "/slider/Agent paham.jpg", title: "Agent paham konteks", copy: "PRD, dependensi, dan checkpoint tetap terbaca di setiap langkah." },
  { image: "/slider/Frontend dulu, backend menyusul.jpg", title: "Frontend dulu. Backend menyusul.", copy: "Urutan kerja deterministik. Tidak ada task yang lompat antrean." },
  { image: "/slider/Satu task per siklus.jpg", title: "Satu task per siklus", copy: "Agent bergerak fokus dengan status, retry, dan hasil yang jelas." },
  { image: "/slider/Progress yang terlihat.jpg", title: "Progress yang terlihat", copy: "Pantau misi berjalan tanpa kehilangan konteks di tengah jalan." },
  { image: "/slider/Ship dengan percaya diri.jpg", title: "Ship dengan percaya diri", copy: "Dari brief sampai selesai, semua langkah punya jejak." },
];

const duplicated = [...cards, ...cards];

export const ImageAutoSlider = () => (
    <div className="relative w-full overflow-hidden bg-[#0A0A0A] py-16 md:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_50%,rgba(116,250,106,.08),transparent_62%)]" />
    <div className="relative z-10 w-full">
        <div className="slider-mask w-full">
          <div className="flex w-max gap-2 md:gap-2.5" style={{ animation: "scroll-right 60s linear infinite" as never }}>
          {duplicated.map((card, i) => (
            <article key={i} className="slider-img group relative flex-shrink-0 w-[76vw] max-w-[284px] md:w-[27vw] md:max-w-[300px] lg:w-[19vw] lg:max-w-[304px] aspect-[.83] overflow-hidden rounded-[8px] border border-white/10 bg-[#0F1214]">
              <img src={card.image} alt="" className="slider-art size-full object-cover" loading="lazy" />
               <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(224,194,0,.28)_0%,rgba(103,205,40,.18)_34%,rgba(14,128,49,.12)_57%,rgba(4,13,9,.9)_100%)]" />
               <div className="absolute inset-0 bg-[linear-gradient(200deg,rgba(255,255,255,.18)_0%,rgba(255,255,255,.06)_30%,transparent_55%)]" />
               <div className="slider-grain pointer-events-none absolute inset-0 opacity-[.32] mix-blend-overlay" />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <h3 className="max-w-[12ch] text-[clamp(1.35rem,2.2vw,1.75rem)] font-medium leading-[1.08] tracking-[-.055em] text-[#F5F8F3]">{card.title}</h3>
                <p className="mt-4 max-w-[25ch] text-[12px] font-normal leading-[1.5] text-[#E1E9DF]">{card.copy}</p>
                <span className="mt-7 block text-[20px] leading-none text-[#E6F3E3]" aria-hidden="true">↗</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default ImageAutoSlider;
