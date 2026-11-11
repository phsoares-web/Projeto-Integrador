// Resumo extrativo, sem serviços externos e sem acrescentar fatos à transcrição:
// 1. divide o texto completo em frases;
// 2. pontua as frases pela frequência de palavras relevantes;
// 3. seleciona os pontos mais informativos e os devolve na ordem original.

const STOPWORDS = new Set(
  (
    "a o e é de do da dos das em no na nos nas um uma uns umas para pra pro por pelo pela pelos pelas com sem " +
    "que se não sim mas ou como mais menos muito muita muitos muitas já também só então aí aqui ali lá isso isto " +
    "esse essa esses essas este esta estes estas aquele aquela aquilo ele ela eles elas eu tu você vocês nós vos " +
    "me te lhe nos lhes meu minha meus minhas seu sua seus suas nosso nossa ao aos à às quando onde qual quais " +
    "quem porque porquê pois foi ser são era eram está estão estava estavam tem têm tinha ter há haver vai vão " +
    "vou fazer faz fez feito pode podem tá né tipo coisa coisas gente bom boa bem assim ainda depois antes até " +
    "sobre entre cada todo toda todos todas outro outra outros outras mesmo mesma vez vezes agora hoje dia ok " +
    "certo olha ah eh hum uhum aula professor professora pessoal vamos vamo próxima próximo turma bom dia"
  ).split(/\s+/),
);

const normalizar = (palavra: string) => palavra.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const STOPWORDS_NORMALIZADAS = new Set([...STOPWORDS].map(normalizar));

function palavrasDe(frase: string): string[] {
  return (frase.match(/[\p{L}\p{N}]+/gu) ?? [])
    .map(normalizar)
    .filter((palavra) => palavra.length > 2 && !STOPWORDS_NORMALIZADAS.has(palavra));
}

function dividirEmFrases(texto: string): string[] {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (!limpo) return [];

  const frases = limpo.split(/(?<=[.!?…])\s+/).map((frase) => frase.trim()).filter(Boolean);
  const blocos = frases.flatMap((frase) => {
    const palavras = frase.split(/\s+/);
    if (palavras.length <= 35) return [frase];

    // Transcrições de voz podem chegar sem pontuação; quebra em blocos limitados,
    // mantendo a sequência original das palavras.
    const resultado: string[] = [];
    for (let indice = 0; indice < palavras.length; indice += 20) {
      resultado.push(palavras.slice(indice, indice + 20).join(" "));
    }
    return resultado;
  });

  return blocos.map((frase) => {
    const comMaiuscula = frase.charAt(0).toLocaleUpperCase("pt-BR") + frase.slice(1);
    return /[.!?…]$/.test(comMaiuscula) ? comMaiuscula : `${comMaiuscula}.`;
  });
}

export interface ResumoGerado {
  topicos: string[];
  palavrasChave: string[];
  texto: string;
}

export function gerarResumo(titulo: string, transcricao: string): ResumoGerado {
  const frases = dividirEmFrases(typeof transcricao === "string" ? transcricao : "");
  const tituloAula = typeof titulo === "string" && titulo.trim() ? titulo.trim() : "Aula";

  if (frases.length === 0) {
    const texto = `Resumo da aula: ${tituloAula}\n\nNenhuma transcrição disponível para resumir.`;
    return { topicos: [], palavrasChave: [], texto };
  }

  const frequencia = new Map<string, number>();
  const formaOriginal = new Map<string, string>();
  for (const frase of frases) {
    for (const bruta of frase.match(/[\p{L}\p{N}]+/gu) ?? []) {
      const palavra = normalizar(bruta);
      if (palavra.length <= 2 || STOPWORDS_NORMALIZADAS.has(palavra)) continue;
      frequencia.set(palavra, (frequencia.get(palavra) ?? 0) + 1);
      if (!formaOriginal.has(palavra)) formaOriginal.set(palavra, bruta.toLocaleLowerCase("pt-BR"));
    }
  }

  // Não espalha todas as frequências como argumentos de Math.max: textos extensos
  // poderiam exceder o limite de argumentos do JavaScript.
  let maiorFrequencia = 1;
  for (const ocorrencias of frequencia.values()) maiorFrequencia = Math.max(maiorFrequencia, ocorrencias);

  const pontuadas = frases.map((frase, indice) => {
    const palavras = palavrasDe(frase);
    const soma = palavras.reduce((total, palavra) => total + (frequencia.get(palavra) ?? 0) / maiorFrequencia, 0);
    // Divide pela raiz do tamanho para equilibrar frases curtas e longas.
    const pontuacao = palavras.length ? soma / Math.sqrt(palavras.length) : 0;
    return { frase, indice, pontuacao, tamanho: palavras.length };
  });

  // Se todas as frases contiverem apenas palavras comuns/curtas, ainda é melhor
  // selecionar trechos reais na ordem original do que devolver um resumo vazio.
  const candidatas = pontuadas.some((frase) => frase.tamanho > 0)
    ? pontuadas.filter((frase) => frase.tamanho > 0)
    : pontuadas;
  const quantidade = Math.min(8, Math.max(1, Math.round(candidatas.length * 0.3)));
  const topicos = [...candidatas]
    .sort((a, b) => b.pontuacao - a.pontuacao || a.indice - b.indice)
    .slice(0, quantidade)
    .sort((a, b) => a.indice - b.indice)
    .map((frase) => frase.frase);

  const palavrasChave = [...frequencia.entries()]
    .filter(([, ocorrencias]) => ocorrencias > 1 || frequencia.size < 6)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([palavra]) => formaOriginal.get(palavra) ?? palavra);

  const linhas = [`Resumo da aula: ${tituloAula}`, "", "Principais pontos:", ...topicos.map((topico) => `• ${topico}`)];
  if (palavrasChave.length) linhas.push("", `Palavras-chave: ${palavrasChave.join(", ")}.`);

  return { topicos, palavrasChave, texto: linhas.join("\n") };
}
