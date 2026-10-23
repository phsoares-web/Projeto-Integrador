import { Router } from "express";
import { TextControllers } from "../controllers/text.controllers";

export const router = Router();
const controller = new TextControllers();

router.post("/texto", (req, res) => controller.salvarTexto(req, res));
router.get("/texto/:id", (req, res) => controller.procurarTexto(req, res));
router.put("/texto/:id", (req, res) => controller.atualizarTexto(req, res));
router.delete("/texto/:id", (req, res) => controller.deletarTexto(req, res));
