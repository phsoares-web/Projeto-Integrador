import type { NextFunction, Request, Response } from "express";

/**
 * Limitador de tentativas em memória (sem dependências).
 * Conta eventos por chave dentro de uma janela de tempo e bloqueia quando passa do máximo.
 *
 * Observação: como fica em memória, o contador zera ao reiniciar o servidor e não é
 * compartilhado entre várias instâncias. Para um único servidor (caso deste projeto) é suficiente.
 */
export class LimiteTentativas {
  private readonly registros = new Map<string, { quantidade: number; expiraEm: number }>();

  constructor(
    private readonly maximo: number,
    private readonly janelaMs: number,
  ) {
    // Limpa registros vencidos para a memória não crescer sem parar.
    setInterval(() => {
      const agora = Date.now();
      for (const [chave, registro] of this.registros) {
        if (registro.expiraEm <= agora) this.registros.delete(chave);
      }
    }, 60_000).unref();
  }

  /** Segundos que faltam para liberar a chave (0 = liberada). */
  public bloqueadoPor(chave: string): number {
    const registro = this.registros.get(chave);
    if (!registro || registro.expiraEm <= Date.now()) return 0;
    return registro.quantidade >= this.maximo ? Math.ceil((registro.expiraEm - Date.now()) / 1000) : 0;
  }

  public registrar(chave: string): void {
    const agora = Date.now();
    const registro = this.registros.get(chave);
    if (!registro || registro.expiraEm <= agora) {
      this.registros.set(chave, { quantidade: 1, expiraEm: agora + this.janelaMs });
    } else {
      registro.quantidade += 1;
    }
  }

  public limpar(chave: string): void {
    this.registros.delete(chave);
  }
}

const MINUTO = 60_000;

/** Erros de senha por conta (e-mail + IP): 5 erros → 15 minutos bloqueado. */
export const falhasDeLogin = new LimiteTentativas(5, 15 * MINUTO);
/** Tentativas de login por IP (certas ou erradas): protege contra testar muitas contas. */
export const loginsPorIp = new LimiteTentativas(30, 15 * MINUTO);
/** Contas criadas por IP: 5 por hora. */
export const cadastrosPorIp = new LimiteTentativas(5, 60 * MINUTO);

export const ipDe = (req: Request): string => req.ip ?? req.socket.remoteAddress ?? "desconhecido";

const formatarEspera = (segundos: number): string => {
  const minutos = Math.ceil(segundos / 60);
  return minutos <= 1 ? "1 minuto" : `${minutos} minutos`;
};

export function responderBloqueio(res: Response, segundos: number, motivo: string): void {
  res.setHeader("Retry-After", String(segundos));
  res.status(429).json({ erro: `${motivo} Tente novamente em ${formatarEspera(segundos)}.`, tenteEmSegundos: segundos });
}

/** Middleware genérico: conta toda requisição na rota e bloqueia quando passar do limite. */
export const limitarPorIp = (limite: LimiteTentativas, motivo: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const chave = ipDe(req);
    const espera = limite.bloqueadoPor(chave);
    if (espera > 0) return responderBloqueio(res, espera, motivo);
    limite.registrar(chave);
    next();
  };
