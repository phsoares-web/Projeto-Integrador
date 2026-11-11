import * as bcrypt from "bcrypt"

const SALT_ROUNDS = 10

export async function cadastrar(senha: string): Promise<string> {
    return await bcrypt.hash(senha, SALT_ROUNDS)
}
export async function login(senha: string, senhaHash: string): Promise<boolean> {
    return await bcrypt.compare(senha, senhaHash)
}