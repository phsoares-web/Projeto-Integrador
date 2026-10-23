import { Prisma, type Text as PrismaText } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { TextRawSQL } from "../models/text.models";

export class TextRepositories {
  public criarText(item: Omit<TextRawSQL, "id">): Promise<PrismaText> {
    return prisma.text.create({ data: item });
  }

  public buscarPorId(id: number): Promise<PrismaText | null> {
    return prisma.text.findUnique({ where: { id } });
  }

  public async atualizar(id: number, conteudo: Prisma.TextUpdateInput): Promise<PrismaText | null> {
    const dadosAtt: Prisma.TextUpdateInput = {};
    if (conteudo.titulo !== undefined) dadosAtt.titulo = conteudo.titulo;
    if (conteudo.texto !== undefined) dadosAtt.texto = conteudo.texto;
    if (conteudo.materia !== undefined) dadosAtt.materia = conteudo.materia;

    try {
      return await prisma.text.update({ where: { id }, data: dadosAtt });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2025") return null;
      throw erro;
    }
  }

  public async deletar(id: number): Promise<PrismaText | null> {
    try {
      return await prisma.text.delete({ where: { id } });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2025") return null;
      throw erro;
    }
  }
}
