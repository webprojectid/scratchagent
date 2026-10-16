# Scratch Agent logo

The approved mark is the green symbol supplied on 16 October 2026. The five shapes and open channels are the brand identity; the checkerboard in the supplied bitmap is background, not artwork.

- `src/lib/brand-mark.ts` holds the shared UI geometry. `BrandMark` renders it at each existing logo location.
- `public/brand/scratch-agent-mark.svg` is the transparent downloadable vector. The 2048-pixel PNG is rendered from this SVG with real alpha.
- `public/brand/scratch-agent-icon.svg` and its PNG sizes center the same symbol on a transparent square for browser and device icons. `/favicon.svg` also serves the new mark for old references.
- The legacy favicon lives in `public/favicon.svg`: `favicon.svg` is not a supported Next.js app-directory convention, so keeping it in `src/app` would return 404.
- The mark uses `#49ff14`, sampled from the supplied green. Existing page palettes, type, controls, and navigation remain in place.

Design read: a focused brand replacement within the existing dark product interface. ENERGY 2 / RHYTHM 2 / MOTION 1 for this change. Preserve the existing logo slots and page hierarchy; add no animation to a static identity asset. The vector keeps the mark crisp at navbar and favicon sizes, and a shared component prevents separate logo versions from drifting.

Background extraction was attempted with the built-in imagegen tool. The prompt requested removal of the checkerboard, preservation of the exact silhouette and green, and genuine alpha with no background, texture, shadow, or glow. Those generated drafts had edge residue and were rejected. The shipped assets use a clean repo-native SVG trace of the supplied logo instead; the PNGs are raster exports of that vector.

## Verification

- Hard Gate PASS (changed logo surfaces): requested source identity, decorative SVGs hidden from assistive technology, real PNG alpha, no added text or controls. Navbar and login checked at 1280px and 390px; no horizontal overflow. Mobile menu opens and closes with the new mark.
- Purpose Gate PASS: the existing approved identity supplies the shape and green. Static SVG avoids blur at small sizes; no decorative effects or motion were added.
- Liveliness PASS: the declared dials preserve the existing page composition and use the supplied mark as the repeated identity motif.
- Craftsmanship PASS: independent source review found all eight legacy UI variants replaced. Shared navigation covers home, pricing, docs, solutions, and every website sample page. Text-only identities and other products' logos stay as they were.
- Production build and TypeScript passed. Lint reports 228 unchanged existing findings and zero new findings; its baseline was not changed. Credential scan found zero findings.
- Local HTTP checks passed for pricing, docs, solutions, website samples, login, icon assets, and the transparent 2K PNG. The existing share-preview check passed for all seven crawler agents and legacy image URLs.

The local production-mode preview cannot verify authenticated account flows: its existing Auth.js host trust and Cloudflare captcha configuration reject localhost. Account mark replacement was reviewed in source and compiled in the production build; authentication settings were not changed for this visual update.
