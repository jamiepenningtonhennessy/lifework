CREATE TABLE `wow_report_beta_versions` (
	`id` varchar(36) NOT NULL,
	`clientId` int NOT NULL,
	`betaVersion` varchar(32) NOT NULL,
	`sourceReportGeneratedAt` timestamp,
	`sectionsSnapshot` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wow_report_beta_versions_id` PRIMARY KEY(`id`)
);
