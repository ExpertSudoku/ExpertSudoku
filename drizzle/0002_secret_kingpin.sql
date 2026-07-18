ALTER TABLE `live_messages` ADD `via_webhook` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `live_messages` ADD `interaction_token` text;--> statement-breakpoint
ALTER TABLE `live_messages` ADD `interaction_token_at` integer;