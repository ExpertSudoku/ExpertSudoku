import { ButtonStyle, ComponentType } from 'discord-api-types/v10';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from './db';
import { puzzles, progress, players, liveMessages } from '../db/schema';
import { renderBoardPng, CellState, EntryStatus, MAX_BOARDS } from './render/board-image';
import { fetchAvatarPng } from './render/avatars';
import { sendImageMessage, editImageMessage, sendWebhookImageMessage, editWebhookImageMessage, MessageComponent } from './discord';
import { puzzleNumber } from './day';
import { DIFFICULTIES } from '../shared/difficulties.js';

const EDIT_THROTTLE_MS = 5000;

// A non-completed player whose progress hasn't been saved for this long is
// treated as having left the activity (or paused): their time freezes and
// gets a pause icon. The client autosaves every couple of seconds while
// actively playing. Must stay below LEAVER_SWEEP_DELAY_MS so the sweep a
// request schedules can actually observe the requester as inactive.
const INACTIVE_AFTER_MS = 20_000;

// Deferred passes scheduled alongside every progress write (waitUntil keeps
// the worker alive up to ~30s past the response, so both fit):
//  - the flush retries just after the edit-throttle window, so a write that
//    only set `dirty` still repaints even if the player leaves immediately;
//  - the sweep repaints once more after the inactivity threshold, so a
//    player who left shows frozen time + pause icon without needing any
//    further requests from anyone.
const DIRTY_FLUSH_DELAY_MS = EDIT_THROTTLE_MS + 1000;
const LEAVER_SWEEP_DELAY_MS = 25_000;

// If the tracked message hasn't been painted for this long, the next update
// SENDS a fresh message instead of editing - after a long lull the old one
// is buried up-thread, and a repost puts the board (and its play buttons)
// back at the bottom of the channel. The old message stays as a frozen
// snapshot; the row simply tracks the new id from then on.
const REPOST_AFTER_MS = 10 * 60 * 1000;

// Interaction webhook tokens are valid for 15 minutes; treat them as usable
// slightly shorter so an edit/send never races the hard expiry.
const INTERACTION_TOKEN_FRESH_MS = 14 * 60 * 1000;

// The last stretch of a webhook token's usable life. A webhook-authored
// message becomes unpaintable at token expiry, so any pass landing in this
// window paints the message's FINAL presentation: every non-completed player
// frozen to the pause icon and a line of message text saying live updates
// have stopped (the buttons underneath are the way to re-arm - a press banks
// a fresh token). While a player is actively playing, saves arrive every ~2s
// and each schedules a pass, so at least one is guaranteed to land in this
// window; a player who stopped saving earlier was already frozen by the
// leaver sweep. Token age only grows, so once finalized every later paint
// (if any lands before expiry) is finalized too - fresher data, same frozen
// presentation.
const FINAL_PAINT_WINDOW_MS = 60_000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const DIFFICULTY_LABEL: Record<string, string> = {
    medium: 'Medium',
    expert: 'Expert',
    hell: 'Hell',
};

type ParticipantRow = {
    playerId: string;
    correctCount: number;
    elapsedMs: number;
    paused: boolean;
    completedAt: Date | null;
    completionSeconds: number | null;
    currentDigits: string;
    updatedAt: Date;
    avatar: string | null;
};

function sortParticipants(rows: ParticipantRow[]): ParticipantRow[] {
    // Completed players rank first (fastest completion first); everyone
    // else ranks by correctCount (most correct cells first).
    return [...rows].sort((a, b) => {
        const aDone = !!a.completedAt;
        const bDone = !!b.completedAt;
        if (aDone !== bDone) {
            return aDone ? -1 : 1;
        }
        if (aDone && bDone) {
            return (a.completionSeconds ?? 0) - (b.completionSeconds ?? 0);
        }
        return b.correctCount - a.correctCount;
    });
}

// 'done' if completed; 'inactive' if paused or no save for
// INACTIVE_AFTER_MS (left the activity without completing); else 'active'.
// A finalizing paint (see FINAL_PAINT_WINDOW_MS) forces every non-completed
// player to 'inactive' - nothing can repaint after it, so nobody may be
// left looking live forever.
function entryStatus(row: ParticipantRow, finalizing: boolean): EntryStatus {
    if (row.completedAt) {
        return 'done';
    }
    if (finalizing || row.paused || Date.now() - row.updatedAt.getTime() > INACTIVE_AFTER_MS) {
        return 'inactive';
    }
    return 'active';
}

// Frozen for done/inactive players; counting up (from the last save) only
// while actively playing.
function entrySeconds(row: ParticipantRow, status: EntryStatus): number {
    if (status === 'done') {
        return row.completionSeconds ?? 0;
    }
    if (status === 'inactive') {
        return Math.floor(row.elapsedMs / 1000);
    }
    return Math.floor((row.elapsedMs + Math.max(0, Date.now() - row.updatedAt.getTime())) / 1000);
}

