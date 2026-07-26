CREATE TABLE `job_pipeline_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`fullPipeline` boolean NOT NULL DEFAULT false,
	`status` enum('pending','running','done','error') NOT NULL DEFAULT 'pending',
	`currentStage` int NOT NULL DEFAULT 0,
	`totalStages` int NOT NULL DEFAULT 2,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `job_pipeline_runs_id` PRIMARY KEY(`id`)
);
