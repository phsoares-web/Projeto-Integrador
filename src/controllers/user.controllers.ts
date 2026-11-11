import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import { UserRepositories } from "../repositories/user.repositories";
import { TipoUsuario, User, type UserRawSQL } from "../models/user.models";
import { cadastrar as gerarHash, login as compararSenha } from "../middlewares/bcrypt";
import { destinoPorTipo, encerrarSessao, iniciarSessao } from "../lib/sessao";
import { falhasDeLogin, ipDe, loginsPorIp, responderBloqueio } from "../middlewares/limite";

const repo = new UserRepositories()

// Hash bcrypt de uma senha aleatória, usado só para igualar o tempo de resposta
// quando o e-mail não existe. Gerado uma vez ao iniciar o servidor.
const hashFalso = gerarHash(randomBytes(16).toString("hex"))

// Erros de validação do model são Error simples; erros do Prisma/banco são tratados como 500.
const ehErroDeValidacao = (erro: unknown): erro is Error =>
    erro instanceof Error && erro.constructor === Error

/** Só aceita caminhos internos (evita redirecionar para outro site). */
const destinoSeguro = (voltar: unknown, padrao: string): string =>
    typeof voltar === "string" && /^\/(?!\/)/.test(voltar) ? voltar : padrao

export class UserControllers {
    public async cadastrar(req: Request, res: Response): Promise<Response> {
        try {
            const { nome, email, senha, tipo } = req.body ?? {}
            const dados = User.toDataBase(nome, email, senha, tipo)

            if (await repo.findByEmail(dados.email))
                return res.status(409).json({ erro: "Já existe uma conta com este e-mail." })

            const senhaHash = await gerarHash(dados.senha)
            const userSalvo = await repo.create(dados.nome, dados.email, senhaHash, dados.tipo)

            iniciarSessao(res, userSalvo.id, false)
            return res.status(201).json({
                usuario: User.toPublic(userSalvo as UserRawSQL),
                destino: destinoPorTipo(dados.tipo),
            })
        } catch (erro) {
            if (ehErroDeValidacao(erro)) return res.status(400).json({ erro: erro.message })
            if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002")
                return res.status(409).json({ erro: "Já existe uma conta com este e-mail." })

            console.error("Erro ao cadastrar usuário:", erro)
            return res.status(500).json({ erro: "Não foi possível fazer o cadastro." })
        }
    }

    public async login(req: Request, res: Response): Promise<Response> {
        const { email, senha, lembrar, voltar } = req.body ?? {}
        if (typeof email !== "string" || typeof senha !== "string" || !email.trim() || !senha)
            return res.status(400).json({ erro: "Informe e-mail e senha." })
        if (email.length > 191 || senha.length > 200)
            return res.status(401).json({ erro: "E-mail ou senha incorretos." })

        const emailNormalizado = email.trim().toLowerCase()
        const ip = ipDe(req)
        const chaveConta = `${emailNormalizado}|${ip}`

        // Bloqueios: muitas senhas erradas nesta conta, ou muitas tentativas deste IP.
        const esperaConta = falhasDeLogin.bloqueadoPor(chaveConta)
        if (esperaConta > 0) {
            responderBloqueio(res, esperaConta, "Muitas tentativas com senha errada.")
            return res
        }
        const esperaIp = loginsPorIp.bloqueadoPor(ip)
        if (esperaIp > 0) {
            responderBloqueio(res, esperaIp, "Muitas tentativas de login a partir desta rede.")
            return res
        }
        loginsPorIp.registrar(ip)

        try {
            const usuario = await repo.findByEmail(emailNormalizado)
            // Compara com um hash falso quando o e-mail não existe, para o tempo de resposta
            // ser o mesmo e não revelar quais e-mails têm conta.
            const senhaCerta = await compararSenha(senha, usuario?.senha ?? await hashFalso)
            if (!usuario || !senhaCerta) {
                falhasDeLogin.registrar(chaveConta)
                const restantes = falhasDeLogin.bloqueadoPor(chaveConta)
                if (restantes > 0) {
                    responderBloqueio(res, restantes, "Muitas tentativas com senha errada.")
                    return res
                }
                return res.status(401).json({ erro: "E-mail ou senha incorretos." })
            }

            falhasDeLogin.limpar(chaveConta)
            iniciarSessao(res, usuario.id, lembrar === true)

            const tipo = usuario.tipo as TipoUsuario
            const padrao = destinoPorTipo(tipo)
            // Admin não volta para páginas de usuário comum e vice-versa.
            const area = tipo === TipoUsuario.ADMIN ? "/admin" : "/minhas-aulas"
            const pedido = destinoSeguro(voltar, padrao)
            const destino = pedido.startsWith("/admin") || pedido.startsWith("/minhas-aulas")
                ? (pedido.startsWith(area) ? pedido : padrao)
                : pedido

            return res.status(200).json({ usuario: User.toPublic(usuario as UserRawSQL), destino })
        } catch (erro) {
            console.error("Erro no login do usuário:", erro)
            return res.status(500).json({ erro: "Não foi possível fazer o login." })
        }
    }

    public logout(_req: Request, res: Response): Response {
        encerrarSessao(res)
        return res.status(200).json({ destino: "/login" })
    }

    public eu(req: Request, res: Response): Response {
        return res.status(200).json(req.usuario)
    }
}
