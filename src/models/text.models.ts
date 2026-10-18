export interface TextRawSQL {
    id: number;
    prof_id: number;
    titulo: string;
    texto: string;
    data: string | null;
    materia: string | null;
}

export class Text {
    public readonly id: number;
    public readonly profId: number;
    private _titulo: string;
    private _texto: string;
    private _data: Date | null = null;
    private _materia: string | null = null;

    constructor(
        id: number,
        profId: number,
        titulo: string,
        texto: string,
        data: Date | null = null,
        materia: string | null = null,
    ){
        this.id = Text.validarId(id);
        this.profId = Text.validarId(profId);
        this._titulo = Text.validarTitulo(titulo);
        this._texto = Text.validarTexto(texto);
        this._data = data;
        this._materia = materia;
    }

    get titulo(): string { return this._titulo}
    get texto(): string { return this._texto}
    get data(): Date | null { return this._data }
    get materia(): string | null { return this._materia }

    set titulo(newTitulo: string) { this._titulo = Text.validarTitulo(newTitulo) }
    set texto(newTexto: string) { this._texto = Text.validarTexto(newTexto)}    

    private static validarId(id: number): number {
        const erros: string[] = []
        if(isNaN(id)) erros.push("Não é um Número")
        if(!Number.isInteger(id)) erros.push("Não é inteiro")
        if(id <= 0) erros.push("Não é positivo")
        if(erros.length > 0) throw new Error("O id é inválido pois: " + erros.join(", "))

        return id
    }
    private static validarTitulo(titulo: string): string {
        if(!titulo || typeof titulo !== "string") throw new Error("Título é obtigatório")

        const novoTitulo = titulo.trim()

        if(novoTitulo.length < 3) throw new Error("Título muito curto")
        if(novoTitulo.length > 75) throw new Error("Título muito longo")

        return novoTitulo
    }
    private static validarTexto(texto: string): string {
        if(!texto || typeof texto !== "string") throw new Error("Texto é obrigatório")

        const novoTexto = texto.trim()

        if(novoTexto.length < 5) throw new Error("Texto muito curto")
        
        return novoTexto
    }

    public static toDataBase(
        profId: number,
        titulo: string,
        texto: string,
        data: Date | null = null,
        materia: string | null = null,
    ): Omit<TextRawSQL, "id"> {
        return {
            prof_id : Text.validarId(profId),
            titulo : Text.validarTitulo(titulo),
            texto : Text.validarTexto(texto),
            data : data ? data.toISOString().slice(0, 10) : null,
            materia
        }
    }
    public static fromDataBase(item: TextRawSQL): Text {
        const data = item.data ? new Date(item.data) : null
        return new Text(
            item.id,
            item.prof_id,
            item.titulo,
            item.texto,
            data,
            item.materia
        )
    }
}