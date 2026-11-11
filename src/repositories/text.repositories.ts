import { Prisma, type Resumo, type Text as PrismaText } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { TextRawSQL } from "../models/text.models";
import { TipoUsuario } from "../models/user.models";

const naoEncontrado = (erro: unknown) =>
  erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2025";

export type TextoComResumo = PrismaText & {
  resumo: Resumo | null;
  disciplina: { id: number; nome: string; professorId: number; professor: { id: number; nome: string } } | null;
};

const disciplinaComProfessor = {
  select: { id: true, nome: true, professorId: true, professor: { select: { id: true, nome: true } } },
} as const;

export class TextRepositories {
  public criarText(item: Omit<TextRawSQL, "id">): Promise<PrismaText> {
    return prisma.text.create({ data: item });
  }

  public buscarPorId(id: number): Promise<TextoComResumo | null> {
    return prisma.text.findUnique({
      where: { id },
      include: { resumo: true, disciplina: disciplinaComProfessor },
    });
  }

  /** Aulas próprias; alunos também consultam aulas publicadas por docentes de suas disciplinas. */
  public async listarDoUsuario(usuarioId: number, tipo: TipoUsuario) {
    const acessos: Prisma.TextWhereInput[] = [{ prof_id: usuarioId }];
    if (tipo === TipoUsuario.ALUNO) {
      const disciplinas = await prisma.disciplina.findMany({
        where: { matriculas: { some: { alunoId: usuarioId } } },
        select: { id: true, professorId: true },
      });
      for (const disciplina of disciplinas) {
        // Só compartilha o texto salvo pelo próprio professor responsável;
        // textos pessoais de outros alunos continuam privados.
        acessos.push({ disciplinaId: disciplina.id, prof_id: disciplina.professorId });
      }
    }

    return prisma.text.findMany({
      where: { OR: acessos },
      orderBy: { id: "desc" },
      include: {
        resumo: { select: { id: true, atualizadoEm: true } },
        disciplina: disciplinaComProfessor,
      },
    });
  }

  public listarDisciplinasDisponiveis(usuarioId: number, tipo: TipoUsuario) {
    const where = tipo === TipoUsuario.PROFESSOR
      ? { professorId: usuarioId }
      : { matriculas: { some: { alunoId: usuarioId } } };
    return prisma.disciplina.findMany({
      where,
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, professor: { select: { id: true, nome: true } } },
    });
  }

  public buscarDisciplinaDisponivel(disciplinaId: number, usuarioId: number, tipo: TipoUsuario) {
    const where = tipo === TipoUsuario.PROFESSOR
      ? { id: disciplinaId, professorId: usuarioId }
      : { id: disciplinaId, matriculas: { some: { alunoId: usuarioId } } };
    return prisma.disciplina.findFirst({
      where,
      select: { id: true, nome: true, professorId: true },
    });
  }

  /** Aluno matriculado só lê texto cujo autor é o professor responsável pela disciplina. */
  public async alunoPodeConsultar(id: number, alunoId: number): Promise<boolean> {
    const texto = await prisma.text.findUnique({
      where: { id },
      select: {
        prof_id: true,
        disciplina: {
          select: {
            professorId: true,
            matriculas: { where: { alunoId }, select: { id: true } },
          },
        },
      },
    });
    return Boolean(
      texto?.disciplina &&
      texto.prof_id === texto.disciplina.professorId &&
      texto.disciplina.matriculas.length > 0,
    );
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
