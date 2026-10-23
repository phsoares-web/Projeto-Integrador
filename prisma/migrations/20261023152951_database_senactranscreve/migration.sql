-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(120) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(255) NOT NULL,
    `tipo` ENUM('ALUNO', 'PROFESSOR', 'ADMIN') NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Disciplina` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(120) NOT NULL,
    `descricao` TEXT NULL,
    `professorId` INTEGER NOT NULL,

    INDEX `Disciplina_professorId_idx`(`professorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MatriculaDisciplina` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `alunoId` INTEGER NOT NULL,
    `disciplinaId` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MatriculaDisciplina_disciplinaId_idx`(`disciplinaId`),
    UNIQUE INDEX `MatriculaDisciplina_alunoId_disciplinaId_key`(`alunoId`, `disciplinaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transcricao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(150) NOT NULL,
    `conteudo` LONGTEXT NOT NULL,
    `disciplinaId` INTEGER NOT NULL,
    `professorId` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Transcricao_disciplinaId_criadoEm_idx`(`disciplinaId`, `criadoEm`),
    INDEX `Transcricao_professorId_criadoEm_idx`(`professorId`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Anotacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conteudo` LONGTEXT NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `transcricaoId` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Anotacao_usuarioId_criadoEm_idx`(`usuarioId`, `criadoEm`),
    INDEX `Anotacao_transcricaoId_idx`(`transcricaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TermoPersonalizado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `termo` VARCHAR(150) NOT NULL,
    `descricao` TEXT NULL,
    `disciplinaId` INTEGER NOT NULL,
    `criadoPorId` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TermoPersonalizado_criadoPorId_idx`(`criadoPorId`),
    UNIQUE INDEX `TermoPersonalizado_termo_disciplinaId_key`(`termo`, `disciplinaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistoricoAcesso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `alunoId` INTEGER NOT NULL,
    `transcricaoId` INTEGER NOT NULL,
    `acessadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HistoricoAcesso_alunoId_acessadoEm_idx`(`alunoId`, `acessadoEm`),
    INDEX `HistoricoAcesso_transcricaoId_acessadoEm_idx`(`transcricaoId`, `acessadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Disciplina` ADD CONSTRAINT `Disciplina_professorId_fkey` FOREIGN KEY (`professorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatriculaDisciplina` ADD CONSTRAINT `MatriculaDisciplina_alunoId_fkey` FOREIGN KEY (`alunoId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatriculaDisciplina` ADD CONSTRAINT `MatriculaDisciplina_disciplinaId_fkey` FOREIGN KEY (`disciplinaId`) REFERENCES `Disciplina`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transcricao` ADD CONSTRAINT `Transcricao_disciplinaId_fkey` FOREIGN KEY (`disciplinaId`) REFERENCES `Disciplina`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transcricao` ADD CONSTRAINT `Transcricao_professorId_fkey` FOREIGN KEY (`professorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Anotacao` ADD CONSTRAINT `Anotacao_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Anotacao` ADD CONSTRAINT `Anotacao_transcricaoId_fkey` FOREIGN KEY (`transcricaoId`) REFERENCES `Transcricao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TermoPersonalizado` ADD CONSTRAINT `TermoPersonalizado_disciplinaId_fkey` FOREIGN KEY (`disciplinaId`) REFERENCES `Disciplina`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TermoPersonalizado` ADD CONSTRAINT `TermoPersonalizado_criadoPorId_fkey` FOREIGN KEY (`criadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoricoAcesso` ADD CONSTRAINT `HistoricoAcesso_alunoId_fkey` FOREIGN KEY (`alunoId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoricoAcesso` ADD CONSTRAINT `HistoricoAcesso_transcricaoId_fkey` FOREIGN KEY (`transcricaoId`) REFERENCES `Transcricao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
