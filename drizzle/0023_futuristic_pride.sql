CREATE TABLE `report_generation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`runId` varchar(64) NOT NULL,
	`writingStyle` varchar(64) NOT NULL DEFAULT 'house',
	`reportType` varchar(64) NOT NULL DEFAULT 'standard',
	`sectionKey` varchar(64) NOT NULL,
	`sectionLabel` varchar(128) NOT NULL,
	`promptSent` text NOT NULL,
	`contextSent` text,
	`rawOutput` text NOT NULL,
	`houseStyleOutput` text,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_generation_logs_id` PRIMARY KEY(`id`)
);
