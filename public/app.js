"use strict";

const legenda = document.getElementById("legenda");
const mensagemSuporte = document.getElementById("mensagemSuporte");
const statusAula = document.getElementById("statusAula");
const statusTexto = document.getElementById("statusTexto");

const btnLegenda = document.getElementById("btnLegenda");
const btnIniciar = document.getElementById("btnIniciar");
const textoBtnLegenda = document.getElementById("textoBtnLegenda");
const btnNovaAula = document.getElementById("btnNovaAula");

const tempo = document.getElementById("tempo");
const diminuir = document.getElementById("diminuir");
const aumentar = document.getElementById("aumentar");
const tamanhoFonteInfo = document.getElementById("tamanhoFonteInfo");

const copiarLegenda = document.getElementById("copiarLegenda");
const limparLegenda = document.getElementById("limparLegenda");
const telaCheia = document.getElementById("telaCheia");
const cardLegenda = document.getElementById("cardLegenda");

const disciplinaAtual = document.getElementById("disciplinaAtual");
const professorAtual = document.getElementById("professorAtual");
const btnContraste = document.getElementById("btnContraste");


const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let reconhecimento = null;
let aulaAtiva = false;
let reconhecimentoAtivo = false;
let reconhecimentoIniciando = false;

let textoFinal = "";
let textoIntermediario = "";

function atualizarStatus(texto, classe) {
  statusTexto.textContent = texto;
  statusAula.className = "status-aula " + classe;
}


function exibirLegenda() {
  const final = textoFinal.trim();
  const parcial = textoIntermediario.trim();

  legenda.replaceChildren();

  if (!final && !parcial) {
    const paragrafo = document.createElement("p");
    paragrafo.className = "legenda-placeholder";
    paragrafo.textContent = "A legenda da aula aparecerá aqui.";

    const instrucao = document.createElement("span");
    instrucao.textContent =
      "Clique em Iniciar legendagem e permita o acesso ao microfone.";

    paragrafo.appendChild(instrucao);
    legenda.appendChild(paragrafo);
    return;
  }

  const conteudo = document.createElement("div");

  if (final) {
    conteudo.appendChild(document.createTextNode(final + " "));
  }

  if (parcial) {
    const span = document.createElement("span");
    span.className = "texto-intermediario";
    span.textContent = parcial;
    conteudo.appendChild(span);
  }

  legenda.appendChild(conteudo);
  legenda.scrollTop = legenda.scrollHeight;
}


let segundos = 0;
let cronometro = null;

function atualizarTempo() {
  const minutos = Math.floor(segundos / 60);
  const restantes = segundos % 60;

  tempo.textContent =
    String(minutos).padStart(2, "0") +
    ":" +
    String(restantes).padStart(2, "0");
}

function iniciarCronometro() {
  if (cronometro !== null) return;

  cronometro = setInterval(() => {
    segundos++;
    atualizarTempo();
  }, 1000);
}

function pararCronometro() {
  if (cronometro !== null) {
    clearInterval(cronometro);
    cronometro = null;
  }
}


function tentarIniciarReconhecimento() {
  if (
    !reconhecimento ||
    !aulaAtiva ||
    reconhecimentoAtivo ||
    reconhecimentoIniciando
  ) {
    return;
  }

  reconhecimentoIniciando = true;

  try {
    reconhecimento.start();
  } catch (erro) {
    reconhecimentoIniciando = false;
    console.warn("Não foi possível iniciar:", erro);
    mensagemSuporte.textContent =
      "Não foi possível iniciar o reconhecimento de voz.";
  }
}

function iniciarLegendagem() {
  if (!reconhecimento) {
    atualizarStatus("Não suportado", "status-erro");
    mensagemSuporte.textContent =
      "Seu navegador não oferece suporte ao reconhecimento de voz.";
    return;
  }

  aulaAtiva = true;
  mensagemSuporte.textContent = "Iniciando microfone...";

  tentarIniciarReconhecimento();
}

