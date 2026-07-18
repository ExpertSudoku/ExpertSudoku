#!/usr/bin/env node
// Renders the social preview (Open Graph) image, 1200x630, in the brand
// system: mono wordmark + tagline + the three difficulty wordmarks on the
// left, a redacted board bleeding off the right edge - the same tile
// language as the Discord banner (generate-discord-banner.mjs) and the
// live-progress images. Output: public/og-image.png, referenced from
// index.html's og:image/twitter:image tags. Re-run after design changes.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Resvg, initWasm } from '@resvg/resvg-wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
await initWasm(readFileSync(join(root, 'node_modules/@resvg/resvg-wasm/index_bg.wasm')));

const W = 1200, H = 630; // the OG/Twitter large-card standard size
const NIGHT = '#1b1b1e', EMPTY = '#2f2f2f', GIVEN = '#666666';
const BLURPLE = '#5865f2', INK = '#e6e6e6', DIM = '#8a8a8a';
const GREEN = '#23a55a', AMBER = '#f0b232', RED = '#f23f43';

// --- Right side: redacted 9x9 board, bleeding off the right edge --------
// Same decorative pattern as the Discord banner: fixed givens, a few
// blurple "player moves", the difficulty trio on the block diagonal.
const givens = new Set([2, 4, 10, 12, 16, 21, 25, 27, 33, 38, 42, 47, 53, 55, 59, 64, 68, 74, 76, 78]);
const moves = new Set([5, 19, 30, 49, 61, 66, 79]);
const trio = { 0: GREEN, 40: AMBER, 80: RED };

const tile = 48, gap = 5, blockGap = 12;
const boardSize = 9 * tile + 8 * gap + 2 * blockGap;
const bx = W - boardSize + 26; // slight bleed off the right edge
const by = Math.round((H - boardSize) / 2);

let board = '';
for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9;
    const x = bx + c * (tile + gap) + Math.floor(c / 3) * blockGap;
    const y = by + r * (tile + gap) + Math.floor(r / 3) * blockGap;
    const fill = trio[i] ?? (moves.has(i) ? BLURPLE : givens.has(i) ? GIVEN : EMPTY);
    board += `<rect x="${x}" y="${y}" width="${tile}" height="${tile}" rx="11" fill="${fill}" />`;
}

// --- Left side: wordmark, tagline, the three dailies ---------------------
// Small diamond pips before each difficulty wordmark (same motif as the
// site's pickers and the live-message headings).
function pips(x, y, count, fill, size = 11) {
    let out = '';
    for (let i = 0; i < count; i++) {
        const cx = x + i * (size + 7) + size / 2;
        out += `<path d="M ${cx} ${y - size / 2} l ${size / 2} ${size / 2} l ${-size / 2} ${size / 2} l ${-size / 2} ${-size / 2} Z" fill="${fill}" />`;
    }
    return out;
}

const LX = 84; // left column x
const rows = [
    { y: 434, accent: 'Medium', colour: GREEN, count: 1 },
    { y: 490, accent: 'Expert', colour: AMBER, count: 2 },
    { y: 546, accent: 'Hell', colour: RED, count: 3 },
];
const difficultyRows = rows.map(({ y, accent, colour, count }) =>
    pips(LX + 2, y - 11, count, colour) +
    `<text x="${LX + 62}" y="${y}" font-family="Spline Sans Mono" font-weight="700" font-size="34"><tspan fill="${colour}">${accent}</tspan><tspan fill="${DIM}">Sudoku</tspan></text>`
).join('\n  ');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${NIGHT}" />
  ${board}
  <text x="${LX - 2}" y="200" font-family="Spline Sans Mono" font-weight="700" font-size="82" letter-spacing="-1"><tspan fill="${BLURPLE}">Expert</tspan><tspan fill="${INK}">Sudoku</tspan></text>
  <text x="${LX}" y="268" font-family="Spline Sans Mono" font-weight="700" font-size="32" fill="${DIM}">One grid a day. Pick your pain.</text>
  ${difficultyRows}
</svg>`;

const resvg = new Resvg(svg, {
    font: {
        fontBuffers: [
            readFileSync(join(root, 'src/svg/logos/SplineSansMono-Bold.ttf')),
        ],
        loadSystemFonts: false,
        defaultFontFamily: 'Spline Sans Mono',
    },
    // 2x for crisp text on high-DPI link previews; consumers scale it down.
    fitTo: { mode: 'width', value: 2400 },
});
writeFileSync(join(root, 'public', 'og-image.png'), resvg.render().asPng());
console.log('wrote public/og-image.png');
