import type { Request, Response } from "express";
import { TextRepositories } from "../repositories/text.repositories";
import { Text } from "../models/text.models";

const repo = new TextRepositories();
const idInvalido = (id: number): boolean => !Number.isInteger(id) || id <= 0;

export class TextControllers {
  public async salvarTexto(req: Request, res: Response): Promise<void> {
    try {
      const { profId, titulo, texto, materia } = req.body ?? {};
      const dados = Text.toDataBase(profId, titulo, texto, new Date(), materia ?? null);
      const textoSalvo = await repo.criarText(dados);
      res.status(201).json(textoSalvo);
    } catch (erro) {
      if (erro instanceof Error && !("code" in erro)) {
        res.status(400).json({ erro: erro.message });
        return;
      }
      console.error("Erro ao salvar texto:", erro);
      res.status(500).json({ erro: "Não foi possível salvar o texto." });
    }
  }

  public async procurarTexto(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (idInvalido(id)) {
      res.status(400).json({ erro: "O id deve ser um número inteiro positivo." });
      return;
    }
    try {
      const texto = await repo.buscarPorId(id);
      if (!texto) {
        res.status(404).json({ erro: "Texto não encontrado." });
        return;
      }
      res.status(200).json(texto);
    } catch (erro) {
      console.error("Erro ao buscar texto:", erro);
      res.status(500).json({ erro: "Não foi possível buscar o texto." });
    }
  }

  public async atualizarTexto(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (idInvalido(id)) {
      res.status(400).json({ erro: "O id deve ser um número inteiro positivo." });
      return;
    }
    const { titulo, texto, materia } = req.body ?? {};
    try {
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
      const textoAtualizado = await repo.atualizar(id, { titulo, texto, materia });
      if (!textoAtualizado) {
        res.status(404).json({ erro: "Texto não encontrado." });
        return;
      }
      res.status(200).json(textoAtualizado);
    } catch (erro) {
      console.error("Erro ao atualizar texto:", erro);
      res.status(500).json({ erro: "Não foi possível atualizar o texto." });
    }
  }

  public async deletarTexto(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (idInvalido(id)) {
      res.status(400).json({ erro: "O id deve ser um número inteiro positivo." });
      return;
    }
    try {
      const textoDeletado = await repo.deletar(id);
      if (!textoDeletado) {
        res.status(404).json({ erro: "Texto não encontrado." });
        return;
      }
      res.status(200).json(textoDeletado);
    } catch (erro) {
      console.error("Erro ao deletar texto:", erro);
      res.status(500).json({ erro: "Não foi possível deletar o texto." });
    }
  }
}
