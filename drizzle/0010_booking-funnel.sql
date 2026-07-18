ALTER TABLE `leads` ADD `stage` text DEFAULT 'details' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `amount_paise` integer;--> statement-breakpoint
ALTER TABLE `leads` ADD `currency` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `razorpay_order_id` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `razorpay_payment_id` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `paid_at` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `booked_at` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `calendly_event_uri` text;
