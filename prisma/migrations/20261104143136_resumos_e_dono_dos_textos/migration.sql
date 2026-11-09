-- CreateTable
CREATE TABLE `Resumo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `textoId` INTEGER NOT NULL,
    `conteudo` LONGTEXT NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Resumo_textoId_key`(`textoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Text_prof_id_idx` ON `Text`(`prof_id`);

-- AddForeignKey
ALTER TABLE `Text` ADD CONSTRAINT `Text_prof_id_fkey` FOREIGN KEY (`prof_id`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Resumo` ADD CONSTRAINT `Resumo_textoId_fkey` FOREIGN KEY (`textoId`) REFERENCES `Text`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
