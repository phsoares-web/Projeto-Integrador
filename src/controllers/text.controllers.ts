import type { Request, Response } from "express";
import { TextRepositories, type TextoComResumo } from "../repositories/text.repositories";
import { Text } from "../models/text.models";
import { TipoUsuario } from "../models/user.models";
import { gerarResumo } from "../services/resumo.service";

const repo = new TextRepositories();
const LIMITE_RESUMO = 20000;

// Erros de validação do model são Error simples; erros do Prisma/banco viram 500.
const ehErroDeValidacao = (erro: unknown): erro is Error =>
  erro instanceof Error && erro.constructor === Error;

const idDaRota = (req: Request): number | null => {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * Carrega a aula da rota e confere a permissão.
 * Dono pode tudo; admin pode ver e excluir (somenteDono = false).
 * Responde o erro e devolve null quando não pode continuar.
 */
async function carregarAula(req: Request, res: Response, somenteDono: boolean): Promise<TextoComResumo | null> {
  const id = idDaRota(req);
  if (id === null) {
    res.status(400).json({ erro: "O id deve ser um número inteiro positivo." });
    return null;
  }
  const aula = await repo.buscarPorId(id);
  const usuario = req.usuario!;
  const ehDono = aula?.prof_id === usuario.id;
  const ehAdmin = usuario.tipo === TipoUsuario.ADMIN;

  // Para quem não tem acesso, a aula "não existe" (não revela ids de outras pessoas).
  if (!aula || (!ehDono && (somenteDono || !ehAdmin))) {
    res.status(404).json({ erro: "Aula não encontrada." });
    return null;
  }
  return aula;
}

const responderErro = (res: Response, contexto: string, erro: unknown) => {
  console.error(`Erro ao ${contexto}:`, erro);
  res.status(500).json({ erro: `Não foi possível ${contexto}.` });
};

export class TextControllers {
  public async salvarTexto(req: Request, res: Response): Promise<void> {
    try {
      const { titulo, texto, materia } = req.body ?? {};
      const materiaInformada = typeof materia === "string" && materia.trim() ? materia : null;
      // O dono é sempre o usuário logado; um profId vindo do corpo é ignorado.
      const dados = Text.toDataBase(req.usuario!.id, titulo, texto, new Date(), materiaInformada);
      const textoSalvo = await repo.criarText(dados);
      res.status(201).json(textoSalvo);
    } catch (erro) {
      if (ehErroDeValidacao(erro)) {
        res.status(400).json({ erro: erro.message });
        return;
      }
      responderErro(res, "salvar a aula", erro);
    }
  }

  public async listarMinhas(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json(await repo.listarDoUsuario(req.usuario!.id));
    } catch (erro) {
      responderErro(res, "buscar suas aulas", erro);
    }
  }

  public async procurarTexto(req: Request, res: Response): Promise<void> {
    try {
      const aula = await carregarAula(req, res, false);
      if (aula) res.status(200).json(aula);
    } catch (erro) {
      responderErro(res, "buscar a aula", erro);
    }
  }

  public async atualizarTexto(req: Request, res: Response): Promise<void> {
    const { titulo, texto, materia } = req.body ?? {};
    if (titulo !== undefined && (typeof titulo !== "string" || titulo.trim().length < 3 || titulo.trim().length > 75)) {
      res.status(400).json({ erro: "O título deve ter entre 3 e 75 caracteres." });
      return;
    }
    if (texto !== undefined && (typeof texto !== "string" || texto.trim().length < 5)) {
      res.status(400).json({ erro: "O texto deve ter pelo menos 5 caracteres." });
      return;
    }
    if (materia !== undefined && materia !== null && (typeof materia !== "string" || materia.length > 100)) {
      res.status(400).json({ erro: "A matéria deve ter no máximo 100 caracteres." });
      return;
    }
    try {
      const aula = await carregarAula(req, res, true);
      if (!aula) return;
      const textoAtualizado = await repo.atualizar(aula.id, {
        titulo: typeof titulo === "string" ? titulo.trim() : undefined,
        texto: typeof texto === "string" ? texto.trim() : undefined,
        materia: typeof materia === "string" ? materia.trim() || null : materia,
      });
      res.status(200).json(textoAtualizado);
    } catch (erro) {
      responderErro(res, "atualizar a aula", erro);
    }
  }

  public async deletarTexto(req: Request, res: Response): Promise<void> {
    try {
      const aula = await carregarAula(req, res, false);
      if (!aula) return;
      await repo.deletar(aula.id);
      res.status(200).json({ id: aula.id });
    } catch (erro) {
      responderErro(res, "excluir a aula", erro);
    }
  }

  /* ----- Resumos ----- */

  public async gerarResumo(req: Request, res: Response): Promise<void> {
    try {
      const aula = await carregarAula(req, res, true);
      if (!aula) return;
      res.status(200).json(gerarResumo(aula.titulo, aula.texto));
    } catch (erro) {
      responderErro(res, "gerar o resumo", erro);
    }
  }

  public async salvarResumo(req: Request, res: Response): Promise<void> {
    const { conteudo } = req.body ?? {};
    if (typeof conteudo !== "string" || conteudo.trim().length < 5) {
      res.status(400).json({ erro: "O resumo deve ter pelo menos 5 caracteres." });
      return;
    }
    if (conteudo.length > LIMITE_RESUMO) {
      res.status(400).json({ erro: `O resumo pode ter no máximo ${LIMITE_RESUMO} caracteres.` });
      return;
    }
    try {
      const aula = await carregarAula(req, res, true);
      if (!aula) return;
      res.status(200).json(await repo.salvarResumo(aula.id, conteudo.trim()));
    } catch (erro) {
      responderErro(res, "salvar o resumo", erro);
    }
  }

  public async deletarResumo(req: Request, res: Response): Promise<void> {
    try {
      const aula = await carregarAula(req, res, true);
      if (!aula) return;
      if (!(await repo.deletarResumo(aula.id))) {
        res.status(404).json({ erro: "Esta aula ainda não tem resumo." });
        return;
      }
      res.status(200).json({ textoId: aula.id });
    } catch (erro) {
      responderErro(res, "excluir o resumo", erro);
    }
  }
}
