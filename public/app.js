const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const $ = (seletor) => document.querySelector(seletor);

const startButton = $("#start-button");
const pauseButton = $("#pause-button");
const resumeButton = $("#resume-button");
const finishButton = $("#finish-button");
const clearButton = $("#clear-button");
const statusEl = $("#status");
const recordingIndicator = $("#recording-indicator");
const transcriptBox = $("#transcript");
const placeholder = $("#transcript-placeholder");
const finalTranscript = $("#final-transcript");
const interimTranscript = $("#interim-transcript");
const guia = $("#guia");
const medidor = $("#medidor");
const barrasMedidor = medidor ? [...medidor.children] : [];
const medidorTexto = $("#medidor-texto");
const alertaSilencio = $("#alerta-silencio");

// Só existem para aluno/professor logado.
const formSalvar = $("#form-salvar");
const botaoSalvar = $("#botao-salvar");
const campoDisciplina = $("#disciplina");

const SILENCIO_ALERTA_MS = 12000;
const ERROS_FATAIS = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);
const TAMANHOS = [16, 18, 21, 24, 28, 32];

let recognition = null;
let estado = "idle"; // idle | recording | paused | finalizing | finalized | interrupted | error | unsupported
let recognitionRunning = false;
let aulaSalva = false;
let disciplinasCarregadas = false;
let erroFatal = false;
let ultimaFalaEm = 0;
let tentativasRede = 0;
let timerSilencio;
let timerReinicio;
let audio = null; // { contexto, stream, quadro }
let finaisDaSessao = new Map();
let ultimaFraseFinal = "";
let horaUltimaFraseFinal = 0;

/* ---------- Utilidades e recuperação do rascunho ---------- */

const normalizar = (texto) => texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const textoFinal = () => finalTranscript.textContent.trim();
const textoAtual = () => [textoFinal(), interimTranscript.textContent.trim()].filter(Boolean).join(" ").trim();
const setStatus = (mensagem) => (statusEl.textContent = mensagem);
const vibrar = (padrao) => navigator.vibrate?.(padrao);
const guardar = (chave, valor) => { try { localStorage.setItem(chave, valor); } catch {} };
const ler = (chave) => { try { return localStorage.getItem(chave); } catch { return null; } };

function idDaSessaoVisitante() {
  const chave = "transcreve:rascunho-visitante-id";
  try {
    let id = sessionStorage.getItem(chave);
    if (!id) {
      id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(chave, id);
    }
    return id;
  } catch {
    return "aba-atual";
  }
}

const idUsuario = document.body.dataset.transcricaoUsuario || "visitante";
const chaveRascunho = `transcreve:rascunho:v1:${idUsuario === "visitante" ? idDaSessaoVisitante() : idUsuario}`;

function salvarRascunho() {
  if (aulaSalva) return;
  const final = textoFinal();
  const provisoria = interimTranscript.textContent.trim();
  if (!final && !provisoria) {
    try { localStorage.removeItem(chaveRascunho); } catch {}
    return;
  }
  const rascunho = { versao: 1, final, provisoria, atualizadoEm: new Date().toISOString() };
  try { localStorage.setItem(chaveRascunho, JSON.stringify(rascunho)); } catch {}
}

function removerRascunho() {
  try { localStorage.removeItem(chaveRascunho); } catch {}
}

function recuperarRascunho() {
  const salvo = ler(chaveRascunho);
  if (!salvo) return false;
  try {
    const rascunho = JSON.parse(salvo);
    if (rascunho.versao !== 1 || typeof rascunho.final !== "string" || typeof rascunho.provisoria !== "string") return false;
    finalTranscript.textContent = rascunho.final;
    interimTranscript.textContent = rascunho.provisoria;
    estado = "interrupted";
    const data = new Date(rascunho.atualizadoEm);
    const quando = Number.isNaN(data.getTime()) ? "" : ` (${data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})`;
    setStatus(`Rascunho recuperado${quando}. Revise o texto e retome ou finalize a transcrição.`);
    return Boolean(rascunho.final.trim() || rascunho.provisoria.trim());
  } catch {
    removerRascunho();
    return false;
  }
}

