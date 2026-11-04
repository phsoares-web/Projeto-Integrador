import type { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import { AdminRepositories } from "../repositories/admin.repositories";
import { TipoUsuario } from "../models/user.models";

const repo = new AdminRepositories()
const TIPOS = Object.values(TipoUsuario) as string[]

const idDaRota = (req: Request): number | null => {
    const id = Number(req.params.id)
    return Number.isInteger(id) && id > 0 ? id : null
}

const falha = (res: Response, contexto: string, erro: unknown) => {
    console.error(`Erro ao ${contexto}:`, erro)
    return res.status(500).json({ erro: `Não foi possível ${contexto}.` })
}

export class AdminControllers {
    public async resumo(_req: Request, res: Response): Promise<Response> {
        try {
            return res.json(await repo.estatisticas())
        } catch (erro) {
            return falha(res, "carregar os números do painel", erro)
        }
    }

    public async usuarios(_req: Request, res: Response): Promise<Response> {
        try {
            return res.json(await repo.listarUsuarios())
        } catch (erro) {
            return falha(res, "listar os usuários", erro)
        }
    }

    public async aulas(_req: Request, res: Response): Promise<Response> {
        try {
            return res.json(await repo.listarAulas())
        } catch (erro) {
            return falha(res, "listar as aulas", erro)
        }
    }

    public async alterarTipo(req: Request, res: Response): Promise<Response> {
        const id = idDaRota(req)
        const { tipo } = req.body ?? {}
        if (id === null) return res.status(400).json({ erro: "Id inválido." })
        if (!TIPOS.includes(tipo)) return res.status(400).json({ erro: "Tipo inválido. Use ALUNO, PROFESSOR ou ADMIN." })
        if (id === req.usuario!.id && tipo !== TipoUsuario.ADMIN)
            return res.status(400).json({ erro: "Você não pode remover o seu próprio acesso de administrador." })

        try {
            const alvo = await repo.buscarUsuario(id)
            if (!alvo) return res.status(404).json({ erro: "Usuário não encontrado." })
            return res.json(await repo.alterarTipo(id, tipo))
        } catch (erro) {
            return falha(res, "alterar o tipo do usuário", erro)
        }
    }

    public async excluirUsuario(req: Request, res: Response): Promise<Response> {
        const id = idDaRota(req)
        if (id === null) return res.status(400).json({ erro: "Id inválido." })
        if (id === req.usuario!.id) return res.status(400).json({ erro: "Você não pode excluir a sua própria conta por aqui." })

        try {
            if (!(await repo.excluirUsuario(id))) return res.status(404).json({ erro: "Usuário não encontrado." })
            return res.json({ id })
        } catch (erro) {
            if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2003")
                return res.status(409).json({ erro: "Este usuário tem disciplinas ou registros vinculados e não pode ser excluído." })
            return falha(res, "excluir o usuário", erro)
        }
    }
}
