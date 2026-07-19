#!/usr/bin/env node
// Renders the Discord bot/app profile banner (5:2, 1360x544) in the brand
// system: logo mark + mono wordmark + tagline on the left, a redacted board
// bleeding off the right edge - the same tile language as the live-progress
// images. Output: src/svg/logos/discord-banner.png (uploaded manually in
// the Discord developer portal).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Resvg, initWasm } from '@resvg/resvg-wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
await initWasm(readFileSync(join(root, 'node_modules/@resvg/resvg-wasm/index_bg.wasm')));

const W = 1360, H = 480; // 2x Discord bot profile banner (680x240, 17:6)
const NIGHT = '#1b1b1e', EMPTY = '#2f2f2f', GIVEN = '#666666';
const BLURPLE = '#5865f2', INK = '#e6e6e6', DIM = '#8a8a8a';
const GREEN = '#23a55a', AMBER = '#f0b232', RED = '#f23f43';

// --- Right side: redacted 9x9 board, bleeding off the right edge --------
// Pattern picked for looks: given cells from a fixed set, a few blurple
// "player moves", and the difficulty trio on the block diagonal.
const givens = new Set([2, 4, 10, 12, 16, 21, 25, 27, 33, 38, 42, 47, 53, 55, 59, 64, 68, 74, 76, 78]);
const moves = new Set([5, 19, 30, 49, 61, 66, 79]);
const trio = { 0: GREEN, 40: AMBER, 80: RED };

const tile = 42, gap = 5, blockGap = 12;
const boardSize = 9 * tile + 8 * gap + 2 * blockGap;
const bx = W - boardSize + 22; // slight bleed off the right edge (red trio tile stays half-visible)
const by = Math.round((H - boardSize) / 2);

let board = '';
for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9;
    const x = bx + c * (tile + gap) + Math.floor(c / 3) * blockGap;
    const y = by + r * (tile + gap) + Math.floor(r / 3) * blockGap;
    const fill = trio[i] ?? (moves.has(i) ? BLURPLE : givens.has(i) ? GIVEN : EMPTY);
    board += `<rect x="${x}" y="${y}" width="${tile}" height="${tile}" rx="10" fill="${fill}" />`;
}

// --- Bottom middle: the three dailies (same rows as the og image), in the
// gap between Discord's avatar overlay (bottom-left corner of the banner in
// the client UI) and the board on the right. ---------------------------
function pips(x, y, count, fill, size = 11) {
    let out = '';
    for (let i = 0; i < count; i++) {
        const cx = x + i * (size + 7) + size / 2;
        out += `<path d="M ${cx} ${y - size / 2} l ${size / 2} ${size / 2} l ${-size / 2} ${size / 2} l ${-size / 2} ${-size / 2} Z" fill="${fill}" />`;
    }
    return out;
}

const ROWS_X = 500; // clear of the (large) avatar overlay in the bottom-left
const difficultyRows = [
    { y: 310, accent: 'Medium', colour: GREEN, count: 1 },
    { y: 365, accent: 'Expert', colour: AMBER, count: 2 },
    { y: 420, accent: 'Hell', colour: RED, count: 3 },
].map(({ y, accent, colour, count }) =>
    pips(ROWS_X + 2, y - 10, count, colour) +
    `<text x="${ROWS_X + 62}" y="${y}" font-family="Spline Sans Mono" font-weight="700" font-size="30"><tspan fill="${colour}">${accent}</tspan><tspan fill="${DIM}">Sudoku</tspan></text>`
).join('\n  ');

// --- Left side: wordmark + tagline, anchored top-left (no logo mark) -----
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${NIGHT}" />
  ${board}
  <text x="98" y="160" font-family="Spline Sans Mono" font-weight="700" font-size="78" letter-spacing="-1"><tspan fill="${BLURPLE}">Expert</tspan><tspan fill="${INK}">Sudoku</tspan></text>
  <text x="100" y="222" font-family="Spline Sans Mono" font-weight="700" font-size="30" fill="${DIM}">One grid a day. Pick your pain.</text>
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
    // 4x the 680x240 Discord banner spec - layout is defined at 2x (1360x480)
    // and scaled up losslessly here (it's all vectors).
    fitTo: { mode: 'width', value: 2720 },
});
writeFileSync(join(root, 'src/svg/logos/discord-banner.png'), resvg.render().asPng());
writeFileSync(join(root, 'src/svg/logos/discord-banner.svg'), svg);
console.log('wrote src/svg/logos/discord-banner.png (+.svg)');