function pausarLegendagem() {
  aulaAtiva = false;
  pararCronometro();

  if (reconhecimento && (reconhecimentoAtivo || reconhecimentoIniciando)) {
    reconhecimento.stop();
  }

  atualizarStatus("Pausada", "status-pausado");
  textoBtnLegenda.textContent = "Continuar legendagem";
  mensagemSuporte.textContent = "A legendagem está pausada.";
}

function alternarLegendagem() {
  if (aulaAtiva) {
    pausarLegendagem();
  } else {
    iniciarLegendagem();
  }
}


if (SpeechRecognition) {
  reconhecimento = new SpeechRecognition();

  reconhecimento.lang = "pt-BR";
  reconhecimento.continuous = true;
  reconhecimento.interimResults = true;
  reconhecimento.maxAlternatives = 1;

  mensagemSuporte.textContent =
    "Reconhecimento de voz disponível neste navegador.";

  reconhecimento.onstart = () => {
    reconhecimentoIniciando = false;
    reconhecimentoAtivo = true;

    if (!aulaAtiva) {
      reconhecimento.stop();
      return;
    }

    atualizarStatus("Ouvindo", "status-ouvindo");
    textoBtnLegenda.textContent = "Pausar legendagem";
    mensagemSuporte.textContent =
      "Microfone ativo. A fala está sendo reconhecida.";

    iniciarCronometro();
  };

  reconhecimento.onresult = (event) => {
    textoIntermediario = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      const resultado = event.results[i];
      const transcricao = resultado[0].transcript.trim();

      if (resultado.isFinal) {
        textoFinal += transcricao + " ";
      } else {
        textoIntermediario += transcricao + " ";
      }
    }

    exibirLegenda();
  };

  reconhecimento.onerror = (event) => {
    console.warn("Erro no reconhecimento:", event.error);

    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      aulaAtiva = false;
      atualizarStatus("Microfone bloqueado", "status-erro");

      mensagemSuporte.textContent =
        "Permita o acesso ao microfone no navegador.";

    } else if (event.error === "audio-capture") {
      aulaAtiva = false;
      atualizarStatus("Microfone não encontrado", "status-erro");

      mensagemSuporte.textContent =
        "Nenhum microfone disponível foi encontrado.";

    } else if (event.error === "network") {
      aulaAtiva = false;
      atualizarStatus("Erro de conexão", "status-erro");

      mensagemSuporte.textContent =
        "Falha de conexão com o serviço de reconhecimento.";

    } else if (event.error === "no-speech") {
      mensagemSuporte.textContent =
        "Nenhuma fala detectada. Tente falar novamente.";

    } else {
      aulaAtiva = false;
      atualizarStatus("Erro", "status-erro");

      mensagemSuporte.textContent =
        "Ocorreu um problema no reconhecimento de voz.";
    }

    if (!aulaAtiva) {
      pararCronometro();
      textoBtnLegenda.textContent = "Iniciar legendagem";
    }
  };

  reconhecimento.onend = () => {
    reconhecimentoAtivo = false;
    reconhecimentoIniciando = false;

    if (aulaAtiva) {
      setTimeout(tentarIniciarReconhecimento, 400);
    }
  };

} else {
  atualizarStatus("Não suportado", "status-erro");

  mensagemSuporte.textContent =
    "Este navegador não suporta reconhecimento de voz.";
}


btnLegenda.addEventListener("click", alternarLegendagem);

btnIniciar.addEventListener("click", () => {
  document.getElementById("aula").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  if (!aulaAtiva) {
    iniciarLegendagem();
  }
});


btnNovaAula.addEventListener("click", () => {
  aulaAtiva = false;
  pararCronometro();

  if (reconhecimento && (reconhecimentoAtivo || reconhecimentoIniciando)) {
    reconhecimento.stop();
  }

  segundos = 0;
  textoFinal = "";
  textoIntermediario = "";

  atualizarTempo();
  exibirLegenda();

  atualizarStatus("Aguardando", "status-aguardando");
  textoBtnLegenda.textContent = "Iniciar legendagem";

  mensagemSuporte.textContent = reconhecimento
    ? "Nova aula preparada. Clique para iniciar."
    : "Reconhecimento de voz indisponível.";
});


let tamanhoFonte = 28;

