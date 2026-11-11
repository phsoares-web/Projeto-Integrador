import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "./prisma";
import { TipoUsuario, User, type UserRawSQL } from "../models/user.models";

const NOME_COOKIE = "transcreve_sessao";
const DURACAO_PADRAO_MS = 12 * 60 * 60 * 1000; // 12 horas
const DURACAO_LEMBRAR_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

const segredo = (() => {
  const doAmbiente = process.env.SESSION_SECRET;
  if (doAmbiente && doAmbiente.length >= 32) return doAmbiente;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Defina SESSION_SECRET (mínimo de 32 caracteres) no ambiente de produção.");
  }
  console.warn("[sessao] SESSION_SECRET não definido: usando um segredo temporário (os logins expiram ao reiniciar o servidor).");
  return randomBytes(32).toString("hex");
})();

const assinar = (valor: string) => createHmac("sha256", segredo).update(valor).digest("base64url");

function criarToken(usuarioId: number, expiraEm: number): string {
  const corpo = Buffer.from(JSON.stringify({ id: usuarioId, exp: expiraEm })).toString("base64url");
  return `${corpo}.${assinar(corpo)}`;
}

function lerToken(token: string): number | null {
  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return null;

  const esperada = Buffer.from(assinar(corpo));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;

  try {
    const { id, exp } = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8"));
    if (!Number.isInteger(id) || typeof exp !== "number" || exp < Date.now()) return null;
    return id;
  } catch {
    return null;
  }
}

function lerCookie(req: Request, nome: string): string | null {
  const cabecalho = req.headers.cookie;
  if (!cabecalho) return null;
  for (const parte of cabecalho.split(";")) {
    const [chave, ...resto] = parte.trim().split("=");
    if (chave === nome) return decodeURIComponent(resto.join("="));
  }
  return null;
}

export function iniciarSessao(res: Response, usuarioId: number, lembrar: boolean): void {
  const duracao = lembrar ? DURACAO_LEMBRAR_MS : DURACAO_PADRAO_MS;
  res.cookie(NOME_COOKIE, criarToken(usuarioId, Date.now() + duracao), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Sem "lembrar", o cookie some ao fechar o navegador.
    ...(lembrar ? { maxAge: duracao } : {}),
  });
}

export function encerrarSessao(res: Response): void {
  res.clearCookie(NOME_COOKIE, { path: "/" });
}

/** Página inicial de cada tipo de conta depois do login. */
export const destinoPorTipo = (tipo: TipoUsuario): string =>
  tipo === TipoUsuario.ADMIN ? "/admin" : "/minhas-aulas";

/** Lê o cookie e deixa o usuário logado em req.usuario e res.locals.usuario (para as views). */
export async function carregarUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
  res.locals.usuario = null;
  const token = lerCookie(req, NOME_COOKIE);
  const id = token ? lerToken(token) : null;
  if (id === null) return next();

  try {
    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (usuario) {
      req.usuario = User.toPublic(usuario as UserRawSQL);
      res.locals.usuario = req.usuario;
    } else {
      encerrarSessao(res); // conta excluída
    }
    next();
  } catch (erro) {
    next(erro);
  }
}

/* ----- Guardas da API (respondem JSON) ----- */

export function exigirLogin(req: Request, res: Response, next: NextFunction): void {
  if (!req.usuario) {
    res.status(401).json({ erro: "Faça login para continuar." });
    return;
  }
  next();
}

export const exigirTipo = (...tipos: TipoUsuario[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ erro: "Faça login para continuar." });
      return;
    }
    if (!tipos.includes(req.usuario.tipo)) {
      res.status(403).json({ erro: "Você não tem permissão para esta ação." });
      return;
    }
    next();
  };

/* ----- Guardas das páginas (redirecionam) ----- */

export const paginaExigeTipo = (...tipos: TipoUsuario[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.redirect(`/login?voltar=${encodeURIComponent(req.originalUrl)}`);
      return;
    }
    if (!tipos.includes(req.usuario.tipo)) {
      res.redirect(destinoPorTipo(req.usuario.tipo));
      return;
    }
    next();
  };

export function paginaSomenteVisitante(req: Request, res: Response, next: NextFunction): void {
  if (req.usuario) {
    res.redirect(destinoPorTipo(req.usuario.tipo));
    return;
  }
  next();
}
