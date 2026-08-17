CREATE TABLE `job_spec_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`uploadedByUserId` int NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`originalName` varchar(256) NOT NULL,
	`extractedText` text,
	`feedbackJson` text,
	`status` enum('pending','complete','error') NOT NULL DEFAULT 'pending',
	`errorMessage` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`analysedAt` timestamp,
	CONSTRAINT `job_spec_reviews_id` PRIMARY KEY(`id`)
);