function atualizarEstado() {
  const temTexto = textoAtual().length > 0;
  const emAndamento = ["recording", "paused", "finalizing"].includes(estado);
  placeholder.hidden = temTexto;
  clearButton.disabled = !temTexto || emAndamento;
  startButton.hidden = ["recording", "paused", "finalizing"].includes(estado);
  pauseButton.hidden = estado !== "recording";
  resumeButton.hidden = estado !== "paused";
  finishButton.hidden = !["recording", "paused", "finalizing"].includes(estado);
  finishButton.disabled = estado === "finalizing";
  resumeButton.disabled = recognitionRunning;
  startButton.disabled = !recognition;
  recordingIndicator.classList.toggle("is-visible", estado === "recording");
  recordingIndicator.setAttribute("aria-hidden", String(estado !== "recording"));
  startButton.setAttribute("aria-pressed", String(estado === "recording"));
  const disciplinaSelecionada = !formSalvar || (disciplinasCarregadas && Boolean(campoDisciplina?.value));
  if (botaoSalvar) botaoSalvar.disabled = textoAtual().length < 5 || emAndamento || !disciplinaSelecionada;
}

// Cada trecho finalizado vira uma frase, sem repetir texto que o reconhecimento
// devolva novamente após uma interrupção ou reinício automático.
function comoFrase(trecho) {
  const limpo = trecho.trim().replace(/\s+/g, " ");
  if (!limpo) return "";
  const comMaiuscula = limpo.charAt(0).toLocaleUpperCase("pt-BR") + limpo.slice(1);
  return /[.!?…]$/.test(comMaiuscula) ? comMaiuscula : `${comMaiuscula}.`;
}

function chaveDePalavras(texto) {
  return normalizar(texto).replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).filter(Boolean);
}

function adicionarResultadoFinal(trecho) {
  let frase = comoFrase(trecho);
  if (!frase) return;

  const assinatura = chaveDePalavras(frase).join(" ");
  const agora = Date.now();
  if (!assinatura) return;

  const existentes = chaveDePalavras(textoFinal());
  const recebidas = chaveDePalavras(frase);
  const terminaComFrase = recebidas.length <= existentes.length &&
    recebidas.every((palavra, indice) => existentes[existentes.length - recebidas.length + indice] === palavra);
  if (terminaComFrase) return;

  // Elimina uma sobreposição de duas ou mais palavras entre o fim já guardado e
  // o começo do novo resultado, preservando o restante da fala.
  let sobreposicao = 0;
  const maxSobreposicao = Math.min(8, existentes.length, recebidas.length);
  for (let tamanho = maxSobreposicao; tamanho >= 2; tamanho -= 1) {
    const fim = existentes.slice(-tamanho);
    if (fim.every((palavra, indice) => palavra === recebidas[indice])) {
      sobreposicao = tamanho;
      break;
    }
  }
  if (sobreposicao >= recebidas.length) return;
  if (sobreposicao) {
    const palavrasVisiveis = frase.match(/\S+/g) || [];
    frase = comoFrase(palavrasVisiveis.slice(sobreposicao).join(" "));
  }

  // Última proteção para eventos finais idênticos repetidos em sessões adjacentes.
  if (assinatura === ultimaFraseFinal && agora - horaUltimaFraseFinal < 4000) return;
  ultimaFraseFinal = assinatura;
  horaUltimaFraseFinal = agora;
  const noFim = estaNoFim();
  finalTranscript.textContent = `${textoFinal()}${textoFinal() ? " " : ""}${frase}`;
  salvarRascunho();
  atualizarEstado();
  rolarParaFim(noFim);
}

