// UTC day string, computed server-side ONLY - clients never compute dates
// (see the "Cross-cutting gotchas" in the implementation plan).
export function utcDayString(d: Date = new Date()): string {
    return d.toISOString().slice(0, 10);
}

// Adds (or subtracts, for negative n) whole days to a "YYYY-MM-DD" string,
// staying in UTC throughout.
export function addDaysToDayString(day: string, n: number): string {
    const d = new Date(day + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return utcDayString(d);
}

// Day of the first ever daily puzzle - puzzle #1. The user-facing puzzle
// number shown in live messages and streak announcements is an absolute
// counter derived from this fixed epoch (NOT related to any streak length),
// so it increments by exactly 1 per UTC day everywhere at once.
export const PUZZLE_EPOCH_DAY = '2026-07-18';

export function puzzleNumber(day: string): number {
    const epochMs = Date.parse(PUZZLE_EPOCH_DAY + 'T00:00:00Z');
    const dayMs = Date.parse(day + 'T00:00:00Z');
    return Math.round((dayMs - epochMs) / 86_400_000) + 1;
}
