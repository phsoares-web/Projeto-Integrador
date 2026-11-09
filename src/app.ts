import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { router as textRouter } from "./routers/text.routers";
import { router as userRouter } from "./routers/user.routers";
import { router as pageRouter } from "./routers/pages.routers";
import { router as adminRouter } from "./routers/admin.routers";
import { carregarUsuario } from "./lib/sessao";

const app = express();
const publicDirectory = path.resolve(process.cwd(), "public");

app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), "src/views"));
app.disable("x-powered-by"); // não anuncia que o servidor é Express

// Atrás de um proxy (Nginx, Render, Railway...), defina TRUST_PROXY=1 para que req.ip
// seja o IP real do visitante — o limite de tentativas de login depende disso.
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// Cabeçalhos de segurança básicos.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY"); // impede o site de ser embutido em outro (clickjacking)
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "microphone=(self), camera=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// Arquivos estáticos não precisam consultar a sessão.
app.use(express.static(publicDirectory, { index: false }));

// Proteção contra CSRF: pedidos que alteram dados só são aceitos quando vêm deste
// próprio site (o navegador envia o cabeçalho Origin e não deixa outro site falsificá-lo).
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origem = req.get("origin");
  if (origem) {
    let hostOrigem = "";
    try { hostOrigem = new URL(origem).host; } catch { /* origem inválida */ }
    if (hostOrigem !== req.get("host")) {
      res.status(403).json({ erro: "Requisição bloqueada: origem não permitida." });
      return;
    }
  }
  if (req.method !== "DELETE" && req.method !== "POST" && !req.is("application/json")) {
    res.status(415).json({ erro: "Envie os dados em JSON (Content-Type: application/json)." });
    return;
  }
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(carregarUsuario);

app.use("/api/admin", adminRouter);
app.use("/api", textRouter);
app.use("/api", userRouter);

// Qualquer rota /api que não exista responde em JSON, não em HTML.
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.use("/", pageRouter);

// Corpo JSON malformado ou outros erros inesperados.
app.use((erro: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status = (erro as { status?: number })?.status;
  if (status === 400 || (erro as { type?: string })?.type === "entity.parse.failed") {
    res.status(400).json({ erro: "Corpo da requisição inválido (JSON malformado)." });
    return;
  }
  if (status === 413) {
    res.status(413).json({ erro: "Conteúdo muito grande." });
    return;
  }
  console.error(`Erro não tratado em ${req.method} ${req.originalUrl}:`, erro);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

export default app;
