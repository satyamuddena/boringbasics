ALTER TABLE `site_settings` ADD `push_on_booking` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `push_on_payment` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `push_on_reminder` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `push_reminder_minutes` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `reminder_sent_at` text;
