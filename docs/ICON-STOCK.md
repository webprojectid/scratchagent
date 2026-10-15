# Project and phase icon stock

The active product icon family is Tabler Outline. Project tiles, project switchers,
roadmap roots, phase cards, phase detail panels, PRD feature headings, and landing
demo phase entries use the same locally hosted SVG symbols. Icons use the existing
Scratch Agent text/green colors; they introduce no new palette.

## Sources

| Stock | Local assets | Source | License |
| --- | --- | --- | --- |
| Tabler Outline | 122 individual SVGs and one runtime sprite | https://github.com/tabler/tabler-icons | MIT |
| Iconoir Regular | 22 individual SVGs, reserved as design alternatives | https://github.com/iconoir-icons/iconoir | MIT |

Each source's copyright and license are retained in its `public/icons/<family>/LICENSE.txt`.
The exact revisions and SHA-256 hashes of individual SVG files are recorded in
`public/icons/catalog.json`. The runtime sprite uses 1.75px strokes on the original
24px grid. All files are served locally; no icon API, remote SVG, or new dependency
is needed during normal application use.

The original Flaticon reference is https://www.flaticon.com/black-outline-icons.
It remains a visual reference rather than a downloaded stock collection here.
Its free license requires visible attribution, and premium assets were not copied.
The previously linked Teenyicons repository returned 404 during collection, so
Iconoir was selected as the second available source.

## Usage

`StockIcon` accepts only names in `src/lib/stock-icon-catalog.ts`. `PhaseIcon`
selects a symbol from a phase's English or Indonesian title, using a valid stored
icon hint only when no category matches. Unknown names and legacy emoji use the
neutral sitemap fallback. The same phase therefore keeps the same symbol across
views and page reloads. Icon classification does not modify saved plans or call AI.

Use one family per visible interface. Iconoir files are stock for later review,
not mixed into the current roadmap. UI controls and the Scratch Agent brand mark
retain their established meaning and styling.

To reproduce this curated stock from its pinned upstream revisions, run
`node scripts/sync-icon-stock.mjs`. Downloads are checked for active SVG content
before saving. To add a new category, add its SVG to the curated source list,
regenerate the manifest, then update `phase-icons.ts`.
