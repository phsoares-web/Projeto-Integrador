export interface TextRawSQL {
  id: number;
  prof_id: number;
  titulo: string;
  texto: string;
  data: Date | null;
  materia: string | null;
  disciplinaId: number | null;
}

export class Text {
  public readonly id: number;
  public readonly profId: number;
  private _titulo: string;
  private _texto: string;
  private _data: Date | null;
  private _materia: string | null;
  private _disciplinaId: number | null;

  constructor(
    id: number,
    profId: number,
    titulo: string,
    texto: string,
    data: Date | null = null,
    materia: string | null = null,
    disciplinaId: number | null = null,
  ) {
    this.id = Text.validarId(id);
    this.profId = Text.validarId(profId);
    this._titulo = Text.validarTitulo(titulo);
    this._texto = Text.validarTexto(texto);
    this._data = data;
    this._materia = materia;
    this._disciplinaId = disciplinaId == null ? null : Text.validarId(disciplinaId);
  }

  get titulo(): string { return this._titulo; }
  get texto(): string { return this._texto; }
  get data(): Date | null { return this._data; }
  get materia(): string | null { return this._materia; }
  get disciplinaId(): number | null { return this._disciplinaId; }

  set titulo(novoTitulo: string) { this._titulo = Text.validarTitulo(novoTitulo); }
  set texto(novoTexto: string) { this._texto = Text.validarTexto(novoTexto); }

  private static validarId(id: number): number {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("O id deve ser um número inteiro positivo.");
    }
    return id;
  }

  private static validarTitulo(titulo: string): string {
    if (typeof titulo !== "string") throw new Error("O título é obrigatório.");
    const normalizado = titulo.trim();
    if (normalizado.length < 3) throw new Error("O título deve ter pelo menos 3 caracteres.");
    if (normalizado.length > 75) throw new Error("O título não pode ultrapassar 75 caracteres.");
    return normalizado;
  }

  private static validarTexto(texto: string): string {
    if (typeof texto !== "string" || texto.trim().length < 5) {
      throw new Error("O texto deve ter pelo menos 5 caracteres.");
    }
    return texto.trim();
  }

  public static toDataBase(
    profId: number,
    titulo: string,
    texto: string,
    data: Date | null = null,
    materia: string | null = null,
    disciplinaId: number | null = null,
  ): Omit<TextRawSQL, "id"> {
    const materiaNormalizada = materia == null ? null : String(materia).trim();
    if (materiaNormalizada !== null && materiaNormalizada.length > 100) {
      throw new Error("A matéria não pode ultrapassar 100 caracteres.");
    }
    return {
      prof_id: Text.validarId(profId),
      titulo: Text.validarTitulo(titulo),
      texto: Text.validarTexto(texto),
      data,
      materia: materiaNormalizada,
      disciplinaId: disciplinaId == null ? null : Text.validarId(disciplinaId),
    };
  }

  public static fromDataBase(item: TextRawSQL): Text {
    return new Text(item.id, item.prof_id, item.titulo, item.texto, item.data, item.materia, item.disciplinaId);
  }
}
