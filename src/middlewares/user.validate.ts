import { z } from "zod";

// Validação para a rota de cadastro (valida req.body)
export const cadastrarSchema = z.object({
    body: z.object({
        nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
        email: z.string().email("E-mail inválido"),
        senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
        tipo: z.string().optional().nullable()
    })
});

// Validação para a rota de login (valida req.body)
export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("E-mail inválido"),
        senha: z.string().min(1, "A senha é obrigatória")
    })
});

// Validação para o parâmetro ID (valida req.params)
export const idUserParamSchema = z.object({
    params: z.object({
        id: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
            message: "ID de usuário inválido"
        })
    })
});