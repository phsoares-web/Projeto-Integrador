const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const $ = (seletor) => document.querySelector(seletor);

const startButton = $("#start-button");
const startButtonLabel = startButton.querySelector("span");
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

const SILENCIO_ALERTA_MS = 12000; // sem nenhuma palavra reconhecida por 12 s → aviso visual
const ERROS_FATAIS = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);

let recognition;
let isRecording = false; // o usuário pediu para transcrever (mesmo durante reinícios automáticos)
let erroFatal = false;
let ultimaFalaEm = 0;
let tentativasRede = 0;
let timerSilencio;

/* ---------- Utilidades ---------- */

const textoAtual = () => finalTranscript.textContent.trim();
const setStatus = (mensagem) => (statusEl.textContent = mensagem);
const vibrar = (padrao) => navigator.vibrate?.(padrao); // aviso tátil no celular

function guardar(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch {}
}
function ler(chave) {
  try { return localStorage.getItem(chave); } catch { return null; }
}

function atualizarEstado() {
  const temTexto = textoAtual().length > 0 || interimTranscript.textContent.length > 0;
  placeholder.hidden = temTexto;
  clearButton.disabled = !temTexto || isRecording;
  if (botaoSalvar) botaoSalvar.disabled = textoAtual().length < 5 || isRecording;
}

function setRecording(recording) {
  isRecording = recording;
  startButton.classList.toggle("is-recording", recording);
  recordingIndicator.classList.toggle("is-visible", recording);
  startButtonLabel.textContent = recording ? "Parar transcrição" : "Iniciar transcrição";
  atualizarEstado();
}

// Cada trecho reconhecido vira uma frase (maiúscula + ponto). Isso deixa o texto
// mais legível e ajuda o gerador de resumos a separar as ideias.
function comoFrase(trecho) {
  const limpo = trecho.trim();
  if (!limpo) return "";
  const comMaiuscula = limpo.charAt(0).toUpperCase() + limpo.slice(1);
  return /[.!?…]$/.test(comMaiuscula) ? comMaiuscula : `${comMaiuscula}.`;
}

// Rola para a última frase, a menos que o aluno tenha subido para reler algo.
function rolarParaFim(estavaNoFim) {
  if (estavaNoFim) transcriptBox.scrollTop = transcriptBox.scrollHeight;
}
const estaNoFim = () =>
  transcriptBox.scrollHeight - transcriptBox.scrollTop - transcriptBox.clientHeight < 40;

/* ---------- Tamanho da letra ---------- */

const TAMANHOS = [16, 18, 21, 24, 28, 32];
let indiceTamanho = Math.max(0, TAMANHOS.indexOf(Number(ler("transcreve:letra")) || 16));

function aplicarTamanho() {
  transcriptBox.style.setProperty("--tamanho-transcricao", `${TAMANHOS[indiceTamanho]}px`);
  document.querySelectorAll("[data-letra]").forEach((botao) => {
    const passo = Number(botao.dataset.letra);
    botao.disabled = (passo < 0 && indiceTamanho === 0) || (passo > 0 && indiceTamanho === TAMANHOS.length - 1);
  });
}
document.querySelectorAll("[data-letra]").forEach((botao) =>
  botao.addEventListener("click", () => {
    indiceTamanho = Math.min(TAMANHOS.length - 1, Math.max(0, indiceTamanho + Number(botao.dataset.letra)));
    guardar("transcreve:letra", String(TAMANHOS[indiceTamanho]));
    aplicarTamanho();
  }),
);
aplicarTamanho();

/* ---------- Medidor de som (mostra visualmente que o microfone capta a voz) ---------- */

let audio = null; // { contexto, stream, quadro }

async function ligarMedidor() {
  if (!medidor || audio || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const contexto = new (window.AudioContext || window.webkitAudioContext)();
    const analisador = contexto.createAnalyser();
    analisador.fftSize = 512;
    contexto.createMediaStreamSource(stream).connect(analisador);
    const dados = new Uint8Array(analisador.fftSize);
    audio = { contexto, stream, quadro: 0 };
    medidor.classList.add("ativo");

    const desenhar = () => {
      analisador.getByteTimeDomainData(dados);
      let soma = 0;
      for (const v of dados) soma += ((v - 128) / 128) ** 2;
      const nivel = Math.min(1, Math.sqrt(soma / dados.length) * 4); // 0..1
      const acesas = Math.round(nivel * barrasMedidor.length);
      barrasMedidor.forEach((barra, i) => barra.classList.toggle("acesa", i < acesas));
      medidor.setAttribute("aria-valuenow", String(Math.round(nivel * 100)));
      medidorTexto.textContent = nivel > 0.12 ? "Captando som" : "Silêncio na sala";
      medidorTexto.classList.toggle("captando", nivel > 0.12);
      audio.quadro = requestAnimationFrame(desenhar);
    };
    desenhar();
  } catch {
    medidorTexto.textContent = "Medidor indisponível";
  }
}

function desligarMedidor() {
  if (audio) {
    cancelAnimationFrame(audio.quadro);
    audio.stream.getTracks().forEach((t) => t.stop());
    audio.contexto.close();
    audio = null;
  }
  if (!medidor) return;
  medidor.classList.remove("ativo");
  barrasMedidor.forEach((b) => b.classList.remove("acesa"));
  medidor.setAttribute("aria-valuenow", "0");
  medidorTexto.textContent = "Microfone desligado";
  medidorTexto.classList.remove("captando");
}

