import { Text, Usuario } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { TipoUsuario } from "../models/user.models";

export class UserRepositories {
    public async create(
        nome: string,
        email: string,
        senha: string,
        tipo: TipoUsuario
    ): Promise<Usuario> {
        return await prisma
        .usuario
        .create
        ({
            data : {
                nome,
                email,
                senha,
                tipo
            }
        })
    }
    public async findById(id: number): Promise<Usuario | null> {
        return await prisma
        .usuario
        .findUnique
        ({
            where : {id}
        })
    }
    public async findByEmail(email: string): Promise<Usuario | null> {
        return await prisma
        .usuario
        .findUnique
        ({
            where : {email}
        })
    }
    public async findTexts(id: number): Promise<Text[] | null> {
        return await prisma
        .text
        .findMany
        ({
            where : {prof_id : id}
        })
    }
}