CREATE TABLE `client_cvs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`originalName` varchar(256) NOT NULL,
	`extractedText` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_cvs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tailor_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`listingId` int NOT NULL,
	`cvId` int NOT NULL,
	`rewrittenCv` text,
	`coveringEmail` text,
	`status` enum('pending','done','error') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tailor_applications_id` PRIMARY KEY(`id`)
);
