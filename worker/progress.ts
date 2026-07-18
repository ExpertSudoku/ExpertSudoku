import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { getDb } from './db';
import { puzzles, progress } from '../db/schema';
import { utcDayString } from './day';
import { requireSession, SessionVariables } from './session';
import { scheduleLiveMessageUpdate } from './live-message';
// @ts-ignore - plain JS, dependency-free shared module
import { isDifficulty } from '../shared/difficulties.js';

export const progressRoutes = new Hono<{ Bindings: Env; Variables: SessionVariables }>();

progressRoutes.use('*', requireSession);

// GET /api/progress?difficulty= -> {state: puzzleState|null, completedAt: ms|null}
// for today's puzzle x the session's player.
progressRoutes.get('/', async (context) => {
    const difficulty = context.req.query('difficulty');
    if (!isDifficulty(difficulty)) {
        return context.json({ error: 'bad-difficulty' }, 400);
    }

    const session = context.get('session');
    const day = utcDayString();
    const db = getDb(context.env);

    const puzzleRows = await db
        .select({ id: puzzles.id })
        .from(puzzles)
        .where(and(eq(puzzles.day, day), eq(puzzles.difficulty, difficulty)))
        .limit(1);
    const puzzle = puzzleRows[0];
    if (!puzzle) {
        return context.json({ error: 'no-puzzle' }, 404);
    }

    const progressRows = await db
        .select()
        .from(progress)
        .where(and(eq(progress.playerId, session.sub), eq(progress.puzzleId, puzzle.id)))
        .limit(1);
    const row = progressRows[0];
    if (!row) {
        return context.json({ state: null, completedAt: null, completionSeconds: null });
    }

    return context.json({
        state: JSON.parse(row.state),
        completedAt: row.completedAt ? row.completedAt.getTime() : null,
        completionSeconds: row.completionSeconds,
    });
});

function isValidDigitsString(value: unknown): value is string {
    return typeof value === 'string' && /^[0-9]{81}$/.test(value);
}

// POST /api/progress {difficulty, state, currentDigits, elapsedMs, paused, completed}
// -> {ok, completedAt}
progressRoutes.post('/', async (context) => {
    const body = await context.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        return context.json({ error: 'bad-request' }, 400);
    }
    const { difficulty, state, currentDigits, elapsedMs, paused } = body as {
        difficulty?: string;
        state?: unknown;
        currentDigits?: string;
        elapsedMs?: number;
        paused?: boolean;
    };
    if (!isDifficulty(difficulty)) {
        return context.json({ error: 'bad-difficulty' }, 400);
    }
    if (!isValidDigitsString(currentDigits)) {
        return context.json({ error: 'bad-digits' }, 400);
    }
    if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs) || elapsedMs < 0) {
        return context.json({ error: 'bad-elapsed-ms' }, 400);
    }

    const session = context.get('session');
    const day = utcDayString();
    const db = getDb(context.env);

    const puzzleRows = await db
        .select()
        .from(puzzles)
        .where(and(eq(puzzles.day, day), eq(puzzles.difficulty, difficulty)))
        .limit(1);
    const puzzle = puzzleRows[0];
    if (!puzzle) {
        return context.json({ error: 'no-puzzle' }, 404);
    }

    // Every given position must be unchanged - reject anything that doesn't
    // match (this also implicitly rejects digit strings for the wrong puzzle).
    for (let i = 0; i < 81; i++) {
        if (puzzle.givens[i] !== '0' && currentDigits[i] !== puzzle.givens[i]) {
            return context.json({ error: 'given-mismatch' }, 400);
        }
    }

    const existingRows = await db
        .select()
        .from(progress)
        .where(and(eq(progress.playerId, session.sub), eq(progress.puzzleId, puzzle.id)))
        .limit(1);
    const existing = existingRows[0];

    // Completion is server-decided and sticky: once completedAt is set for
    // this (player, puzzle), further writes are ignored outright - this is
    // what makes a "regress" attempt after solving a no-op.
    if (existing?.completedAt) {
        return context.json({ ok: true, completedAt: existing.completedAt.getTime() });
    }

    let correctCount = 0;
    for (let i = 0; i < 81; i++) {
        if (puzzle.givens[i] === '0' && currentDigits[i] === puzzle.solution[i]) {
            correctCount++;
        }
    }
    const justCompleted = currentDigits === puzzle.solution;
    const now = new Date();

    const values = {
        playerId: session.sub,
        puzzleId: puzzle.id,
        channelId: session.chan,
        guildId: session.guild,
        state: JSON.stringify(state ?? null),
        currentDigits,
        correctCount,
        elapsedMs: Math.round(elapsedMs),
        paused: !!paused,
        completedAt: justCompleted ? now : null,
        completionSeconds: justCompleted ? Math.floor(elapsedMs / 1000) : null,
        updatedAt: now,
    };

    await db
        .insert(progress)
        .values(values)
        .onConflictDoUpdate({
            target: [progress.playerId, progress.puzzleId],
            set: {
                channelId: values.channelId,
                guildId: values.guildId,
                state: values.state,
                currentDigits: values.currentDigits,
                correctCount: values.correctCount,
                elapsedMs: values.elapsedMs,
                paused: values.paused,
                completedAt: values.completedAt,
                completionSeconds: values.completionSeconds,
                updatedAt: values.updatedAt,
            },
        });

    // Immediate update + deferred passes (dirty flush, leaver sweep) so the
    // live image reaches its final state even if this was the player's last
    // request before closing the activity.
    scheduleLiveMessageUpdate(context.env, context.executionCtx, {
        channelId: session.chan,
        guildId: session.guild,
        day,
        difficulty,
        force: justCompleted,
    });

    return context.json({ ok: true, completedAt: justCompleted ? now.getTime() : null });
});
