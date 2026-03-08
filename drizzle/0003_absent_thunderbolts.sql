CREATE TABLE `ipip_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`domainScores` json,
	`facetScores` json,
	`rawAnswers` json,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ipip_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `ipip_results_clientId_unique` UNIQUE(`clientId`)
);
--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `ipipStatus` enum('not_started','completed') DEFAULT 'not_started' NOT NULL;