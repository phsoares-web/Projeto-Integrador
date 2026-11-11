import { Router } from "express";
import { AdminControllers } from "../controllers/admin.controllers";
import { exigirTipo } from "../lib/sessao";
import { TipoUsuario } from "../models/user.models";

export const router = Router()
const controller = new AdminControllers()

router.use(exigirTipo(TipoUsuario.ADMIN))

router.get("/resumo", (req, res) => controller.resumo(req, res))
router.get("/usuarios", (req, res) => controller.usuarios(req, res))
router.patch("/usuarios/:id", (req, res) => controller.alterarTipo(req, res))
router.delete("/usuarios/:id", (req, res) => controller.excluirUsuario(req, res))
router.get("/aulas", (req, res) => controller.aulas(req, res))
// Excluir uma aula: DELETE /api/texto/:id (admin tem permissão).
