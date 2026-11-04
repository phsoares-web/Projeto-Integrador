export enum TipoUsuario {
    ALUNO = "ALUNO",
    PROFESSOR = "PROFESSOR",
    ADMIN = "ADMIN"
}

export interface UserRawSQL {
    id: number,
    nome: string,
    email: string,
    senha: string,
    tipo: TipoUsuario,
    criadoEm: Date
}

/** Dados do usuário que podem ser enviados ao cliente (sem o hash da senha). */
export type UsuarioPublico = Omit<UserRawSQL, "senha">

// Tipos que qualquer pessoa pode escolher no cadastro público. ADMIN não entra aqui.
const TIPOS_CADASTRO_PUBLICO: readonly TipoUsuario[] = [TipoUsuario.ALUNO, TipoUsuario.PROFESSOR]

export class User {
    public static validarId(id: number): number {
        if (!Number.isInteger(id) || id <= 0) throw new Error("O id deve ser um número inteiro positivo.")
        return id
    }

    public static validarNome(nome: unknown): string {
        if (typeof nome !== "string" || !nome.trim()) throw new Error("O nome é obrigatório.")
        const novoNome = nome.trim().replace(/\s+/g, " ")
        if (novoNome.length < 2) throw new Error("O nome deve ter pelo menos 2 caracteres.")
        if (novoNome.length > 120) throw new Error("O nome pode ter no máximo 120 caracteres.")
        return novoNome
    }

    public static validarEmail(email: unknown): string {
        if (typeof email !== "string" || !email.trim()) throw new Error("O e-mail é obrigatório.")
        const novoEmail = email.trim().toLowerCase()
        const regex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/
        if (novoEmail.length > 191 || !regex.test(novoEmail)) throw new Error("E-mail inválido.")
        return novoEmail
    }

    public static validarSenha(senha: unknown): string {
        if (typeof senha !== "string" || !senha) throw new Error("A senha é obrigatória.")
        if (senha.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.")
        // O bcrypt só considera os primeiros 72 bytes da senha.
        if (Buffer.byteLength(senha, "utf8") > 72) throw new Error("A senha pode ter no máximo 72 caracteres.")
        if (/\s/.test(senha)) throw new Error("A senha não pode conter espaços.")
        return senha
    }

    public static validarTipoCadastro(tipo: unknown): TipoUsuario {
        if (tipo === undefined || tipo === null || tipo === "") return TipoUsuario.ALUNO
        if (!TIPOS_CADASTRO_PUBLICO.includes(tipo as TipoUsuario)) {
            throw new Error("Tipo de usuário inválido. Use ALUNO ou PROFESSOR.")
        }
        return tipo as TipoUsuario
    }

    public static toDataBase(
        nome: unknown,
        email: unknown,
        senha: unknown,
        tipo: unknown
    ): Omit<UserRawSQL, "id" | "criadoEm"> {
        return {
            nome: User.validarNome(nome),
            email: User.validarEmail(email),
            senha: User.validarSenha(senha),
            tipo: User.validarTipoCadastro(tipo)
        }
    }

    public static toPublic(usuario: UserRawSQL): UsuarioPublico {
        const { senha: _senha, ...publico } = usuario
        return publico
    }
}
