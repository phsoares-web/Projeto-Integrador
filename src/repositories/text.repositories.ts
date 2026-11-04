import { Prisma, type Resumo, type Text as PrismaText } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { TextRawSQL } from "../models/text.models";

const naoEncontrado = (erro: unknown) =>
  erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2025";

export type TextoComResumo = PrismaText & { resumo: Resumo | null };

export class TextRepositories {
  public criarText(item: Omit<TextRawSQL, "id">): Promise<PrismaText> {
    return prisma.text.create({ data: item });
  }

  public buscarPorId(id: number): Promise<TextoComResumo | null> {
    return prisma.text.findUnique({ where: { id }, include: { resumo: true } });
  }

  /** Aulas do usuário, mais recentes primeiro, indicando se já têm resumo. */
  public listarDoUsuario(usuarioId: number) {
    return prisma.text.findMany({
      where: { prof_id: usuarioId },
      orderBy: { id: "desc" },
      include: { resumo: { select: { id: true, atualizadoEm: true } } },
    });
  }

  public async atualizar(id: number, conteudo: Prisma.TextUpdateInput): Promise<PrismaText | null> {
    const dadosAtt: Prisma.TextUpdateInput = {};
    if (conteudo.titulo !== undefined) dadosAtt.titulo = conteudo.titulo;
    if (conteudo.texto !== undefined) dadosAtt.texto = conteudo.texto;
    if (conteudo.materia !== undefined) dadosAtt.materia = conteudo.materia;

    try {
      return await prisma.text.update({ where: { id }, data: dadosAtt });
    } catch (erro) {
      if (naoEncontrado(erro)) return null;
      throw erro;
    }
  }

  public async deletar(id: number): Promise<PrismaText | null> {
    try {
      return await prisma.text.delete({ where: { id } });
    } catch (erro) {
      if (naoEncontrado(erro)) return null;
      throw erro;
    }
  }

  /* ----- Resumos ----- */

  public salvarResumo(textoId: number, conteudo: string): Promise<Resumo> {
    return prisma.resumo.upsert({
      where: { textoId },
      create: { textoId, conteudo },
      update: { conteudo },
    });
  }

  public async deletarResumo(textoId: number): Promise<boolean> {
    try {
      await prisma.resumo.delete({ where: { textoId } });
      return true;
    } catch (erro) {
      if (naoEncontrado(erro)) return false;
      throw erro;
    }
  }
}
