CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`before_json` text,
	`after_json` text,
	`ip` text,
	`user_agent` text
);
--> statement-breakpoint
CREATE TABLE `consultation` (
	`id` integer PRIMARY KEY NOT NULL,
	`price` integer NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`duration_label` text NOT NULL,
	`note` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`whatsapp` text NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`order_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`description_md` text DEFAULT '' NOT NULL,
	`image` text,
	`location` text DEFAULT 'Online' NOT NULL,
	`mode` text DEFAULT 'online' NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text,
	`capacity` integer,
	`price_paise` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE TABLE `faqs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`category` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`whatsapp` text NOT NULL,
	`email` text,
	`goal` text,
	`level` text,
	`preferred_datetime` text,
	`message` text,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`registration_id` integer,
	`razorpay_order_id` text NOT NULL,
	`razorpay_payment_id` text,
	`amount_paise` integer NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`customer_name` text,
	`customer_email` text,
	`customer_phone` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_razorpay_order_id_unique` ON `orders` (`razorpay_order_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`cover_image` text,
	`category` text,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`read_time_min` integer,
	`published_at` text NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`body_md` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE TABLE `programs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`duration_label` text NOT NULL,
	`short_description` text NOT NULL,
	`full_description` text NOT NULL,
	`features_json` text NOT NULL,
	`goal_tags_json` text NOT NULL,
	`price` integer NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`billing_period` text DEFAULT 'one-time' NOT NULL,
	`popular` integer DEFAULT false NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`image` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `programs_slug_unique` ON `programs` (`slug`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`ip` text,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`site_url` text,
	`keywords_json` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `socials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`url` text NOT NULL,
	`handle` text NOT NULL,
	`followers` integer,
	`display_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`value` integer NOT NULL,
	`suffix` text,
	`prefix` text,
	`display_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_name` text NOT NULL,
	`image` text,
	`quote` text NOT NULL,
	`rating` integer DEFAULT 5 NOT NULL,
	`result` text,
	`featured` integer DEFAULT false NOT NULL,
	`placeholder` integer DEFAULT false NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trainer` (
	`id` integer PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`brand` text NOT NULL,
	`tagline` text NOT NULL,
	`short_bio` text NOT NULL,
	`bio_json` text NOT NULL,
	`philosophy` text NOT NULL,
	`years_experience` integer NOT NULL,
	`location` text NOT NULL,
	`email` text NOT NULL,
	`whatsapp` text NOT NULL,
	`certifications_json` text NOT NULL,
	`profile_image` text NOT NULL,
	`gallery_images_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transformations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_name` text NOT NULL,
	`before_image` text NOT NULL,
	`after_image` text NOT NULL,
	`goal` text NOT NULL,
	`duration_weeks` integer NOT NULL,
	`summary` text NOT NULL,
	`consent_given` integer DEFAULT false NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`placeholder` integer DEFAULT false NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);