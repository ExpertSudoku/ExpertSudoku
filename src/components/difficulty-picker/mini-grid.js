// Deterministic FALLBACK patterns for the difficulty picker rows - shown
// only while today's real givens (fetched from /api/puzzle/meta) are
// loading, or if that fetch fails.
//
// The clue counts are truthful: they match the seed generator's carving
// targets (scripts/generate-puzzles.mjs) - Medium really does hand you far
// more givens than Hell, and the picker wears that difference instead of
// describing it. Givens are placed in symmetric pairs (i, 80 - i), the same
// symmetry the real carver preserves.

const GIVEN_COUNTS = {
    medium: 38,
    expert: 30,
    hell: 24,
};

// mulberry32 - tiny seeded PRNG, so the patterns are stable across renders
// and builds (no hydration flicker, no layout jumping between visits).
function mulberry32(seed) {
    let a = seed;
    return function next() {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function buildPattern(seed, givenCount) {
    const rand = mulberry32(seed);
    const given = new Array(81).fill(false);
    let placed = 0;
    while (placed < givenCount) {
        const i = Math.floor(rand() * 41); // 0..40: pick from the first half + centre
        if (given[i]) {
            continue;
        }
        given[i] = true;
        placed++;
        const mirror = 80 - i;
        if (mirror !== i && placed < givenCount) {
            given[mirror] = true;
            placed++;
        }
    }
    return given;
}

// difficulty -> boolean[81], true = given cell.
export const MINI_GRID_PATTERNS = {
    medium: buildPattern(11, GIVEN_COUNTS.medium),
    expert: buildPattern(23, GIVEN_COUNTS.expert),
    hell: buildPattern(47, GIVEN_COUNTS.hell),
};
