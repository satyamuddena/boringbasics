DROP TABLE `event_registrations`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`token` text NOT NULL,
	`status` text DEFAULT 'subscribed' NOT NULL,
	`source` text DEFAULT 'site' NOT NULL,
	`created_at` text NOT NULL,
	`unsubscribed_at` text
);--> statement-breakpoint
CREATE UNIQUE INDEX `subscribers_email_unique` ON `subscribers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscribers_token_unique` ON `subscribers` (`token`);
