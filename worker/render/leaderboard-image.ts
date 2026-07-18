import { ensureResvgReady, Resvg } from './resvg';
import { interFontBytes } from './font';

export type LeaderboardEntry = {
    avatarPng: string; // base64-encoded PNG, see avatars.ts
    displayName: string;
    seconds: number;
};

const CANVAS_WIDTH = 600;
const ROW_HEIGHT = 76;
const TOP_MARGIN = 32;
const BOTTOM_MARGIN = 32;
const MAX_ROWS = 5;

const AVATAR_SIZE = 48;
const AVATAR_X = 40;
const NAME_X = 108;
const TIME_X = CANVAS_WIDTH - 40;

function escapeText(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatMMSS(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

// Top-5 rows: avatar circle, display name, MM:SS completion time. Shares the
// board image's dark palette; needs a bundled font since (unlike the board
// image) it has text.
export async function renderStreakLeaderboardPng(entries: LeaderboardEntry[]): Promise<Uint8Array> {
    await ensureResvgReady();

    const rows = entries.slice(0, MAX_ROWS);
    const canvasHeight = TOP_MARGIN + BOTTOM_MARGIN + rows.length * ROW_HEIGHT;

    const defs: string[] = [];
    const nodes: string[] = [];

    rows.forEach((entry, i) => {
        const rowY = TOP_MARGIN + i * ROW_HEIGHT;
        const cy = rowY + ROW_HEIGHT / 2;
        const cx = AVATAR_X + AVATAR_SIZE / 2;
        const clipId = `leader-avatar-clip-${i}`;

        defs.push(`<clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${AVATAR_SIZE / 2}" /></clipPath>`);
        nodes.push(
            `<image href="data:image/png;base64,${entry.avatarPng}" `
            + `x="${cx - AVATAR_SIZE / 2}" y="${cy - AVATAR_SIZE / 2}" `
            + `width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" `
            + `clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice" />`
        );
        nodes.push(
            `<text x="${NAME_X}" y="${cy}" dominant-baseline="middle" `
            + `font-family="Inter" font-size="26" fill="#e6e6e6">${escapeText(entry.displayName)}</text>`
        );
        nodes.push(
            `<text x="${TIME_X}" y="${cy}" dominant-baseline="middle" text-anchor="end" `
            + `font-family="Inter" font-size="26" fill="#5865F2">${formatMMSS(entry.seconds)}</text>`
        );
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${canvasHeight}">`
        + `<rect width="100%" height="100%" fill="#242424" />`
        + `<defs>${defs.join('')}</defs>`
        + nodes.join('')
        + `</svg>`;

    const resvg = new Resvg(svg, {
        font: {
            fontBuffers: [interFontBytes()],
            loadSystemFonts: false,
            defaultFontFamily: 'Inter',
        },
        fitTo: { mode: 'original' },
    });
    const rendered = resvg.render();
    return rendered.asPng();
}