/* ---------- Rolagem e tamanho da letra ---------- */

function rolarParaFim(estavaNoFim) {
  if (estavaNoFim) transcriptBox.scrollTop = transcriptBox.scrollHeight;
}
const estaNoFim = () => transcriptBox.scrollHeight - transcriptBox.scrollTop - transcriptBox.clientHeight < 40;

let indiceTamanho = Math.max(0, TAMANHOS.indexOf(Number(ler("transcreve:letra")) || 16));
function aplicarTamanho() {
  transcriptBox.style.setProperty("--tamanho-transcricao", `${TAMANHOS[indiceTamanho]}px`);
  document.querySelectorAll("[data-letra]").forEach((botao) => {
    const passo = Number(botao.dataset.letra);
    botao.disabled = (passo < 0 && indiceTamanho === 0) || (passo > 0 && indiceTamanho === TAMANHOS.length - 1);
  });
}
document.querySelectorAll("[data-letra]").forEach((botao) => botao.addEventListener("click", () => {
  indiceTamanho = Math.min(TAMANHOS.length - 1, Math.max(0, indiceTamanho + Number(botao.dataset.letra)));
  guardar("transcreve:letra", String(TAMANHOS[indiceTamanho]));
  aplicarTamanho();
}));
aplicarTamanho();

/* ---------- Medidor de som ---------- */

async function ligarMedidor() {
  if (!medidor || audio || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const AudioContexto = window.AudioContext || window.webkitAudioContext;
    if (!AudioContexto) throw new Error("AudioContext indisponível");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const contexto = new AudioContexto();
    const analisador = contexto.createAnalyser();
    analisador.fftSize = 512;
    contexto.createMediaStreamSource(stream).connect(analisador);
    const dados = new Uint8Array(analisador.fftSize);
    audio = { contexto, stream, quadro: 0 };
    medidor.classList.add("ativo");

    const desenhar = () => {
      if (!audio) return;
      analisador.getByteTimeDomainData(dados);
      let soma = 0;
      for (const valor of dados) soma += ((valor - 128) / 128) ** 2;
      const nivel = Math.min(1, Math.sqrt(soma / dados.length) * 4);
      const acesas = Math.round(nivel * barrasMedidor.length);
      barrasMedidor.forEach((barra, indice) => barra.classList.toggle("acesa", indice < acesas));
      medidor.setAttribute("aria-valuenow", String(Math.round(nivel * 100)));
      medidorTexto.textContent = nivel > 0.12 ? "Captando som" : "Silêncio na sala";
      medidorTexto.classList.toggle("captando", nivel > 0.12);
      audio.quadro = requestAnimationFrame(desenhar);
    };
    desenhar();
  } catch {
    if (medidorTexto) medidorTexto.textContent = "Medidor indisponível";
  }
}

function desligarMedidor() {
  if (audio) {
    cancelAnimationFrame(audio.quadro);
    audio.stream.getTracks().forEach((trilha) => trilha.stop());
    audio.contexto.close().catch(() => {});
    audio = null;
  }
  if (!medidor) return;
  medidor.classList.remove("ativo");
  barrasMedidor.forEach((barra) => barra.classList.remove("acesa"));
  medidor.setAttribute("aria-valuenow", "0");
  medidorTexto.textContent = "Microfone desligado";
  medidorTexto.classList.remove("captando");
}

/* ---------- Aviso de silêncio ---------- */

function vigiarSilencio() {
  clearInterval(timerSilencio);
  ultimaFalaEm = Date.now();
  timerSilencio = setInterval(() => {
    if (alertaSilencio) alertaSilencio.hidden = estado !== "recording" || Date.now() - ultimaFalaEm < SILENCIO_ALERTA_MS;
  }, 1000);
}
function pararVigia() {
  clearInterval(timerSilencio);
  if (alertaSilencio) alertaSilencio.hidden = true;
}

