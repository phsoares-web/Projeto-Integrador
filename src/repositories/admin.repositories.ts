import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { TipoUsuario } from "../models/user.models";

export class AdminRepositories {
    public async estatisticas() {
        const [porTipo, aulas, resumos] = await Promise.all([
            prisma.usuario.groupBy({ by: ["tipo"], _count: { _all: true } }),
            prisma.text.count(),
            prisma.resumo.count(),
        ])
        const contar = (tipo: string) => porTipo.find((g) => g.tipo === tipo)?._count._all ?? 0
        return {
            usuarios: porTipo.reduce((total, g) => total + g._count._all, 0),
            alunos: contar("ALUNO"),
            professores: contar("PROFESSOR"),
            admins: contar("ADMIN"),
            aulas,
            resumos,
        }
    }

    public listarUsuarios() {
        return prisma.usuario.findMany({
            orderBy: { criadoEm: "desc" },
            select: {
                id: true, nome: true, email: true, tipo: true, criadoEm: true,
                _count: { select: { textos: true } },
            },
        })
    }

    public listarAulas() {
        return prisma.text.findMany({
            orderBy: { id: "desc" },
            select: {
                id: true, titulo: true, materia: true, data: true,
                usuario: { select: { id: true, nome: true, email: true } },
                resumo: { select: { id: true } },
            },
        })
    }

    public contarAdmins() {
        return prisma.usuario.count({ where: { tipo: "ADMIN" } })
    }

    public buscarUsuario(id: number) {
        return prisma.usuario.findUnique({ where: { id }, select: { id: true, tipo: true } })
    }

    public alterarTipo(id: number, tipo: TipoUsuario) {
        return prisma.usuario.update({
            where: { id },
            data: { tipo },
            select: { id: true, nome: true, email: true, tipo: true, criadoEm: true },
        })
    }

    /** Exclui o usuário (as aulas e resumos dele vão junto). Retorna false se não existir. */
    public async excluirUsuario(id: number): Promise<boolean> {
        try {
            await prisma.usuario.delete({ where: { id } })
            return true
        } catch (erro) {
            if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2025") return false
            throw erro
        }
    }
}
