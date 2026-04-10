CREATE TABLE `lead_magnet_downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`email` varchar(320) NOT NULL,
	`document` varchar(64) NOT NULL DEFAULT 'lifework_overview',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_magnet_downloads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `achievements` ADD `sageEnrichment` text;--> statement-breakpoint
ALTER TABLE `achievements` ADD `counsellorNotes` text;--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `wow_report_writing_style` varchar(20);--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `canonical_stage1` text;--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `canonical_stage1_generated_at` int;