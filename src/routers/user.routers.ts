import { Router } from "express";
import { UserControllers } from "../controllers/user.controllers";
import { exigirLogin } from "../lib/sessao";
import { cadastrosPorIp, limitarPorIp } from "../middlewares/limite";

export const router = Router()
const controller = new UserControllers()

router.post("/cadastro", limitarPorIp(cadastrosPorIp, "Muitas contas criadas a partir desta rede."),
    (req, res) => controller.cadastrar(req, res))
// O login tem limites próprios (por conta e por IP) dentro do controller.
router.post("/login", (req, res) => controller.login(req, res))
router.post("/logout", (req, res) => controller.logout(req, res))
router.get("/me", exigirLogin, (req, res) => controller.eu(req, res))
