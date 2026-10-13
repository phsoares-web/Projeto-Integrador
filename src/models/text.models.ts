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
        data?: Date,
        materia?: string,
    ){
        this.id = this.validarId(id);
        this.profId = this.validarId(profId);
        this._titulo = this.validarTitulo(titulo);
        this._texto = this.validarTexto(texto);
        if(data) 
        this._data = data;
        if(materia)
        this._materia = materia;
    }

    get titulo(): string { return this._titulo}
    get texto(): string { return this._texto}
    get data(): Date | null { return this._data }
    get materia(): string | null { return this._materia }

    set titulo(newTitulo: string) { this._titulo = this.validarTitulo(newTitulo) }
    set texto(newTexto: string) { this._texto = this.validarTexto(newTexto)}    

    private validarId(id: number): number {
        const erros: string[] = []
        if(isNaN(id)) erros.push("Não é um Número")
        if(!Number.isInteger(id)) erros.push("Não é inteiro")
        if(id <= 0) erros.push("Não é positivo")
        if(erros.length > 0) throw new Error("O id é inválido pois: " + erros.join(", "))

        return id
    }
    private validarTitulo(titulo: string): string {
        if(!titulo || typeof titulo !== "string") throw new Error("Título é obtigatório")

        const novoTitulo = titulo.trim()

        if(novoTitulo.length < 3) throw new Error("Título muito curto")
        if(novoTitulo.length > 75) throw new Error("Título muito longo")

        return novoTitulo
    }
    private validarTexto(texto: string): string {
        if(!texto || typeof texto !== "string") throw new Error("Texto é obrigatório")

        const novoTexto = texto.trim()

        if(novoTexto.length < 5) throw new Error("Texto muito curto")
        
        return novoTexto
    }

    public toDataBase(): TextRawSQL {
        return {
            id : this.id,
            prof_id : this.profId,
            titulo : this.titulo,
            texto : this.texto,
            data : this._data ? this._data.toISOString().slice(0, 10) : null,
            materia : this.materia
        }
    }
}