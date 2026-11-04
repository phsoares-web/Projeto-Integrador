import { Request, Response } from "express";
import { UserRepositories } from "../repositories/user.repositories";
import { User } from "../models/user.models";
import { cadastrar as bCadastro, login as bLogin } from "../middlewares/bcrypt";
import { TipoUsuario } from "../../generated/prisma/enums";

const repo = new UserRepositories()

export class UserControllers{
    public async cadastrar(req: Request, res: Response): Promise<Response> {
        try {
            const { nome, email, senha, tipo } = req.body

            const emailUnico = await repo.findByEmail(email)
            if(emailUnico)
                return res.status(409).json({ erro : "Conta já existente" })

            const dados = User.toDataBase(nome, email, senha, tipo ?? TipoUsuario.ALUNO)
            const senhaHash = await bCadastro(senha)

            const userSalvo = await repo.create(dados.nome, dados.email, senhaHash, dados.tipo)

            return res.status(201).json(userSalvo)
        } catch(erro) {
            if (erro instanceof Error && !("code" in erro))
                return res.status(400).json({ erro: erro.message });

            console.error("Erro ao cadastrar usuario:", erro);
            return res.status(500).json({ erro: "Não foi possível fazer o cadastro" })
        }
    }
    public async login(req: Request, res: Response): Promise<Response> {
        try {
            const { email, senha } = req.body

            const emailExiste = await repo.findByEmail(email)
            if(!emailExiste)
                return res.status(404).json({ erro : "Email ou senha incorretos"})
            const senhaCerta = await bLogin(senha, emailExiste.senha)
            if(!senhaCerta)
                return res.status(404).json({ erro : "Email ou senha incorretos"})

            return res.status(200).json(emailExiste)
        } catch(erro) {
            if (erro instanceof Error && !("code" in erro))
                return res.status(400).json({ erro: erro.message });

            console.error("Erro ao login do usuario:", erro);
            return res.status(500).json({ erro: "Não foi possível fazer o login" })
        }
    }
    public async buscarIdUser(req: Request, res: Response): Promise<Response> {
        const id = Number(req.params.id)
        if(!Number.isInteger(id) || id <= 0)
            return res.status(404).json({ erro : "Usuario inexistente"})
        try {
            const user = await repo.findById(id)
            if(!user)
                return res.status(404).json({ erro : "Usuario inexistente"})

            return res.status(200).json(user)
        } catch(erro) {
            if (erro instanceof Error && !("code" in erro))
                return res.status(400).json({ erro: erro.message });

            console.error("Erro ao achar o usuario:", erro);
            return res.status(500).json({ erro: "Não foi possível achar o usuario" })
        }
    }
    public async textoUser(req: Request, res: Response): Promise<Response> {
        const id = Number(req.params.id)
        if(!Number.isInteger(id) || id <= 0)
            return res.status(404).json({ erro : "Usuario inexistente"})
        try{
            const textos = repo.findTexts(id) || []

            return res.status(200).json(textos)
        } catch(erro) {
            if (erro instanceof Error && !("code" in erro))
                return res.status(400).json({ erro: erro.message });

            console.error("Erro ao achar os textos:", erro);
            return res.status(500).json({ erro: "Não foi possível achar os textos do usuario" })
        }
    }
}