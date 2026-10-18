import { Router } from "express";
import { TextControllers } from "../controllers/text.controllers";

export const router = Router()
const controller = new TextControllers()

router.post("/texto", controller.salvarTexto);
router.get("/texto/:id", controller.procurarTexto);
router.put("/texto/:id", controller.atualizarTexto);
router.delete("/texto/:id", controller.deletarTexto);