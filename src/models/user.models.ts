export interface UserRawSQL {
    id: number,
    nome: string,
    email: string,
    senha: string,
    tipo: TipoUsuario,
    criadoEm: Date
    
}
export enum TipoUsuario {
    ALUNO = "ALUNO",
    PROFESSOR ="PROFESSOR",
    ADMIN = "ADMIN"
}

export class User {
    public readonly id : number;
    private _nome : string;
    private _email : string;
    private _senha : string;
    private _tipo : TipoUsuario;

    constructor(
        id : number,
        nome : string,
        email : string,
        senha : string,
        tipo : TipoUsuario
    ) {
        this.id = User.validarId(id);
        this._nome = User.validarNome(nome);
        this._email = User.validarEmail(email);
        this._senha = User.validarSenha(senha);
        this._tipo = tipo;
    }

    get nome(): string { return this._nome }
    get email(): string { return this._email }
    get senha(): string { return this._senha }
    get tipo(): TipoUsuario { return this._tipo }

    set nome(newNome: string) { this._nome = User.validarNome(newNome) }
    set email(newEmail: string) { this._email = User.validarEmail(newEmail)}
    set senha(newSenha: string) { this._senha = User.validarSenha(newSenha) }

    private static validarId(id: number): number {
        const erros: string[] = []
        if(isNaN(id)) erros.push("Não é um Número")
        if(!Number.isInteger(id)) erros.push("Não é inteiro")
        if(id <= 0) erros.push("Não é positivo")
        if(erros.length > 0) throw new Error("O id é inválido pois: " + erros.join(", "))

        return id
    }
    private static validarNome(nome: string): string {
        if(!nome || typeof nome !== "string") throw new Error("Nome é obtigatório")

        const novoNome = nome.trim()
        if(novoNome.length > 75) throw new Error("Nome muito longo, limite de até 75")

        return novoNome
    }
    private static validarEmail(email: string): string {
        if(!email || typeof email !== "string") throw new Error("Email é obrigatório")
        
        const novoEmail = email.trim()
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if(regex.test(novoEmail)) throw new Error("E-mail Inválido")
        
        return novoEmail
    }
    private static validarSenha(senha: string): string {
        if(!senha || typeof senha !== "string") throw new Error("Senha é obtigatório")

        const novoSenha = senha.trim()
        if(novoSenha.length > 20) throw new Error("Senha muito longa, limite até 20")
        if(novoSenha.length <= 6) throw new Error("Senha muito curta, mínimo 6")
        if(/[^A-Za-z0-9]/g.test(novoSenha)) throw new Error("Senha inapropriada, somente um ou nenhum caractér especial")
        
        return novoSenha
    }

    public static toDataBase(
        nome : string,
        email : string,
        senha : string,
        tipo : TipoUsuario
    ): Omit<UserRawSQL, "id" | "criadoEm"> {
        return {
            nome : User.validarNome(nome),
            email : User.validarEmail(email),
            senha : User.validarSenha(senha),
            tipo
        }
    }
}