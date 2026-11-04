import type { Text, Usuario } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { TipoUsuario } from "../models/user.models";

export class UserRepositories {
    public create(nome: string, email: string, senha: string, tipo: TipoUsuario): Promise<Usuario> {
        return prisma.usuario.create({ data: { nome, email, senha, tipo } })
    }

    public findById(id: number): Promise<Usuario | null> {
        return prisma.usuario.findUnique({ where: { id } })
    }

    public findByEmail(email: string): Promise<Usuario | null> {
        return prisma.usuario.findUnique({ where: { email } })
    }

    public findTexts(id: number): Promise<Text[]> {
        return prisma.text.findMany({ where: { prof_id: id }, orderBy: { id: "desc" } })
    }
}
