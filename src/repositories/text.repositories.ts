import { Text as Texto, TextRawSQL } from "../models/text.models";
import { PrismaClient, Text, Prisma } from '../../generated/prisma';

const prisma = new PrismaClient()

export class TextRepositories {
    public async criarText(item: Omit<TextRawSQL, "id">): Promise<Text>{
        const {...dataToSQL } = item
        return await prisma.text.create({
                data : dataToSQL
            })
    }
    public async buscarPorId(id: number): Promise<Text | null> {
        return await prisma.text.findUnique({
            where : {id}
        })
    }
    public async atualizar(id: number, conteudo: Prisma.TextUpdateInput): Promise<Text | null> {
        const dadosAtt : Prisma.TextUpdateInput = {}
        if(conteudo.titulo !== undefined) dadosAtt.titulo = conteudo.titulo;
        if(conteudo.texto !== undefined) dadosAtt.texto = conteudo.texto;
        if(conteudo.materia !== undefined) dadosAtt.materia = conteudo.materia;

        return await prisma.text.update({
            where : {id},
            data : dadosAtt
        })
    }
    public async deletar(id: number): Promise<Text | null> {
        return await prisma.text.delete({
            where : {id}
        })
    }
}