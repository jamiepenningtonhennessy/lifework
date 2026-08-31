CREATE TABLE `testimonial_placements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testimonialId` int NOT NULL,
	`pageKey` varchar(64) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testimonial_placements_id` PRIMARY KEY(`id`),
	CONSTRAINT `testimonial_placements_testimonial_page_unique` UNIQUE(`testimonialId`,`pageKey`)
);

-- Carry existing approved, consent-backed webinar quotations into the first
-- configurable placement list. The previous public ordering followed record ID.
INSERT INTO `testimonial_placements` (`testimonialId`, `pageKey`, `sortOrder`)
SELECT `id`, 'webinar', `id`
FROM `verified_testimonials`
WHERE `status` = 'approved' AND `consentConfirmed` = 1;
