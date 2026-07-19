# ExpertSudoku logo

Three concepts, designed in the platform's own visual system (rounded sudoku
tiles with gaps, night `#1b1b1e` / cell `#2f2f2f` surfaces, blurple `#5865F2`,
difficulty trio green `#23a55a` / amber `#f0b232` / red `#f23f43`).

## Concept 1 — "Daily Block" (in use)

A single 3×3 sudoku block in the app's tile language; the diagonal escalates
through the three difficulty colours. Reads as "one grid a day, pick your
pain" with zero letterforms; legible at 16px.

| File | Use |
| --- | --- |
| `expertsudoku-concept1-icon.svg` | Master. App icon / favicon / Discord app icon (dark rounded container). |
| `expertsudoku-concept1-mark.svg` | Transparent mark for inline use next to text (landing masthead). |
| `expertsudoku-concept1-avatar.svg` | Extra outer padding, full-bleed square: safe for CIRCLE crops (Discord profile picture). Rendered to `discord-avatar.png` (1024px) by `scripts/generate-logo-assets.mjs`. |
| `expertsudoku-concept1-horizontal.svg` | Icon + mono wordmark. Headers, docs, social banners. |
| `expertsudoku-concept1-vertical.svg` | Stacked lockup. Profile images, app stores. |
| `expertsudoku-concept1-mono-dark.svg` | Single-colour for LIGHT backgrounds / print. |
| `expertsudoku-concept1-mono-light.svg` | Single-colour for DARK backgrounds. |

## Concept 2 — "First Move" (alternative)

Same tile block, quieter: two grey givens + one blurple player move — the
redacted live-progress language. Platform-coloured rather than
difficulty-coloured. `expertsudoku-concept2-icon.svg`.

## Concept 3 — "The Pips" (alternative)

The three difficulty diamonds descending a diagonal — ties to the pip
iconography used in pickers and headers. Less obviously "sudoku".
`expertsudoku-concept3-icon.svg`.

## Generated assets

`node scripts/generate-logo-assets.mjs` renders the concept-1 master into
`public/logo192.png`, `public/logo512.png`, `public/favicon.ico` (PNG-in-ICO)
and copies `public/favicon.svg`. Re-run after editing the master SVG, and
keep `src/components/site/logo-mark.jsx` (the inline JSX twin of the mark)
in sync by hand.

## Rules

- Don't rotate, recolour, add effects, or change tile/gap proportions.
- Wordmark lockups use Spline Sans Mono (self-hosted in-app); standalone SVG
  viewers fall back to a generic mono - render lockups to PNG from a context
  with the font when pixel-perfect output matters.
- Minimum size for the icon: 16px. Use the mono variants when brand colours
  aren't available.
