import { Router } from "express";
import { paginaExigeTipo, paginaSomenteVisitante } from "../lib/sessao";
import { TipoUsuario } from "../models/user.models";

export const router = Router()

// Página de transcrição: aberta a visitantes; usuários logados podem salvar a aula.
router.get("/", (_req, res) => res.render("index"))

router.get("/login", paginaSomenteVisitante, (req, res) =>
    res.render("login", { voltar: typeof req.query.voltar === "string" ? req.query.voltar : "" }))
router.get("/cadastro", paginaSomenteVisitante, (_req, res) => res.render("cadastro"))

router.get("/minhas-aulas", paginaExigeTipo(TipoUsuario.ALUNO, TipoUsuario.PROFESSOR), (_req, res) =>
    res.render("minhas-aulas"))
router.get("/admin", paginaExigeTipo(TipoUsuario.ADMIN), (_req, res) => res.render("admin"))

// Links antigos (.html) continuam funcionando.
router.get(["/login.html", "/cadastro.html"], (req, res) => res.redirect(301, req.path.replace(".html", "")))
router.get(["/aula", "/aula.html", "/index.html"], (_req, res) => res.redirect(301, "/"))