function atualizarFonte() {
  legenda.style.fontSize = tamanhoFonte + "px";

  tamanhoFonteInfo.textContent =
    "Fonte: " + tamanhoFonte + "px";
}

diminuir.addEventListener("click", () => {
  if (tamanhoFonte > 20) {
    tamanhoFonte -= 2;
    atualizarFonte();
  }
});

aumentar.addEventListener("click", () => {
  if (tamanhoFonte < 48) {
    tamanhoFonte += 2;
    atualizarFonte();
  }
});


limparLegenda.addEventListener("click", () => {
  textoFinal = "";
  textoIntermediario = "";

  exibirLegenda();

  mensagemSuporte.textContent = aulaAtiva
    ? "Legenda limpa. O microfone continua ativo."
    : "Legenda limpa.";
});


copiarLegenda.addEventListener("click", async () => {
  const texto = textoFinal.trim();

  if (!texto) {
    mensagemSuporte.textContent =
      "Ainda não há legenda para copiar.";
    return;
  }

  try {
    await navigator.clipboard.writeText(texto);

    mensagemSuporte.textContent = "Legenda copiada!";

    const original = copiarLegenda.textContent;
    copiarLegenda.textContent = "Copiado ✓";

    setTimeout(() => {
      copiarLegenda.textContent = original;
    }, 1500);

  } catch (erro) {
    console.error(erro);

    mensagemSuporte.textContent =
      "Não foi possível copiar. Use HTTPS ou localhost.";
  }
});

telaCheia.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) {
      await cardLegenda.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (erro) {
    console.error("Erro na tela cheia:", erro);
  }
});

document.addEventListener("fullscreenchange", () => {
  telaCheia.textContent = document.fullscreenElement
    ? "Sair da tela cheia"
    : "Tela cheia";
});

const professores = {
  "Matemática": "Jarnômio",
  "Português": "Jade",
  "Inglês": "Jéssica",
  "Artes": "Lorena",
  "Informática": "Alex",
  "Sociologia": "Jânio",
  "Educação Física": "Mikael",
  "Química": "Yasmin",
  "Física": "Thainá",
  "Biologia": "Daniel",
  "Geografia": "Victor",
  "História": "Jackson"
};

const botoesDisciplinas =
  document.querySelectorAll("[data-disciplina]");

function selecionarDisciplina(nomeDisciplina) {
  disciplinaAtual.textContent = nomeDisciplina;

  professorAtual.textContent =
    professores[nomeDisciplina] || "Professor não definido";

  botoesDisciplinas.forEach((botao) => {
    const selecionado =
      botao.dataset.disciplina === nomeDisciplina;

    botao.classList.toggle(
      "disciplina-ativa",
      selecionado
    );

    botao.setAttribute(
      "aria-pressed",
      String(selecionado)
    );
  });

  document.getElementById("aula").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

botoesDisciplinas.forEach((botao) => {
  botao.setAttribute(
    "aria-pressed",
    String(
      botao.dataset.disciplina ===
      disciplinaAtual.textContent.trim()
    )
  );

  botao.addEventListener("click", () => {
    selecionarDisciplina(botao.dataset.disciplina);
  });
});

professorAtual.textContent =
  professores[disciplinaAtual.textContent.trim()] ||
  "Professor não definido";


btnContraste.addEventListener("click", () => {
  const ativo =
    document.body.classList.toggle("alto-contraste");

  btnContraste.setAttribute(
    "aria-pressed",
    String(ativo)
  );

  btnContraste.textContent = ativo
    ? "Contraste normal"
    : "Alto contraste";

  try {
    localStorage.setItem(
      "edulegendas-contraste",
      ativo ? "ativo" : "normal"
    );
  } catch (erro) {
    console.warn("Não foi possível salvar a preferência.", erro);
  }
});

try {
  if (
    localStorage.getItem("edulegendas-contraste") === "ativo"
  ) {
    document.body.classList.add("alto-contraste");

    btnContraste.setAttribute("aria-pressed", "true");
    btnContraste.textContent = "Contraste normal";
  }
} catch (erro) {
  console.warn("Preferência de contraste indisponível.", erro);
}


atualizarTempo();
atualizarFonte();
exibirLegenda();
