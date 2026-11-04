import type { UsuarioPublico } from "../models/user.models";

declare global {
  namespace Express {
    interface Request {
      /** Usuário logado, preenchido pelo middleware carregarUsuario. */
      usuario?: UsuarioPublico;
    }
  }
}

export {};
