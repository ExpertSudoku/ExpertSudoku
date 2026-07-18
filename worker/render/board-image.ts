import { ensureResvgReady, Resvg } from './resvg';
import { interFontBytes } from './font';

export type CellState = 'given' | 'filled' | 'empty';

// One player's redacted board, shown as a tile (up to 4 players playing at
// the same time), with the player's avatar next to it.
export type BoardTile = {
    cells: CellState[]; // length 81 - pattern only, never digit glyphs
    avatarPng: string; // base64-encoded PNG, see avatars.ts
};

// One leaderboard row: avatar plus that player's timing and status.
// 'done' draws a check icon after the time, 'inactive' (exited the activity
// or paused, without completing) a pause icon, 'active' no icon.
export type EntryStatus = 'active' | 'inactive' | 'done';

export type BoardEntry = {
    avatarPng: string;
    status: EntryStatus;
    seconds: number; // completion time if done, else (frozen) elapsed
};

export type BoardParams = {
    title: { number: number; difficulty: string }; // heading: "ExpertSudoku No.N — Label" + difficulty icon
    boards: BoardTile[]; // up to MAX_BOARDS, in display order
    entries: BoardEntry[]; // leaderboard column, in display order
};

export const MAX_BOARDS = 4;
const MAX_ENTRIES = 8;

// Given/empty are constant; player-FILLED cells use the difficulty's own
// accent colour (green/amber/red) rather than blurple, matching the picker
// rows and completed mini grids.
const GIVEN_COLOR = '#666666';
const EMPTY_COLOR = '#2f2f2f';
const FALLBACK_FILL = '#5865F2';

// The title brands each difficulty as its own daily: "MediumSudoku No.12",
// "ExpertSudoku No.12", "HellSudoku No.12".
const DIFFICULTY_META: Record<string, { name: string; color: string; pips: number }> = {
    medium: { name: 'MediumSudoku', color: '#23a55a', pips: 1 },
    expert: { name: 'ExpertSudoku', color: '#f0b232', pips: 2 },
    hell: { name: 'HellSudoku', color: '#f23f43', pips: 3 },
};

// Mini-board geometry.
const CELL_SIZE = 24;
const CELL_INSET = 2;
const CELL_RADIUS = 3;
const BLOCK_GAP = 4;
const BOARD_SIZE = 9 * CELL_SIZE + 2 * BLOCK_GAP; // 224

const TILE_AVATAR_SIZE = 36;
const TILE_AVATAR_GAP = 12; // between avatar and its board
const TILE_WIDTH = TILE_AVATAR_SIZE + TILE_AVATAR_GAP + BOARD_SIZE;
const TILE_GAP_X = 36;
const TILE_GAP_Y = 32;

const MARGIN = 40;

// Heading strip above the boards: difficulty icon + title text.
const HEADER_HEIGHT = 64;
const HEADER_FONT_SIZE = 30;
const PIP_SIZE = 11; // diamond "radius"
const PIP_GAP = 6;

// Leaderboard column.
const ROW_AVATAR_SIZE = 40;
const ROW_HEIGHT = 56;
const TIME_GAP = 14; // between row avatar and timing text
const TIME_FONT_SIZE = 22;
const TIME_WIDTH = 68; // reserved width; status icon sits behind it
const STATUS_ICON_SIZE = 18;
const LEADERBOARD_COL_WIDTH = ROW_AVATAR_SIZE + TIME_GAP + TIME_WIDTH + STATUS_ICON_SIZE + 8;
const LEADERBOARD_GAP = 48; // between the tile grid and the column

// Canvas adapts to the tile grid actually needed: 1 board -> one column,
// 1-2 boards -> one row, 3-4 boards -> full 2x2. The leaderboard column
// always sits to the right of the grid, the heading above everything.
function gridShape(boardCount: number): { cols: number; rows: number } {
    return {
        cols: boardCount <= 1 ? 1 : 2,
        rows: boardCount <= 2 ? 1 : 2,
    };
}

