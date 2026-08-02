ALTER TABLE `client_profiles` ADD `cvUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `cvText` text;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `cvOriginalName` varchar(256);--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `cvUploadedAt` timestamp;