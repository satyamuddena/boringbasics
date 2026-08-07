CREATE TABLE `promo_banner` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`ref_id` integer NOT NULL,
	`banner_text` text NOT NULL,
	`cta_label` text,
	`cta_href` text,
	`starts_at` text,
	`ends_at` text,
	`is_enabled` integer DEFAULT false NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promo_banner_kind_ref_id_unique` ON `promo_banner` (`kind`,`ref_id`);