function canvasSize(boardCount: number): { width: number; height: number } {
    const { cols, rows } = gridShape(boardCount);
    return {
        width: MARGIN + cols * TILE_WIDTH + (cols - 1) * TILE_GAP_X + LEADERBOARD_GAP + LEADERBOARD_COL_WIDTH + MARGIN,
        height: MARGIN + HEADER_HEIGHT + rows * BOARD_SIZE + (rows - 1) * TILE_GAP_Y + MARGIN,
    };
}

function escapeAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatMMSS(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

function circleAvatar(
    id: string,
    avatarPng: string,
    cx: number,
    cy: number,
    size: number
): { def: string; node: string } {
    return {
        def: `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${size / 2}" /></clipPath>`,
        node: `<image href="data:image/png;base64,${escapeAttr(avatarPng)}" `
            + `x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" `
            + `clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice" />`,
    };
}

function diamond(cx: number, cy: number, r: number, fill: string): string {
    return `<path d="M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z" fill="${fill}" />`;
}

// Green check, drawn after a finished player's time (replaces the old green
// ring around the avatar).
function checkIcon(x: number, cy: number): string {
    const s = STATUS_ICON_SIZE;
    return `<path d="M ${x} ${cy} l ${s * 0.33} ${s * 0.33} l ${s * 0.6} ${-s * 0.66}" `
        + `fill="none" stroke="#23a55a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />`;
}

// Grey pause bars, drawn after the time of a player who left the activity
// (or paused) without completing.
function pauseIcon(x: number, cy: number): string {
    const h = STATUS_ICON_SIZE * 0.75;
    const y = cy - h / 2;
    return `<rect x="${x}" y="${y}" width="4.5" height="${h}" rx="2" fill="#8a8a8a" />`
        + `<rect x="${x + 8}" y="${y}" width="4.5" height="${h}" rx="2" fill="#8a8a8a" />`;
}

function renderHeader(title: BoardParams['title']): string {
    const meta = DIFFICULTY_META[title.difficulty] ?? { name: `${title.difficulty}Sudoku`, color: '#e6e6e6', pips: 1 };
    const cy = MARGIN + HEADER_HEIGHT / 2 - 8;
    const nodes: string[] = [];

    // Difficulty icon: 1-3 diamond pips in the difficulty's colour.
    let x = MARGIN + PIP_SIZE;
    for (let i = 0; i < meta.pips; i++) {
        nodes.push(diamond(x, cy, PIP_SIZE, meta.color));
        x += 2 * PIP_SIZE + PIP_GAP;
    }
    nodes.push(
        `<text x="${x + 6}" y="${cy}" dominant-baseline="middle" `
        + `font-family="Inter" font-size="${HEADER_FONT_SIZE}" fill="#e6e6e6">`
        + `${escapeText(`${meta.name} No.${title.number}`)}</text>`
    );
    return nodes.join('');
}

function cellFill(state: CellState, accent: string): string {
    if (state === 'given') {
        return GIVEN_COLOR;
    }
    if (state === 'filled') {
        return accent;
    }
    return EMPTY_COLOR;
}

function renderBoardCells(cells: CellState[], originX: number, originY: number, accent: string): string {
    return cells
        .map((state, i) => {
            const row = Math.floor(i / 9);
            const col = i % 9;
            const x = originX + col * CELL_SIZE + Math.floor(col / 3) * BLOCK_GAP;
            const y = originY + row * CELL_SIZE + Math.floor(row / 3) * BLOCK_GAP;
            const size = CELL_SIZE - CELL_INSET;
            return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${CELL_RADIUS}" fill="${cellFill(state, accent)}" />`;
        })
        .join('');
}

function renderTiles(boards: BoardTile[], accent: string, defs: string[], nodes: string[]): void {
    boards.slice(0, MAX_BOARDS).forEach((tile, i) => {
        const gridCol = i % 2;
        const gridRow = Math.floor(i / 2);
        const tileX = MARGIN + gridCol * (TILE_WIDTH + TILE_GAP_X);
        const tileY = MARGIN + HEADER_HEIGHT + gridRow * (BOARD_SIZE + TILE_GAP_Y);

        // Avatar sits to the left of its board, aligned with its top.
        const avatar = circleAvatar(
            `tile-avatar-${i}`,
            tile.avatarPng,
            tileX + TILE_AVATAR_SIZE / 2,
            tileY + TILE_AVATAR_SIZE / 2,
            TILE_AVATAR_SIZE
        );
        defs.push(avatar.def);
        nodes.push(avatar.node);
        nodes.push(renderBoardCells(tile.cells, tileX + TILE_AVATAR_SIZE + TILE_AVATAR_GAP, tileY, accent));
    });
}

function renderLeaderboard(entries: BoardEntry[], boardCount: number, canvasHeight: number, defs: string[], nodes: string[]): void {
    const { cols } = gridShape(boardCount);
    const colX = MARGIN + cols * TILE_WIDTH + (cols - 1) * TILE_GAP_X + LEADERBOARD_GAP;
    const topY = MARGIN + HEADER_HEIGHT;
    // Only as many rows as fit the (possibly shrunk) canvas.
    const maxRows = Math.min(MAX_ENTRIES, Math.floor((canvasHeight - topY - MARGIN + (ROW_HEIGHT - ROW_AVATAR_SIZE)) / ROW_HEIGHT));
    entries.slice(0, maxRows).forEach((entry, i) => {
        const cy = topY + ROW_AVATAR_SIZE / 2 + i * ROW_HEIGHT;
        const avatar = circleAvatar(`row-avatar-${i}`, entry.avatarPng, colX + ROW_AVATAR_SIZE / 2, cy, ROW_AVATAR_SIZE);
        defs.push(avatar.def);
        nodes.push(avatar.node);

        // Timing next to the avatar: green when finished, dimmed when
        // inactive, white while actively playing. Status icon behind it.
        const color = entry.status === 'done' ? '#23a55a' : entry.status === 'inactive' ? '#8a8a8a' : '#e6e6e6';
        const timeX = colX + ROW_AVATAR_SIZE + TIME_GAP;
        nodes.push(
            `<text x="${timeX}" y="${cy}" dominant-baseline="middle" `
            + `font-family="Inter" font-size="${TIME_FONT_SIZE}" fill="${color}">${formatMMSS(entry.seconds)}</text>`
        );
        const iconX = timeX + TIME_WIDTH;
        if (entry.status === 'done') {
            nodes.push(checkIcon(iconX, cy));
        } else if (entry.status === 'inactive') {
            nodes.push(pauseIcon(iconX, cy));
        }
    });
}

// Renders a heading (difficulty icon + "ExpertSudoku No.N — Label"), up to
// four players' redacted board patterns (given / player-filled / empty -
// never actual digit glyphs, so nobody's answers leak) in an adaptive tile
// grid, each with the player's avatar next to it, plus a right-hand
// leaderboard column of circle-clipped avatars with their timings and
// status icons (check = done, pause bars = inactive).
export async function renderBoardPng(params: BoardParams): Promise<Uint8Array> {
    await ensureResvgReady();

    const boardCount = Math.min(params.boards.length, MAX_BOARDS);
    const { width, height } = canvasSize(boardCount);
    const defs: string[] = [];
    const nodes: string[] = [];
    nodes.push(renderHeader(params.title));
    const accent = (DIFFICULTY_META[params.title.difficulty] ?? { color: FALLBACK_FILL }).color;
    renderTiles(params.boards, accent, defs, nodes);
    renderLeaderboard(params.entries, boardCount, height, defs, nodes);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`
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
