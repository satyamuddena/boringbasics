ALTER TABLE `site_settings` ADD `cta_label` text DEFAULT 'Book a Consultation' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `popup_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `popup_title` text DEFAULT 'Consultation Call with Satya' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `popup_body` text DEFAULT 'Get expert guidance on your transformation plan, clarify your doubts and find the right approach for your goals.' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `popup_slots` text DEFAULT 'Mon–Sat, 4:00 PM – 8:00 PM (IST)' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `popup_note` text DEFAULT 'One-on-one only — every call is dedicated to a single client.' NOT NULL;