CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`source` varchar(100) DEFAULT 'lifework-landing',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `wowReportJson` text;--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `wowReportPdfUrl` text;--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `wowReportGeneratedAt` timestamp;--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `wowReportStatus` varchar(20);--> statement-breakpoint
ALTER TABLE `analysis_reports` ADD `wowReportError` text;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `backgroundStatus` enum('not_started','in_progress','completed') DEFAULT 'not_started' NOT NULL;