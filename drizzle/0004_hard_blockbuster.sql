CREATE TABLE `cognitive_screener_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`scores` json,
	`rawAnswers` json,
	`timeTakenSeconds` int,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cognitive_screener_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `cognitive_screener_results_clientId_unique` UNIQUE(`clientId`)
);
--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `cognitiveStatus` enum('not_started','completed') DEFAULT 'not_started' NOT NULL;