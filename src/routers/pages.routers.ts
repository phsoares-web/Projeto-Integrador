import { Router } from "express";

export const router = Router()

router.get("/cadastro", (req, res) => res.render("cadastro"))
router.get("/login", (req, res) => res.render("login"))