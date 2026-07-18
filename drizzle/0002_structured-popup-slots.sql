ALTER TABLE `site_settings` ADD `popup_day_from` text DEFAULT 'Mon' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `popup_day_to` text DEFAULT 'Sat' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `popup_time_from` text DEFAULT '16:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `popup_time_to` text DEFAULT '20:00' NOT NULL;