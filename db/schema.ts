import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Canonical schema (see the ExpertSudoku implementation plan, Phase 3a).
// No separate "completions" table - a completion is simply
// `progress.completedAt IS NOT NULL`.

export const puzzles = sqliteTable('puzzles', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    day: text('day').notNull(),
    difficulty: text('difficulty').notNull(),
    givens: text('givens').notNull(), // 81 chars, '0' = blank
    solution: text('solution').notNull(), // 81 chars - NEVER sent to clients
    ratingInfo: text('rating_info'), // JSON: {difficulty, techniques}
}, (table) => ({
    dayDifficultyUnique: uniqueIndex('puzzles_day_difficulty_unique').on(table.day, table.difficulty),
}));

export const players = sqliteTable('players', {
    id: text('id').primaryKey(), // Discord snowflake
    username: text('username').notNull(),
    globalName: text('global_name'),
    avatar: text('avatar'), // avatar hash, null => default avatar
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const progress = sqliteTable('progress', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    playerId: text('player_id').notNull().references(() => players.id),
    puzzleId: integer('puzzle_id').notNull().references(() => puzzles.id),
    channelId: text('channel_id').notNull(),
    guildId: text('guild_id'), // null in DMs
    state: text('state').notNull(), // puzzleState JSON blob (exportPuzzleState shape)
    currentDigits: text('current_digits').notNull(), // 81 chars incl. givens
    correctCount: integer('correct_count').notNull().default(0),
    elapsedMs: integer('elapsed_ms').notNull().default(0),
    paused: integer('paused', { mode: 'boolean' }).notNull().default(false),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }), // completion == non-null
    completionSeconds: integer('completion_seconds'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => ({
    playerPuzzleUnique: uniqueIndex('progress_player_puzzle_unique').on(table.playerId, table.puzzleId),
}));

export const liveMessages = sqliteTable('live_messages', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    channelId: text('channel_id').notNull(),
    day: text('day').notNull(),
    difficulty: text('difficulty').notNull(),
    messageId: text('message_id'),
    lastEditAt: integer('last_edit_at', { mode: 'timestamp_ms' }),
    dirty: integer('dirty', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
    channelDayDifficultyUnique: uniqueIndex('live_messages_channel_day_difficulty_unique')
        .on(table.channelId, table.day, table.difficulty),
}));

// Written when a user presses a difficulty button on a live message
// (worker/interactions.ts); read back (and deleted) by /api/token when that
// user next launches the activity in the same channel, so the client can
// skip the difficulty picker ("direct entry"). Short-lived by convention -
// entries older than a few minutes are ignored.
export const pendingLaunches = sqliteTable('pending_launches', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(), // Discord snowflake (may not be in players yet)
    channelId: text('channel_id').notNull(),
    difficulty: text('difficulty').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => ({
    userChannelUnique: uniqueIndex('pending_launches_user_channel_unique').on(table.userId, table.channelId),
}));

export const streaks = sqliteTable('streaks', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    contextId: text('context_id').notNull(), // guildId, or channelId in DMs
    contextType: text('context_type').notNull(), // 'guild' | 'channel'
    difficulty: text('difficulty').notNull(),
    length: integer('length').notNull().default(0),
    lastCompletedDay: text('last_completed_day'),
    lastChannelId: text('last_channel_id'),
    announcedDay: text('announced_day'), // cron idempotency guard
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => ({
    contextDifficultyUnique: uniqueIndex('streaks_context_difficulty_unique').on(table.contextId, table.difficulty),
}));
