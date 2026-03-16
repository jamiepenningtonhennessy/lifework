CREATE TABLE `coaching_annexes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`transcriptText` text,
	`draftAnnex` text,
	`approvedAnnex` text,
	`status` enum('draft','approved') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`approvedAt` timestamp,
	CONSTRAINT `coaching_annexes_id` PRIMARY KEY(`id`),
	CONSTRAINT `coaching_annexes_clientId_unique` UNIQUE(`clientId`)
);
--> statement-breakpoint
ALTER TABLE `career_explorer_sessions` MODIFY COLUMN `messages` text NOT NULL;--> statement-breakpoint
ALTER TABLE `achievements` ADD `othersObservations` text;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `careerExplorerUnlocked` boolean DEFAULT false NOT NULL;