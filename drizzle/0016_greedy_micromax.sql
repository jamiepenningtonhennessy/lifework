CREATE TABLE `counsellor_pin` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pinHash` varchar(256) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `counsellor_pin_id` PRIMARY KEY(`id`)
);
