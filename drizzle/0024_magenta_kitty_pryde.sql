CREATE TABLE `client_constraints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`exclude_current_employers` json,
	`exclude_companies` json,
	`exclude_sectors` json,
	`min_total_gbp` int DEFAULT 0,
	`permanent_only` boolean DEFAULT false,
	`hard_exclude_locations` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_constraints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_monitor_list` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`companyId` int NOT NULL,
	`score` int,
	`bucket_weight` int,
	`reason` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_monitor_list_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_target_spec` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`spec` json NOT NULL,
	`report_version` varchar(64),
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_target_spec_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_universe` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`domain` varchar(256),
	`tier` varchar(64),
	`sector` varchar(96),
	`ats_provider` varchar(64),
	`ats_slug` varchar(512),
	`careers_url` varchar(1024),
	`active` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `company_universe_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`matchId` int,
	`signalId` int,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`external_id` varchar(256) NOT NULL,
	`title` varchar(512) NOT NULL,
	`location` varchar(256),
	`url` varchar(1024),
	`raw` json,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `job_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`listingId` int NOT NULL,
	`score` int,
	`rationale` text,
	`constraint_status` enum('ok','filtered') DEFAULT 'ok',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `latent_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`company` varchar(256),
	`on_monitor_list` boolean DEFAULT false,
	`event` enum('departure','vacancy','appointment','other'),
	`role` varchar(256),
	`person` varchar(256),
	`relevance` int,
	`headline` text,
	`source` varchar(256),
	`url` varchar(1024),
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `latent_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`listingId` int,
	`signalId` int,
	`title` varchar(512) NOT NULL,
	`organisation` varchar(256),
	`notes` text,
	`status` enum('exploring','applied','not_for_me') DEFAULT 'exploring',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_jobs_id` PRIMARY KEY(`id`)
);
