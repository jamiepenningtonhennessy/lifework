CREATE TABLE `verified_testimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quote` text NOT NULL,
	`attribution` varchar(160) NOT NULL,
	`sourceReference` text NOT NULL,
	`consentConfirmed` boolean NOT NULL DEFAULT false,
	`status` enum('draft','approved','archived') NOT NULL DEFAULT 'draft',
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verified_testimonials_id` PRIMARY KEY(`id`)
);
