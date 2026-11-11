-- Relaciona os textos/transcrições existentes a uma disciplina sem apagar materia.
-- A coluna é opcional para preservar registros antigos sem vínculo inequívoco.
ALTER TABLE `Text` ADD COLUMN `disciplinaId` INTEGER NULL;

CREATE INDEX `Text_disciplinaId_idx` ON `Text`(`disciplinaId`);

ALTER TABLE `Text`
  ADD CONSTRAINT `Text_disciplinaId_fkey`
  FOREIGN KEY (`disciplinaId`) REFERENCES `Disciplina`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