// "Play now" button for the message's own difficulty (primary/blurple),
// plus direct-entry buttons for the other two difficulties. custom_ids are
// handled by worker/interactions.ts, which records the choice and responds
// with LAUNCH_ACTIVITY.
function buildComponents(difficulty: string): MessageComponent[] {
    const others = DIFFICULTIES.filter((d) => d !== difficulty);
    return [{
        type: ComponentType.ActionRow,
        components: [
            { type: ComponentType.Button, style: ButtonStyle.Primary, label: 'Play now', custom_id: `play:${difficulty}` },
            ...others.map((d) => ({
                type: ComponentType.Button as const,
                style: ButtonStyle.Secondary,
                label: `Try ${DIFFICULTY_LABEL[d] ?? d}`,
                custom_id: `play:${d}`,
            })),
        ],
    }];
}

function boardCells(givens: string, currentDigits: string): CellState[] {
    const cells: CellState[] = [];
    for (let i = 0; i < 81; i++) {
        if (givens[i] !== '0') {
            cells.push('given');
        } else if (currentDigits[i] !== '0') {
            cells.push('filled');
        } else {
            cells.push('empty');
        }
    }
    return cells;
}

export async function maybeUpdateLiveMessage(
    env: Env,
    params: {
        channelId: string;
        guildId: string | null;
        day: string;
        difficulty: string;
        force: boolean;
    }
): Promise<void> {
    const { channelId, day, difficulty, force } = params;
    const db = getDb(env);

    const puzzleRows = await db
        .select()
        .from(puzzles)
        .where(and(eq(puzzles.day, day), eq(puzzles.difficulty, difficulty)))
        .limit(1);
    const puzzle = puzzleRows[0];
    if (!puzzle) {
        return;
    }

    // Ensure a liveMessages row exists, then read it (upsert-select).
    await db
        .insert(liveMessages)
        .values({ channelId, day, difficulty, messageId: null, lastEditAt: null, dirty: false })
        .onConflictDoNothing();
    const liveMsgRows = await db
        .select()
        .from(liveMessages)
        .where(and(eq(liveMessages.channelId, channelId), eq(liveMessages.day, day), eq(liveMessages.difficulty, difficulty)))
        .limit(1);
    const liveMsg = liveMsgRows[0];
    if (!liveMsg) {
        return;
    }

    if (!force && liveMsg.lastEditAt && Date.now() - liveMsg.lastEditAt.getTime() < EDIT_THROTTLE_MS) {
        await db.update(liveMessages).set({ dirty: true }).where(eq(liveMessages.id, liveMsg.id));
        return;
    }

    // Claim this paint window atomically BEFORE the slow work (render +
    // Discord call take seconds; progress saves arrive every ~2s and each
    // schedules a pass): only the pass that flips lastEditAt from the exact
    // value it read gets to paint. Without this, every pass that starts
    // while lastEditAt is stale takes the send path and posts its own
    // message (duplicated boards after every >10min lull, and on racing
    // first sends). Losers mark the row dirty so the deferred flush
    // repaints with the newest data once the throttle window passes.
    const claim = await db
        .update(liveMessages)
        .set({ lastEditAt: new Date() })
        .where(and(
            eq(liveMessages.id, liveMsg.id),
            liveMsg.lastEditAt
                ? eq(liveMessages.lastEditAt, liveMsg.lastEditAt)
                : isNull(liveMessages.lastEditAt),
        ));
    if (claim.meta.changes === 0) {
        await db.update(liveMessages).set({ dirty: true }).where(eq(liveMessages.id, liveMsg.id));
        return;
    }

    const participantRows = await db
        .select({
            playerId: progress.playerId,
            correctCount: progress.correctCount,
            elapsedMs: progress.elapsedMs,
            paused: progress.paused,
            completedAt: progress.completedAt,
            completionSeconds: progress.completionSeconds,
            currentDigits: progress.currentDigits,
            updatedAt: progress.updatedAt,
            avatar: players.avatar,
        })
        .from(progress)
        .innerJoin(players, eq(progress.playerId, players.id))
        .where(and(eq(progress.puzzleId, puzzle.id), eq(progress.channelId, channelId)));

    if (participantRows.length === 0) {
        // Nothing to show yet - leave the message (if any) as-is.
        return;
    }

    const sorted = sortParticipants(participantRows);

    const tokenAgeMs = liveMsg.interactionToken && liveMsg.interactionTokenAt
        ? Date.now() - liveMsg.interactionTokenAt.getTime()
        : Infinity;
    const tokenFresh = tokenAgeMs < INTERACTION_TOKEN_FRESH_MS;
    // Pre-expiry finalization, webhook fallback only (bot-authored messages
    // stay editable forever). Bounded by tokenFresh so the paint itself can
    // still land.
    const finalizing = liveMsg.viaWebhook && tokenFresh
        && tokenAgeMs >= INTERACTION_TOKEN_FRESH_MS - FINAL_PAINT_WINDOW_MS;

    // All state (puzzle number, difficulty, timings, statuses) lives in the
    // rendered image - the message text stays empty, except on a finalizing
    // paint, where one line explains why the board stopped moving.
    const content = finalizing
        ? '-# Live updates paused — Discord limits how long this board can stay live. Press a button below for a fresh one.'
        : '';
    const components = buildComponents(difficulty);

    // One avatar fetch per participant, shared between the board tiles and
    // the leaderboard column.
    const avatars = await Promise.all(sorted.map((row) => fetchAvatarPng(env, row.playerId, row.avatar)));

    const boards = sorted.slice(0, MAX_BOARDS).map((row, i) => ({
        cells: boardCells(puzzle.givens, row.currentDigits),
        avatarPng: avatars[i],
    }));

    const entries = sorted.map((row, i) => {
        const status = entryStatus(row, finalizing);
        return { avatarPng: avatars[i], status, seconds: entrySeconds(row, status) };
    });

    const png = await renderBoardPng({
        title: { number: puzzleNumber(day), difficulty },
        boards,
        entries,
    });

    let messageId = liveMsg.messageId;
    let viaWebhook = liveMsg.viaWebhook;
    let needsSend = !messageId;

    // Stale for over REPOST_AFTER_MS: repost instead of editing (see the
    // constant's comment). lastEditAt is always set alongside messageId.
    if (messageId && liveMsg.lastEditAt && Date.now() - liveMsg.lastEditAt.getTime() > REPOST_AFTER_MS) {
        needsSend = true;
    }
    // A webhook-authored message is only editable while its token lives.
    if (messageId && viaWebhook && !tokenFresh) {
        needsSend = true;
    }

    if (messageId && !needsSend) {
        const editResult = viaWebhook
            // Invariant: interactionToken is always the token that authored a
            // viaWebhook message (interactions.ts drops messageId whenever it
            // replaces the token of a webhook-authored row).
            ? await editWebhookImageMessage(env, liveMsg.interactionToken!, messageId, content, png, 'board.png', components)
            : await editImageMessage(env, channelId, messageId, content, png, 'board.png', components);
        if (!editResult.ok) {
            if (editResult.status === 404 || editResult.status === 403 || editResult.code === 10008) {
                needsSend = true;
            } else {
                await db.update(liveMessages).set({ dirty: true }).where(eq(liveMessages.id, liveMsg.id));
                return;
            }
        }
    }

    if (needsSend) {
        // Bot path first; a 403 means the bot can't post here (not a channel
        // member - user-installed app), where a fresh interaction token is
        // the only remaining way to get a message in.
        const sendResult = await sendImageMessage(env, channelId, content, png, 'board.png', components);
        if (sendResult.ok) {
            messageId = sendResult.messageId;
            viaWebhook = false;
        } else if (sendResult.status === 403 && tokenFresh) {
            const webhookResult = await sendWebhookImageMessage(env, liveMsg.interactionToken!, content, png, 'board.png', components);
            if (!webhookResult.ok) {
                await db.update(liveMessages).set({ dirty: true }).where(eq(liveMessages.id, liveMsg.id));
                return;
            }
            messageId = webhookResult.messageId;
            viaWebhook = true;
        } else {
            await db.update(liveMessages).set({ dirty: true }).where(eq(liveMessages.id, liveMsg.id));
            return;
        }
    }

    await db
        .update(liveMessages)
        .set({ messageId, viaWebhook, lastEditAt: new Date(), dirty: false })
        .where(eq(liveMessages.id, liveMsg.id));
}

