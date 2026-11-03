import { Request, Response, NextFunction } from "express";
import { ZodAny, ZodError } from "zod";

export const validate = (schema: ZodAny) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    erro: error.issues.map((e) => e.message),
                });
            }
            return res.status(500).json({ erro: "Erro de validação interna" });
        }
    };
};
