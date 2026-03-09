CREATE TABLE `historical_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(32) NOT NULL,
	`careerDescription` text NOT NULL,
	`tier` int NOT NULL DEFAULT 3,
	`narrativeSample` json,
	`embeddingText` text,
	`embedding` json,
	`embeddingReady` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `historical_clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `historical_clients_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `parallel_client_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`historicalClientId` int NOT NULL,
	`similarityScore` text NOT NULL,
	`rank` int NOT NULL,
	`counsellorNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parallel_client_matches_id` PRIMARY KEY(`id`)
);
