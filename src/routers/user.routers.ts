import { Router } from "express";
import { UserControllers } from "../controllers/user.controllers";

export const router = Router()
const controller = new UserControllers()

router.post('/cadastro', (req, res) => controller.cadastrar(req, res));
router.post('/login', (req, res) => controller.login(req, res));
router.get('/user/:id', (req, res) => controller.buscarIdUser(req, res));
router.get('/user/:id/textos', (req, res) => controller.textoUser(req, res))