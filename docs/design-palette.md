# ScratchAgent color system

Scratch Green is the only UI accent. Dark mode remains the default. Light mode uses neutral off-white surfaces, charcoal text and a darker green for readable links and buttons. Red is reserved for errors and destructive actions. Status labels and icons remain meaningful without relying on color alone.

| Role | Dark | Light |
| --- | --- | --- |
| Page | #0D1110 | #F3F4F1 |
| Surface | #151B17 | #FCFCFA |
| Raised surface | #202821 | #E7EBE4 |
| Main text | #E9EDED | #202720 |
| Secondary text | #A8B2A9 | #566157 |
| Border | #354039 | #CDD4C9 |
| Strong border | #6A786D | #7B8877 |
| Brand / focus / action | #74FA6A | #267A36 |
| Action hover | #A5EF7D | #1D612B |
| Text on action | #0A1A10 | #FCFCFA |
| Selected surface | #253422 | #E3EDDF |
| Error / destructive | #F18B82 | #B33131 |
| Text on destructive | #24100F | #FCFCFA |
| Chart 1 | #74FA6A | #267A36 |
| Chart 2 | #50AF49 | #4C8B46 |
| Chart 3 | #388633 | #6D9560 |
| Chart 4 | #8B9B8D | #8B9B8D |

## Usage

- Canonical tokens live in `src/app/color-styles.css`. Components use semantic Tailwind colors or the same CSS variables.
- Theme selectors target the HTML element, so component classes named light or dark do not change their theme.
- Appearance is selected in Settings and saved in account display preferences. Existing blue, violet, amber and rose choices migrate to Scratch Green without discarding other preferences.
- Canvas and WebGL colors resolve the same tokens before passing them to drawing APIs.
- Diagrams, project badges, CLI tokens, dashboard statistics and marketing previews use the same palette.
- Chart shades distinguish series; labels and different geometry also carry meaning.
- Photographs and third-party rendered media are content, rather than UI palette tokens.
- The palette contrast tests cover text, secondary copy, links, action labels and error text in both modes.
