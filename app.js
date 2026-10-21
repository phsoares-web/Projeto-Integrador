// Elementos e configurações da transcrição
const legenda = document.getElementById("legenda");
const mensagemSuporte = document.getElementById("mensagemSuporte");
const statusAula = document.getElementById("statusAula");
const statusTexto = document.getElementById("statusTexto");
const textoBtnLegenda = document.getElementById("textoBtnLegenda");
const btnLegenda = document.getElementById("btnLegenda");
const btnIniciar = document.getElementById("btnIniciar");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconhecimento = null;
let aulaAtiva = false;
let reconhecimentoAtivo = false;
let textoFinal = "";
let textoIntermediario = "";
function atualizarStatus(texto, classe) {
  statusTexto.textContent = texto;
  statusAula.className = "status-aula " + classe;
}
function escaparHTML(texto) {
  const elemento = document.createElement("div");
  elemento.textContent = texto;
  return elemento.innerHTML;
}
function exibirLegenda() {
  const final = textoFinal.trim();
  const parcial = textoIntermediario.trim();
  if (!final && !parcial) {
    legenda.innerHTML = '<p class="legenda-placeholder">A legenda da aula aparecerá aqui.<span>Clique em “Iniciar legendagem” e permita o acesso ao microfone.</span></p>';
    return;
  }
  legenda.innerHTML = `<div>${escaparHTML(final)} ${parcial ? `<span class="texto-intermediario">${escaparHTML(parcial)}</span>` : ""}</div>`;
  legenda.scrollTop = legenda.scrollHeight;
}
function tentarIniciarReconhecimento() {
  if (!reconhecimento || reconhecimentoAtivo || !aulaAtiva) return;
  try { reconhecimento.start(); }
  catch (erro) { console.warn("O reconhecimento já estava iniciando.", erro); }
}
function iniciarLegendagem() {
  if (!reconhecimento) {
    atualizarStatus("Não suportado", "status-erro");
    mensagemSuporte.textContent = "Use um navegador compatível com reconhecimento de voz.";
    return;
  }
  aulaAtiva = true;
  tentarIniciarReconhecimento();
}
function pausarLegendagem() {
  aulaAtiva = false;
  if (reconhecimento && reconhecimentoAtivo) reconhecimento.stop();
  reconhecimentoAtivo = false;
  atualizarStatus("Pausada", "status-pausado");
  textoBtnLegenda.textContent = "Continuar legendagem";
  mensagemSuporte.textContent = "A legendagem está pausada.";
}
function alternarLegendagem() { aulaAtiva ? pausarLegendagem() : iniciarLegendagem(); }
if (SpeechRecognition) {
  reconhecimento = new SpeechRecognition();
  reconhecimento.lang = "pt-BR";
  reconhecimento.continuous = true;
  reconhecimento.interimResults = true;
  reconhecimento.maxAlternatives = 1;
  mensagemSuporte.textContent = "Reconhecimento de voz disponível.";
  reconhecimento.onstart = () => {
    reconhecimentoAtivo = true;
    atualizarStatus("Ouvindo", "status-ouvindo");
    textoBtnLegenda.textContent = "Pausar legendagem";
    mensagemSuporte.textContent = "Microfone ativo. A fala está sendo reconhecida.";
  };
  reconhecimento.onresult = event => {
    textoIntermediario = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const resultado = event.results[i];
      const transcricao = resultado[0].transcript.trim();
      if (resultado.isFinal) textoFinal += transcricao + " ";
      else textoIntermediario += transcricao + " ";
    }
    exibirLegenda();
  };
  reconhecimento.onerror = event => {
    console.warn("Erro no reconhecimento:", event.error);
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      aulaAtiva = false;
      atualizarStatus("Microfone bloqueado", "status-erro");
      mensagemSuporte.textContent = "Permita o acesso ao microfone nas configurações do navegador.";
      textoBtnLegenda.textContent = "Iniciar legendagem";
    } else if (event.error === "audio-capture") {
      aulaAtiva = false;
      atualizarStatus("Microfone não encontrado", "status-erro");
      mensagemSuporte.textContent = "Não foi possível encontrar um microfone disponível.";
      textoBtnLegenda.textContent = "Iniciar legendagem";
    } else if (event.error === "network") {
      mensagemSuporte.textContent = "O serviço de reconhecimento encontrou um problema de conexão.";
    }
  };
  reconhecimento.onend = () => {
    reconhecimentoAtivo = false;
    if (aulaAtiva) setTimeout(tentarIniciarReconhecimento, 400);
  };
} else {
  mensagemSuporte.textContent = "Este navegador não possui suporte ao reconhecimento de voz.";
}
btnLegenda.addEventListener("click", alternarLegendagem);
btnIniciar.addEventListener("click", () => {
  document.getElementById("aula").scrollIntoView({behavior:"smooth"});
  setTimeout(() => { if (!aulaAtiva) iniciarLegendagem(); }, 450);
});
