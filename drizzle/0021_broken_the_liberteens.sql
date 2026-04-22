ALTER TABLE `analysis_reports` MODIFY COLUMN `counsellor_via_generated_at` bigint;--> statement-breakpoint
ALTER TABLE `analysis_reports` MODIFY COLUMN `counsellor_ocean_generated_at` bigint;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `sageStatus` enum('not_started','completed') DEFAULT 'not_started' NOT NULL;