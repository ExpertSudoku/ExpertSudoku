import { and, eq, gt, isNotNull } from 'drizzle-orm';
import { getDb } from './db';
import { puzzles, progress, players, streaks } from '../db/schema';
import { utcDayString, addDaysToDayString, puzzleNumber } from './day';
import { sendImageMessage } from './discord';
import { fetchAvatarPng } from './render/avatars';
import { renderStreakLeaderboardPng } from './render/leaderboard-image';
// @ts-ignore - plain JS, dependency-free shared module
import { DIFFICULTIES } from '../shared/difficulties.js';

const DIFFICULTY_LABEL: Record<string, string> = {
    medium: 'Medium',
    expert: 'Expert',
    hell: 'Hell',
};

// Per-difficulty daily branding, matching the live board image's heading.
const DIFFICULTY_NAME: Record<string, string> = {
    medium: 'MediumSudoku',
    expert: 'ExpertSudoku',
    hell: 'HellSudoku',
};

type Completion = {
    playerId: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
    channelId: string;
    guildId: string | null;
    completionSeconds: number | null;
};

function contextIdOf(c: Pick<Completion, 'guildId' | 'channelId'>): string {
    return c.guildId ?? c.channelId;
}

function displayName(c: Completion): string {
    return c.globalName ?? c.username;
}

// Runs for `dayOverride ?? previous UTC day` - completions recorded after
// 00:05 UTC (this cron's schedule) miss that day's streak; accepted and
// documented rather than worked around.
export async function runDailyStreaks(env: Env, dayOverride?: string): Promise<void> {
    const day = dayOverride ?? addDaysToDayString(utcDayString(), -1);
    for (const difficulty of DIFFICULTIES) {
        await processDifficulty(env, day, difficulty);
    }
}

async function processDifficulty(env: Env, day: string, difficulty: string): Promise<void> {
    const db = getDb(env);

    const puzzleRows = await db
        .select()
        .from(puzzles)
        .where(and(eq(puzzles.day, day), eq(puzzles.difficulty, difficulty)))
        .limit(1);
    const puzzle = puzzleRows[0];

    let completions: Completion[] = [];
    if (puzzle) {
        completions = await db
            .select({
                playerId: progress.playerId,
                username: players.username,
                globalName: players.globalName,
                avatar: players.avatar,
                channelId: progress.channelId,
                guildId: progress.guildId,
                completionSeconds: progress.completionSeconds,
            })
            .from(progress)
            .innerJoin(players, eq(progress.playerId, players.id))
            .where(and(eq(progress.puzzleId, puzzle.id), isNotNull(progress.completedAt)));
    }

    const byContext = new Map<string, Completion[]>();
    for (const completion of completions) {
        const contextId = contextIdOf(completion);
        const list = byContext.get(contextId);
        if (list) {
            list.push(completion);
        } else {
            byContext.set(contextId, [completion]);
        }
    }

    for (const [contextId, group] of byContext) {
        await upsertAndAnnounce(env, db, day, difficulty, contextId, group);
    }

    // Any other active streak for this difficulty that saw no completion
    // today resets silently (no announcement).
    const activeStreaks = await db
        .select()
        .from(streaks)
        .where(and(eq(streaks.difficulty, difficulty), gt(streaks.length, 0)));
    for (const row of activeStreaks) {
        if (byContext.has(row.contextId)) {
            continue; // handled above
        }
        await db.update(streaks).set({ length: 0, updatedAt: new Date() }).where(eq(streaks.id, row.id));
    }
}

async function upsertAndAnnounce(
    env: Env,
    db: ReturnType<typeof getDb>,
    day: string,
    difficulty: string,
    contextId: string,
    group: Completion[]
): Promise<void> {
    const existingRows = await db
        .select()
        .from(streaks)
        .where(and(eq(streaks.contextId, contextId), eq(streaks.difficulty, difficulty)))
        .limit(1);
    const existing = existingRows[0];

    // Idempotent: if this day was already announced for this context, do
    // nothing (a rerun of the cron, or a manual retrigger, must not
    // double-increment or double-post).
    if (existing?.announcedDay === day) {
        return;
    }

    const sorted = [...group].sort((a, b) => (a.completionSeconds ?? 0) - (b.completionSeconds ?? 0));
    const fastest = sorted[0];
    const contextType = fastest.guildId ? 'guild' : 'channel';
    const previousDay = addDaysToDayString(day, -1);
    const newLength = existing?.lastCompletedDay === previousDay ? existing.length + 1 : 1;
    const now = new Date();

    await db
        .insert(streaks)
        .values({
            contextId,
            contextType,
            difficulty,
            length: newLength,
            lastCompletedDay: day,
            lastChannelId: fastest.channelId,
            announcedDay: day,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: [streaks.contextId, streaks.difficulty],
            set: {
                length: newLength,
                lastCompletedDay: day,
                lastChannelId: fastest.channelId,
                announcedDay: day,
                updatedAt: now,
            },
        });

    await announceStreak(env, { difficulty, day, length: newLength, channelId: fastest.channelId, completers: sorted });
}

async function announceStreak(
    env: Env,
    params: { difficulty: string; day: string; length: number; channelId: string; completers: Completion[] }
): Promise<void> {
    const { difficulty, day, length, channelId, completers } = params;
    const label = DIFFICULTY_LABEL[difficulty] ?? difficulty;
    const mentions = completers.map((c) => `<@${c.playerId}>`).join(', ');
    // "No.N" is the absolute daily puzzle number (fixed epoch, +1 per UTC
    // day), NOT the streak length - both appear here deliberately.
    const content =
        `🔥 **${label} streak: ${length} day${length === 1 ? '' : 's'}** — ${DIFFICULTY_NAME[difficulty] ?? difficulty} No.${puzzleNumber(day)}\n`
        + `Solved today by ${mentions}`;

    const top5 = completers.slice(0, 5);
    const entries = await Promise.all(
        top5.map(async (c) => ({
            avatarPng: await fetchAvatarPng(env, c.playerId, c.avatar),
            displayName: displayName(c),
            seconds: c.completionSeconds ?? 0,
        }))
    );
    const png = await renderStreakLeaderboardPng(entries);

    await sendImageMessage(env, channelId, content, png, 'streak.png');
}
