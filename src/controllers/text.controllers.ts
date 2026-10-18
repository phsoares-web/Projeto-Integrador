import type { Request, Response } from "express";
import { TextRepositories } from "../repositories/text.repositories";
import { Text } from "../models/text.models";

const repo = new TextRepositories()

export class TextControllers {
    private validarId(id: number): boolean { return !Number.isInteger(id) || id <= 0 }

    public async salvarTexto(req: Request, res: Response){
        try{
            const { profId, titulo, texto, materia } = req.body
            const data: Date = new Date()

            const dados = Text.toDataBase(profId, titulo, texto, data, materia)
            const textoSav = await repo.criarText(dados)

            res.status(201).json(textoSav)
        } catch (erro) {
            res.status(500).json({erro : "não foi possível salvar o Texto"})
        }
    }
    public async procurarTexto(req: Request, res: Response){
        try{
            const id: number = Number(req.params.id)
            if(this.validarId(id)) 
                return res.status(400).json({ erro : "O Id é inválido, pois não é natural"})

            const texto = await repo.buscarPorId(id)
            if(!texto) 
                return res.status(404).json({erro : "O Id não corresponde a nenhum item"})
        
            res.status(200).json(texto)
        } catch (erro) {
            res.status(500).json({erro : "Não foi possível achar o Texto"})
        }
    }
    public async atualizarTexto(req: Request, res: Response){
        try{
            const id = Number(req.params.id)
            if(this.validarId(id)) 
                return res.status(400).json({ erro : "O Id é inválido, pois não é natural"})

            const {titulo, texto, materia} = req.body
            const textoAtt = await repo.atualizar(id, {titulo, texto, materia})
            if(!textoAtt)
                return res.status(404).json("O Id não corresponde a nenhum item")

            res.status(200).json(textoAtt)
        } catch(erro) {
            res.status(500).json({erro : "Não foi possível atualizar o texto"})
        }
    }
    public async deletarTexto(req: Request, res: Response) {
        try {
            const id = Number(req.params.id)
            if(this.validarId(id)) 
                return res.status(400).json({ erro : "O Id é inválido, pois não é natural"})

            const textoDel = await repo.deletar(id)
            if(!textoDel)
                return res.status(404).json({erro : "O Id não corresponde a nenhum item"})

            res.status(200).json(textoDel)
        } catch (erro) {
            res.status(500).json({erro : "Não foi possível deletar o texto"})
        }
    }
}