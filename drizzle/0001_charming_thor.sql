CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`decade` enum('childhood','teens','twenties','thirties','forties','fifties','sixties_plus') NOT NULL,
	`title` varchar(512) NOT NULL,
	`description` text,
	`esf` enum('enjoyable','satisfying','fulfilling'),
	`skills` text,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analysis_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`coreStrengths` text,
	`drivingMotivations` text,
	`preferredEnvironments` text,
	`keySkills` text,
	`careerThemes` text,
	`viaCorrelation` text,
	`careerSuggestions` text,
	`counselorNotes` text,
	`fullReportMarkdown` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analysis_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `analysis_reports_clientId_unique` UNIQUE(`clientId`)
);
--> statement-breakpoint
CREATE TABLE `career_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`organisation` varchar(256) NOT NULL,
	`role` varchar(256),
	`yearFrom` varchar(8),
	`yearTo` varchar(8),
	`keyResponsibilities` text,
	`whyLeft` text,
	`highlights` text,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `career_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`firstName` varchar(128),
	`lastName` varchar(128),
	`email` varchar(320),
	`dateOfBirth` varchar(32),
	`currentRole` varchar(256),
	`currentOrg` varchar(256),
	`interviewStatus` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`viaStatus` enum('not_started','completed') NOT NULL DEFAULT 'not_started',
	`analysisStatus` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `education_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`institution` varchar(256) NOT NULL,
	`qualification` varchar(256),
	`subject` varchar(256),
	`yearFrom` varchar(8),
	`yearTo` varchar(8),
	`highlights` text,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `education_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `family_background` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`fatherOccupation` varchar(256),
	`motherOccupation` varchar(256),
	`siblingPosition` varchar(128),
	`upbringingLocation` varchar(256),
	`familyNarrative` text,
	`significantInfluences` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `family_background_id` PRIMARY KEY(`id`),
	CONSTRAINT `family_background_clientId_unique` UNIQUE(`clientId`)
);
--> statement-breakpoint
CREATE TABLE `interview_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`phase` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interview_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `via_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`rankedStrengths` json,
	`rawScores` json,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `via_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `via_results_clientId_unique` UNIQUE(`clientId`)
);
