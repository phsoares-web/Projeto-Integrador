// Resumo extrativo simples, sem serviços externos:
// 1. divide a transcrição em frases;
// 2. pontua cada frase pela frequência das palavras relevantes (ignorando "stopwords");
// 3. devolve as frases mais importantes na ordem em que foram ditas + palavras-chave.

const STOPWORDS = new Set(
  (
    "a o e é de do da dos das em no na nos nas um uma uns umas para pra pro por pelo pela pelos pelas com sem " +
    "que se não sim mas ou como mais menos muito muita muitos muitas já também só então aí aqui ali lá isso isto " +
    "esse essa esses essas este esta estes estas aquele aquela aquilo ele ela eles elas eu tu você vocês nós vos " +
    "me te lhe nos lhes meu minha meus minhas seu sua seus suas nosso nossa ao aos à às quando onde qual quais " +
    "quem porque porquê pois foi ser são era eram está estão estava estavam tem têm tinha ter há haver vai vão " +
    "vou fazer faz fez feito pode podem tá né tipo coisa coisas gente bom boa bem assim ainda depois antes até " +
    "sobre entre cada todo toda todos todas outro outra outros outras mesmo mesma vez vezes agora hoje dia ok " +
    "certo olha ah eh hum uhum gente aula professor professora pessoal vamos vamo próxima próximo turma bom dia"
  ).split(/\s+/),
);

const normalizar = (palavra: string) =>
  palavra.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const STOPWORDS_NORMALIZADAS = new Set([...STOPWORDS].map(normalizar));

function palavrasDe(frase: string): string[] {
  return (frase.match(/[\p{L}\p{N}]+/gu) ?? [])
    .map(normalizar)
    .filter((p) => p.length > 2 && !STOPWORDS_NORMALIZADAS.has(p));
}

function dividirEmFrases(texto: string): string[] {
  const limpo = texto.replace(/\s+/g, " ").trim();
  let frases = limpo.split(/(?<=[.!?…])\s+/).map((f) => f.trim()).filter(Boolean);

  // Transcrições sem pontuação viram blocos de ~20 palavras.
  const quebrarLonga = (frase: string): string[] => {
    const palavras = frase.split(" ");
    if (palavras.length <= 35) return [frase];
    const blocos: string[] = [];
    for (let i = 0; i < palavras.length; i += 20) blocos.push(palavras.slice(i, i + 20).join(" "));
    return blocos;
  };
  frases = frases.flatMap(quebrarLonga);

  return frases.map((f) => {
    const comMaiuscula = f.charAt(0).toUpperCase() + f.slice(1);
    return /[.!?…]$/.test(comMaiuscula) ? comMaiuscula : `${comMaiuscula}.`;
  });
}

export interface ResumoGerado {
  topicos: string[];
  palavrasChave: string[];
  texto: string;
}

export function gerarResumo(titulo: string, transcricao: string): ResumoGerado {
  const frases = dividirEmFrases(transcricao);

  const frequencia = new Map<string, number>();
  const formaOriginal = new Map<string, string>();
  for (const frase of frases) {
    for (const bruta of frase.match(/[\p{L}\p{N}]+/gu) ?? []) {
      const p = normalizar(bruta);
      if (p.length <= 2 || STOPWORDS_NORMALIZADAS.has(p)) continue;
      frequencia.set(p, (frequencia.get(p) ?? 0) + 1);
      if (!formaOriginal.has(p)) formaOriginal.set(p, bruta.toLowerCase());
    }
  }
  const maiorFrequencia = Math.max(1, ...frequencia.values());

  const pontuadas = frases.map((frase, indice) => {
    const palavras = palavrasDe(frase);
    const soma = palavras.reduce((total, p) => total + (frequencia.get(p) ?? 0) / maiorFrequencia, 0);
    // Divide pela raiz do tamanho para não favorecer só frases longas.
    const pontuacao = palavras.length ? soma / Math.sqrt(palavras.length) : 0;
    return { frase, indice, pontuacao, tamanho: palavras.length };
  });

  const quantidade = Math.min(8, Math.max(1, Math.round(frases.length * 0.3)));
  const topicos = pontuadas
    .filter((f) => f.tamanho >= 3 || frases.length <= 3)
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, quantidade)
    .sort((a, b) => a.indice - b.indice)
    .map((f) => f.frase);

  const palavrasChave = [...frequencia.entries()]
    .filter(([, n]) => n > 1 || frequencia.size < 6)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([p]) => formaOriginal.get(p) ?? p);

  const linhas = [`Resumo da aula: ${titulo}`, "", "Principais pontos:", ...topicos.map((t) => `• ${t}`)];
  if (palavrasChave.length) linhas.push("", `Palavras-chave: ${palavrasChave.join(", ")}.`);

  return { topicos, palavrasChave, texto: linhas.join("\n") };
}