/* ---------- Reconhecimento de voz ---------- */

function iniciarReconhecimento() {
  if (!recognition || recognitionRunning || estado !== "recording") return;
  try {
    recognitionRunning = true;
    recognition.start();
  } catch (erro) {
    recognitionRunning = false;
    estado = "error";
    desligarMedidor();
    pararVigia();
    setStatus("Não foi possível iniciar o reconhecimento. Verifique a permissão do microfone e tente novamente.");
    console.error("Falha ao iniciar o reconhecimento de voz:", erro);
    atualizarEstado();
  }
}

function iniciar() {
  if (!recognition || ["recording", "paused", "finalizing"].includes(estado)) return;
  erroFatal = false;
  tentativasRede = 0;
  clearTimeout(timerReinicio);
  // Um resultado provisório recuperado é preservado como texto definitivo antes
  // de iniciar outra sessão, para que um novo interim não o substitua.
  if (interimTranscript.textContent.trim()) {
    adicionarResultadoFinal(interimTranscript.textContent);
    interimTranscript.textContent = "";
  }
  estado = "recording";
  setStatus("Ligando o microfone...");
  atualizarEstado();
  ligarMedidor();
  vigiarSilencio();
  iniciarReconhecimento();
}

function pausar() {
  if (estado !== "recording") return;
  estado = "paused";
  setStatus("Transcrição pausada. O texto reconhecido foi preservado.");
  desligarMedidor();
  pararVigia();
  salvarRascunho();
  atualizarEstado();
  if (recognitionRunning) {
    try { recognition.stop(); } catch (erro) { console.warn("Não foi possível pausar o reconhecimento:", erro); }
  }
}

function retomar() {
  if (estado !== "paused" || recognitionRunning) return;
  estado = "recording";
  setStatus("Retomando a transcrição...");
  atualizarEstado();
  ligarMedidor();
  vigiarSilencio();
  iniciarReconhecimento();
}

function finalizar(mensagem = "Transcrição finalizada.") {
  if (!["recording", "paused"].includes(estado)) return;
  clearTimeout(timerReinicio);
  estado = "finalizing";
  setStatus("Finalizando e preservando o último trecho...");
  desligarMedidor();
  pararVigia();
  atualizarEstado();
  if (recognitionRunning) {
    try { recognition.stop(); } catch (erro) {
      console.warn("Não foi possível encerrar o reconhecimento:", erro);
      concluirFinalizacao(mensagem);
    }
  } else {
    concluirFinalizacao(mensagem);
  }
}

function concluirFinalizacao(mensagem = "Transcrição finalizada.") {
  if (interimTranscript.textContent.trim()) {
    adicionarResultadoFinal(interimTranscript.textContent);
    interimTranscript.textContent = "";
  }
  estado = "finalized";
  setStatus(mensagem);
  salvarRascunho();
  vibrar(80);
  atualizarEstado();
}

function falharReconhecimento(mensagem) {
  erroFatal = true;
  clearTimeout(timerReinicio);
  estado = "error";
  if (interimTranscript.textContent.trim()) {
    adicionarResultadoFinal(interimTranscript.textContent);
    interimTranscript.textContent = "";
  }
  setStatus(mensagem);
  desligarMedidor();
  pararVigia();
  salvarRascunho();
  atualizarEstado();
  if (recognitionRunning) {
    try { recognition.stop(); } catch {}
  }
}

try {
  if (SpeechRecognition) recognition = new SpeechRecognition();
} catch (erro) {
  console.error("A Web Speech API não pôde ser inicializada:", erro);
}