/* ---------- Aviso de silêncio ---------- */

function vigiarSilencio() {
  clearInterval(timerSilencio);
  ultimaFalaEm = Date.now();
  timerSilencio = setInterval(() => {
    if (alertaSilencio) alertaSilencio.hidden = !isRecording || Date.now() - ultimaFalaEm < SILENCIO_ALERTA_MS;
  }, 1000);
}
function pararVigia() {
  clearInterval(timerSilencio);
  if (alertaSilencio) alertaSilencio.hidden = true;
}

/* ---------- Reconhecimento de voz ---------- */

function iniciar() {
  erroFatal = false;
  tentativasRede = 0;
  setRecording(true);
  setStatus("Ligando o microfone...");
  try {
    recognition.start();
  } catch (error) {
    console.error("Falha ao iniciar o reconhecimento de voz:", error);
  }
  ligarMedidor();
  vigiarSilencio();
}

function parar(mensagem = "Transcrição finalizada.") {
  setRecording(false);
  recognition.stop();
  desligarMedidor();
  pararVigia();
  interimTranscript.textContent = "";
  setStatus(mensagem);
  vibrar(80);
  atualizarEstado();
}

if (!SpeechRecognition) {
  startButton.disabled = true;
  setStatus("Este navegador não oferece reconhecimento de voz. Use o Google Chrome ou o Microsoft Edge.");
} else {
  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.addEventListener("start", () => {
    setStatus("Ouvindo a aula. A fala do professor vai aparecer abaixo.");
    if (guia && guia.open && !ler("transcreve:guia-visto")) {
      guia.open = false; // já começou: o guia pode recolher
      guardar("transcreve:guia-visto", "1");
    }
  });

  recognition.addEventListener("audiostart", () => vibrar([60, 60, 60]));

  recognition.addEventListener("result", (event) => {
    const noFim = estaNoFim();
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const text = result[0].transcript;
      if (result.isFinal) {
        const frase = comoFrase(text);
        if (frase) finalTranscript.textContent += `${frase} `;
      } else {
        interim += text;
      }
    }
    interimTranscript.textContent = interim;
    ultimaFalaEm = Date.now();
    tentativasRede = 0;
    if (alertaSilencio) alertaSilencio.hidden = true;
    atualizarEstado();
    rolarParaFim(noFim);
  });

  recognition.addEventListener("error", (event) => {
    const mensagens = {
      "not-allowed": "O microfone está bloqueado. Toque no cadeado ao lado do endereço do site e permita o microfone.",
      "service-not-allowed": "O reconhecimento de voz não está disponível neste navegador agora.",
      "audio-capture": "Nenhum microfone encontrado. Verifique se o aparelho tem microfone ligado.",
      "language-not-supported": "O português não está disponível no reconhecimento de voz deste navegador.",
      network: "Conexão instável. Tentando reconectar...",
    };
    if (ERROS_FATAIS.has(event.error)) {
      erroFatal = true;
      parar(mensagens[event.error]);
      return;
    }
    if (event.error === "network") {
      tentativasRede += 1;
      setStatus(mensagens.network);
    }
    // "no-speech" e "aborted" não são fatais: o reinício automático cuida disso.
  });

  // O navegador encerra o reconhecimento sozinho depois de um tempo ou de silêncio.
  // Se o aluno não pediu para parar, reinicia automaticamente.
  recognition.addEventListener("end", () => {
    interimTranscript.textContent = "";
    if (!isRecording || erroFatal) return;
    if (tentativasRede > 5) {
      parar("Sem conexão com a internet. Verifique o Wi-Fi e toque em “Iniciar transcrição” de novo.");
      return;
    }
    setTimeout(() => {
      if (!isRecording) return;
      try {
        recognition.start();
      } catch {
        /* já estava iniciando */
      }
    }, tentativasRede ? 1000 * tentativasRede : 250);
  });

  startButton.addEventListener("click", () => (isRecording ? parar() : iniciar()));
}

clearButton.addEventListener("click", () => {
  finalTranscript.textContent = "";
  interimTranscript.textContent = "";
  setStatus("Pronto para transcrever");
  atualizarEstado();
});

// Primeira visita: guia aberto. Depois do primeiro uso, começa recolhido (pode ser aberto de novo).
if (guia && ler("transcreve:guia-visto")) guia.open = false;

/* ---------- Salvar a aula ---------- */

if (formSalvar) {
  const campoTitulo = document.querySelector("#titulo");
  const campoMateria = document.querySelector("#materia");
  const mensagem = document.querySelector("#salvar-mensagem");

  const mostrar = (texto, tipo) => {
    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;
    mensagem.hidden = false;
  };

  formSalvar.addEventListener("submit", async (event) => {
    event.preventDefault();
    mensagem.hidden = true;

    const titulo = campoTitulo.value.trim();
    if (titulo.length < 3) {
      mostrar("Dê um título com pelo menos 3 caracteres.", "erro");
      campoTitulo.focus();
      return;
    }

    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";
    try {
      const aula = await App.api("/api/texto", {
        metodo: "POST",
        corpo: { titulo, texto: textoAtual(), materia: campoMateria.value.trim() || null },
      });
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
