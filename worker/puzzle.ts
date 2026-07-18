import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { getDb } from './db';
import { puzzles } from '../db/schema';
import { utcDayString, puzzleNumber } from './day';
// @ts-ignore - plain JS, dependency-free shared module
import { isDifficulty } from '../shared/difficulties.js';

export const puzzleRoutes = new Hono<{ Bindings: Env }>();

// `import.meta.env.DEV` is statically replaced at build time (Vite builds
// the worker too), so in production the solution branch below is dead code -
// the solution column is neither selected nor sent, ever.
const IS_DEV = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);

// GET /api/puzzle/today?difficulty=medium|expert|hell
// Only day/difficulty/givens are ever selected here - `solution` must never
// appear in any API response, with ONE exception: development builds include
// it so the client's dev-only SOLVE button can fill the grid.
puzzleRoutes.get('/today', async (context) => {
    const difficulty = context.req.query('difficulty');
    if (!isDifficulty(difficulty)) {
        return context.json({ error: 'bad-difficulty' }, 400);
    }

    const day = utcDayString();
    const db = getDb(context.env);
    const rows = await db
        .select({
            day: puzzles.day,
            difficulty: puzzles.difficulty,
            givens: puzzles.givens,
            ...(IS_DEV ? { solution: puzzles.solution } : {}),
        })
        .from(puzzles)
        .where(and(eq(puzzles.day, day), eq(puzzles.difficulty, difficulty)))
        .limit(1);

    const row = rows[0];
    if (!row) {
        return context.json({ error: 'no-puzzle' }, 404);
    }
    return context.json({ ...row, number: puzzleNumber(row.day) });
});

// GET /api/puzzle/meta -> {day, number} for the current UTC day. Used by
// the landing page to filter already-completed difficulties (the client
// never computes "today" itself).
puzzleRoutes.get('/meta', (context) => {
    const day = utcDayString();
    return context.json({ day, number: puzzleNumber(day) });
});