if (!recognition) {
  estado = "unsupported";
  startButton.disabled = true;
  setStatus("Este navegador não oferece reconhecimento de voz. Use o Google Chrome ou o Microsoft Edge; o texto não será simulado.");
} else {
  recognition.lang = "pt-BR";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.addEventListener("start", () => {
    recognitionRunning = true;
    finaisDaSessao = new Map();
    setStatus("Ouvindo a aula em português brasileiro. A fala aparecerá abaixo.");
    if (guia && guia.open && !ler("transcreve:guia-visto")) {
      guia.open = false;
      guardar("transcreve:guia-visto", "1");
    }
  });

  recognition.addEventListener("audiostart", () => vibrar([60, 60, 60]));

  recognition.addEventListener("result", (event) => {
    const noFim = estaNoFim();
    let provisoria = "";
    const inicio = Math.max(0, Number(event.resultIndex) || 0);
    for (let indice = inicio; indice < event.results.length; indice += 1) {
      const resultado = event.results[indice];
      const fala = resultado[0]?.transcript || "";
      if (resultado.isFinal) {
        const assinatura = chaveDePalavras(fala).join(" ");
        if (assinatura && finaisDaSessao.get(indice) !== assinatura) {
          finaisDaSessao.set(indice, assinatura);
          adicionarResultadoFinal(fala);
        }
      }
    }
    // Lê todos os resultados provisórios ativos para não apagar um trecho anterior
    // caso o navegador reporte somente o último índice alterado.
    for (let indice = 0; indice < event.results.length; indice += 1) {
      const resultado = event.results[indice];
      if (!resultado.isFinal) provisoria += resultado[0]?.transcript || "";
    }
    interimTranscript.textContent = provisoria.trim();
    salvarRascunho();
    ultimaFalaEm = Date.now();
    tentativasRede = 0;
    if (alertaSilencio) alertaSilencio.hidden = true;
    atualizarEstado();
    rolarParaFim(noFim);
  });

  recognition.addEventListener("error", (event) => {
    const mensagens = {
      "not-allowed": "O microfone está bloqueado. Permita o uso nas configurações do navegador e tente novamente.",
      "service-not-allowed": "O reconhecimento de voz não está disponível neste navegador agora.",
      "audio-capture": "Nenhum microfone foi encontrado. Verifique o microfone do aparelho.",
      "language-not-supported": "O navegador não oferece reconhecimento em português brasileiro (pt-BR).",
      network: "Conexão instável. Tentando reconectar...",
    };
    if (ERROS_FATAIS.has(event.error)) {
      falharReconhecimento(mensagens[event.error]);
      return;
    }
    if (event.error === "network") {
      tentativasRede += 1;
      setStatus(mensagens.network);
      if (tentativasRede > 5) falharReconhecimento("Sem conexão com a internet. O texto reconhecido foi preservado; verifique o Wi-Fi e retome a transcrição.");
    }
    // "no-speech" e "aborted" podem ocorrer durante uso normal; o evento end decide se reinicia.
  });

  recognition.addEventListener("end", () => {
    recognitionRunning = false;
    if (interimTranscript.textContent.trim()) {
      adicionarResultadoFinal(interimTranscript.textContent);
      interimTranscript.textContent = "";
    }
    salvarRascunho();
    atualizarEstado();

    if (estado === "finalizing") {
      concluirFinalizacao();
      return;
    }
    if (estado === "paused" || estado === "error" || estado === "unsupported" || estado !== "recording" || erroFatal) return;
    if (tentativasRede > 5) {
      falharReconhecimento("Sem conexão com a internet. O texto reconhecido foi preservado; verifique o Wi-Fi e retome a transcrição.");
      return;
    }

    clearTimeout(timerReinicio);
    timerReinicio = setTimeout(() => {
      if (estado === "recording") iniciarReconhecimento();
    }, tentativasRede ? 1000 * tentativasRede : 300);
  });
}

startButton.addEventListener("click", iniciar);
pauseButton.addEventListener("click", pausar);
resumeButton.addEventListener("click", retomar);
finishButton.addEventListener("click", () => finalizar());

