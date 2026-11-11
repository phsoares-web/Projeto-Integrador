-- CreateTable
CREATE TABLE `Text` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prof_id` INTEGER NULL,
    `titulo` VARCHAR(75) NOT NULL,
    `texto` LONGTEXT NOT NULL,
    `data` DATE NULL,
    `materia` VARCHAR(100) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
