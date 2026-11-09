import { Router } from "express";
import { TextControllers } from "../controllers/text.controllers";
import { exigirLogin, exigirTipo } from "../lib/sessao";
import { TipoUsuario } from "../models/user.models";

export const router = Router();
const controller = new TextControllers();

// Salvar aulas e resumos é coisa da área do usuário (aluno/professor).
const usuarioComum = exigirTipo(TipoUsuario.ALUNO, TipoUsuario.PROFESSOR);

router.get("/me/textos", usuarioComum, (req, res) => controller.listarMinhas(req, res));

router.post("/texto", usuarioComum, (req, res) => controller.salvarTexto(req, res));
router.get("/texto/:id", exigirLogin, (req, res) => controller.procurarTexto(req, res));
router.put("/texto/:id", usuarioComum, (req, res) => controller.atualizarTexto(req, res));
router.delete("/texto/:id", exigirLogin, (req, res) => controller.deletarTexto(req, res));

router.post("/texto/:id/resumo/gerar", usuarioComum, (req, res) => controller.gerarResumo(req, res));
router.put("/texto/:id/resumo", usuarioComum, (req, res) => controller.salvarResumo(req, res));
router.delete("/texto/:id/resumo", usuarioComum, (req, res) => controller.deletarResumo(req, res));
