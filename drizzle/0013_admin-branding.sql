ALTER TABLE `site_settings` ADD `logo_path` text;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `icon_path` text;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `social_image_path` text;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `accent_color` text DEFAULT '#ff5a0a' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `background_color` text DEFAULT '#0a0a0b' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `foreground_color` text DEFAULT '#f4f4f5' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `email_sender_name` text DEFAULT 'Boring Basics' NOT NULL;