clearButton.addEventListener("click", () => {
  if (["recording", "paused", "finalizing"].includes(estado)) return;
  finalTranscript.textContent = "";
  interimTranscript.textContent = "";
  estado = recognition ? "idle" : "unsupported";
  removerRascunho();
  setStatus(recognition ? "Pronto para transcrever" : "Este navegador não oferece reconhecimento de voz.");
  atualizarEstado();
});

// Primeira visita: guia aberto. Depois do primeiro uso, começa recolhido.
if (guia && ler("transcreve:guia-visto")) guia.open = false;
recuperarRascunho();

window.addEventListener("pagehide", salvarRascunho);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") salvarRascunho();
});

/* ---------- Salvar a aula ---------- */

if (formSalvar) {
  const campoTitulo = document.querySelector("#titulo");
  const mensagem = document.querySelector("#salvar-mensagem");

  const mostrar = (texto, tipo) => {
    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;
    mensagem.hidden = false;
  };

  campoDisciplina.disabled = true;
  App.api("/api/texto/disciplinas")
    .then((disciplinas) => {
      campoDisciplina.replaceChildren();
      const opcaoInicial = document.createElement("option");
      opcaoInicial.value = "";
      opcaoInicial.textContent = disciplinas.length ? "Selecione uma disciplina" : "Nenhuma disciplina disponível";
      campoDisciplina.append(opcaoInicial);
      for (const disciplina of disciplinas) {
        const opcao = document.createElement("option");
        opcao.value = String(disciplina.id);
        opcao.textContent = disciplina.nome;
        campoDisciplina.append(opcao);
      }
      disciplinasCarregadas = true;
      campoDisciplina.disabled = disciplinas.length === 0;
      if (disciplinas.length === 1) campoDisciplina.value = String(disciplinas[0].id);
      if (!disciplinas.length) mostrar("Sua conta ainda não tem disciplinas disponíveis. A aula só pode ser salva após o vínculo a uma disciplina.", "erro");
      atualizarEstado();
    })
    .catch((erro) => {
      campoDisciplina.replaceChildren();
      const opcao = document.createElement("option");
      opcao.value = "";
      opcao.textContent = "Não foi possível carregar as disciplinas";
      campoDisciplina.append(opcao);
      mostrar(erro.message || "Não foi possível carregar as disciplinas.", "erro");
      disciplinasCarregadas = false;
      atualizarEstado();
    });
  campoDisciplina.addEventListener("change", atualizarEstado);

  formSalvar.addEventListener("submit", async (event) => {
    event.preventDefault();
    mensagem.hidden = true;
    if (["recording", "paused", "finalizing"].includes(estado)) {
      mostrar("Finalize a transcrição antes de salvar a aula.", "erro");
      return;
    }

    const titulo = campoTitulo.value.trim();
    if (titulo.length < 3) {
      mostrar("Dê um título com pelo menos 3 caracteres.", "erro");
      campoTitulo.focus();
      return;
    }
    const disciplinaId = Number(campoDisciplina.value);
    if (!Number.isInteger(disciplinaId) || disciplinaId <= 0) {
      mostrar("Selecione uma disciplina disponível para associar à aula.", "erro");
      campoDisciplina.focus();
      return;
    }
    const transcricao = textoAtual();
    if (transcricao.length < 5) {
      mostrar("A transcrição precisa ter pelo menos 5 caracteres para ser salva.", "erro");
      return;
    }

    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";
    try {
      const aula = await App.api("/api/texto", {
        metodo: "POST",
        corpo: { titulo, texto: transcricao, disciplinaId },
      });
      aulaSalva = true;
      removerRascunho();
      mostrar("Aula salva! Abrindo para você criar o resumo...", "sucesso");
      setTimeout(() => (window.location.href = `/minhas-aulas?aula=${aula.id}`), 700);
    } catch (erro) {
      mostrar(erro.message, "erro");
      botaoSalvar.textContent = "Salvar aula";
      atualizarEstado();
    }
  });
}

atualizarEstado();
