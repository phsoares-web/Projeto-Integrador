import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

export function authMiddleware(req: Request & { user?: any }, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ erro: "Token não fornecido." });
    return;
  }

  const [, token] = authHeader.split(" ");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretexemplo");
    req.user = decoded; // Ex: { id: 1, email: "professor@email.com" }
    next();
  } catch (err) {
    res.status(401).json({ erro: "Token inválido." });
  }
}