type LiveMessageParams = {
    channelId: string;
    guildId: string | null;
    day: string;
    difficulty: string;
    force: boolean;
};

// Runs an update pass only if the message still has unpainted changes
// (dirty flag set by a throttled/failed attempt).
async function flushIfDirty(env: Env, params: LiveMessageParams): Promise<void> {
    const db = getDb(env);
    const rows = await db
        .select({ dirty: liveMessages.dirty })
        .from(liveMessages)
        .where(and(
            eq(liveMessages.channelId, params.channelId),
            eq(liveMessages.day, params.day),
            eq(liveMessages.difficulty, params.difficulty)
        ))
        .limit(1);
    if (rows[0]?.dirty) {
        await maybeUpdateLiveMessage(env, { ...params, force: false });
    }
}

// Schedule the immediate update plus the two deferred passes on the
// request's execution context. This is what progress writes call - it
// guarantees the live image reaches its final state even if the player
// closes the activity right after this request:
//  1. now: normal (throttled) update;
//  2. +6s: repaint if the immediate attempt only managed to set `dirty`;
//  3. +25s: one more pass so a player who stopped sending saves flips to
//     the frozen-time + pause-icon presentation (INACTIVE_AFTER_MS).
export function scheduleLiveMessageUpdate(env: Env, ctx: ExecutionContext, params: LiveMessageParams): void {
    ctx.waitUntil(maybeUpdateLiveMessage(env, params));
    ctx.waitUntil(sleep(DIRTY_FLUSH_DELAY_MS).then(() => flushIfDirty(env, params)));
    ctx.waitUntil(sleep(LEAVER_SWEEP_DELAY_MS).then(() => maybeUpdateLiveMessage(env, { ...params, force: false })));
}
