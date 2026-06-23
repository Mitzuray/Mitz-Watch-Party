CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomCode` varchar(8) NOT NULL,
	`username` varchar(128) NOT NULL,
	`text` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(8) NOT NULL,
	`videoUrl` text,
	`hostName` varchar(128) NOT NULL DEFAULT 'Host',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `rooms_code_unique` UNIQUE(`code`)
);
