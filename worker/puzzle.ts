import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { getDb } from './db';
import { puzzles } from '../db/schema';
import { utcDayString } from './day';
// @ts-ignore - plain JS, dependency-free shared module
import { isDifficulty } from '../shared/difficulties.js';

export const puzzleRoutes = new Hono<{ Bindings: Env }>();

// GET /api/puzzle/today?difficulty=medium|expert|hell
// Only day/difficulty/givens are ever selected here - `solution` must never
// appear in any API response (the client derives the final digits itself
// via findSolutions, same as the original sudoku-web-app did).
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
        })
        .from(puzzles)
        .where(and(eq(puzzles.day, day), eq(puzzles.difficulty, difficulty)))
        .limit(1);

    const row = rows[0];
    if (!row) {
        return context.json({ error: 'no-puzzle' }, 404);
    }
    return context.json(row);
});
