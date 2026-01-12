CREATE TABLE `conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text
);
--> statement-breakpoint
CREATE TABLE `conversation_settings` (
	`conversationId` text PRIMARY KEY NOT NULL,
	`model` text,
	`temperature` text,
	`systemPromptPresetIdsJson` text,
	FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`conversationId` text NOT NULL,
	`role` text NOT NULL,
	`createdAt` text NOT NULL,
	`deletedAt` text,
	`parentMessageId` text,
	`activeVariantId` text,
	FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_message_conv_createdAt` ON `message` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_message_role` ON `message` (`role`);--> statement-breakpoint
CREATE TABLE `message_variant` (
	`id` text PRIMARY KEY NOT NULL,
	`messageId` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` text NOT NULL,
	`kind` text NOT NULL,
	`metaJson` text,
	FOREIGN KEY (`messageId`) REFERENCES `message`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_variant_message_createdAt` ON `message_variant` (`messageId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`temperature` text,
	`autoScrollEnabled` text,
	`showReasoning` text,
	`persistReasoning` text,
	`defaultModel` text,
	`systemPromptsEnabled` text
);
--> statement-breakpoint
CREATE TABLE `system_prompt_preset` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`prompt` text NOT NULL,
	`isEnabled` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text
);
--> statement-breakpoint
CREATE INDEX `idx_system_prompt_name` ON `system_prompt_preset` (`name`);