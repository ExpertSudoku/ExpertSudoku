CREATE TABLE `pending_launches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`difficulty` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pending_launches_user_channel_unique` ON `pending_launches` (`user_id`,`channel_id`);