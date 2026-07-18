CREATE TABLE `live_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` text NOT NULL,
	`day` text NOT NULL,
	`difficulty` text NOT NULL,
	`message_id` text,
	`last_edit_at` integer,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `live_messages_channel_day_difficulty_unique` ON `live_messages` (`channel_id`,`day`,`difficulty`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`global_name` text,
	`avatar` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`puzzle_id` integer NOT NULL,
	`channel_id` text NOT NULL,
	`guild_id` text,
	`state` text NOT NULL,
	`current_digits` text NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`elapsed_ms` integer DEFAULT 0 NOT NULL,
	`paused` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`completion_seconds` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`puzzle_id`) REFERENCES `puzzles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `progress_player_puzzle_unique` ON `progress` (`player_id`,`puzzle_id`);--> statement-breakpoint
CREATE TABLE `puzzles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` text NOT NULL,
	`difficulty` text NOT NULL,
	`givens` text NOT NULL,
	`solution` text NOT NULL,
	`rating_info` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `puzzles_day_difficulty_unique` ON `puzzles` (`day`,`difficulty`);--> statement-breakpoint
CREATE TABLE `streaks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`context_id` text NOT NULL,
	`context_type` text NOT NULL,
	`difficulty` text NOT NULL,
	`length` integer DEFAULT 0 NOT NULL,
	`last_completed_day` text,
	`last_channel_id` text,
	`announced_day` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `streaks_context_difficulty_unique` ON `streaks` (`context_id`,`difficulty`);