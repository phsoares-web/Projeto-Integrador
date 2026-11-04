
"use strict";
const $ = (id) => document.getElementById(id);

const legenda = $("legenda");
const mensagemSuporte = $("mensagemSuporte");
const statusAula = $("statusAula");
const statusTexto = $("statusTexto");
const textoBtnLegenda = $("textoBtnLegenda");
const btnLegenda = $("btnLegenda");
const btnIniciar = $("btnIniciar");
const btnNovaAula = $("btnNovaAula");
const btnSalvarAula = $("btnSalvarAula");

const tempo = $("tempo");
const disciplinaAtual = $("disciplinaAtual");
const professorAtual = $("professorAtual");

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let reconhecimento = null;
let aulaAtiva = false;
let reconhecimentoAtivo = false;
let reconhecimentoIniciando = false;
let textoFinal = "";
let textoIntermediario = "";
let segundos = 0;
let cronometro = null;
let tamanhoFonte = 28;
let alteradoAposSalvar = false;


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

const coresMaterias = [
  "#123e79", "#123e79", "#123e79",
  "#123e79", "#123e79", "#123e79",
  "#123e79", "#123e79", "#123e79",
  "#123e79", "#123e79", "#123e79"
];

function atualizarStatus(texto, classe) {
  statusTexto.textContent = texto;
  statusAula.className = "status-aula " + classe;
}

function criarElemento(tag, classe, texto = "") {
  const elemento = document.createElement(tag);

  if (classe) elemento.className = classe;

  elemento.textContent = texto;
  return elemento;
}

function criarBotao(texto, classe, acao) {
  const botao = criarElemento("button", classe, texto);
  botao.type = "button";
  botao.addEventListener("click", acao);
  return botao;
}


function exibirLegenda() {
  legenda.replaceChildren();

  const final = textoFinal.trim();
  const parcial = textoIntermediario.trim();

  if (!final && !parcial) {
    const p = criarElemento(
      "p",
      "legenda-placeholder",
      "A legenda da aula aparecerá aqui."
    );

    const span = criarElemento(
      "span",
      "",
      "Clique em Iniciar legendagem e permita o microfone."
    );

    p.appendChild(span);
    legenda.appendChild(p);
    return;
  }

  const conteudo = document.createElement("div");

  if (final) {
    conteudo.appendChild(
      document.createTextNode(final + " ")
    );
  }

  if (parcial) {
    const span = criarElemento(
      "span",
      "texto-intermediario",
      parcial
    );

    conteudo.appendChild(span);
  }

  legenda.appendChild(conteudo);
  legenda.scrollTop = legenda.scrollHeight;

  if (aulaAtiva) {
    alteradoAposSalvar = true;
  }
}

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
  ) return;

  reconhecimentoIniciando = true;

  try {
    reconhecimento.start();
  } catch (erro) {
    reconhecimentoIniciando = false;
    console.warn("Erro ao iniciar reconhecimento:", erro);
  }
}

function iniciarLegendagem() {
  if (!reconhecimento) {
    atualizarStatus("Não suportado", "status-erro");
    mensagemSuporte.textContent =
      "Seu navegador não suporta reconhecimento de voz.";
    return;
  }

  aulaAtiva = true;
  tentarIniciarReconhecimento();
}

function pausarLegendagem() {
  aulaAtiva = false;
  pararCronometro();

  if (
    reconhecimento &&
    (reconhecimentoAtivo || reconhecimentoIniciando)
  ) {
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
    "Reconhecimento de voz disponível.";

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
      "Microfone ativo. Reconhecendo a fala.";

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
      atualizarStatus("Microfone indisponível", "status-erro");

      mensagemSuporte.textContent =
        "Nenhum microfone foi encontrado.";

    } else if (event.error === "network") {
      aulaAtiva = false;
      atualizarStatus("Erro de conexão", "status-erro");

      mensagemSuporte.textContent =
        "Falha na conexão com o serviço de voz.";

    } else if (event.error === "no-speech") {
      mensagemSuporte.textContent =
        "Nenhuma fala detectada.";

    } else {
      aulaAtiva = false;
      atualizarStatus("Erro", "status-erro");

      mensagemSuporte.textContent =
        "O reconhecimento de voz encontrou um problema.";
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
    "Reconhecimento de voz indisponível.";
}

btnLegenda.addEventListener(
  "click",
  alternarLegendagem
);

btnIniciar.addEventListener("click", () => {
  history.pushState(null, "", "#aula");
  navegar("#aula");
  iniciarLegendagem();
});


btnNovaAula.addEventListener("click", () => {
  aulaAtiva = false;
  pararCronometro();

  if (
    reconhecimento &&
    (reconhecimentoAtivo || reconhecimentoIniciando)
  ) {
    reconhecimento.stop();
  }

  segundos = 0;
  textoFinal = "";
  textoIntermediario = "";
  alteradoAposSalvar = false;

  atualizarTempo();
  exibirLegenda();

  atualizarStatus("Aguardando", "status-aguardando");
  textoBtnLegenda.textContent = "Iniciar legendagem";

  mensagemSuporte.textContent =
    "Nova aula preparada. Clique em Iniciar legendagem.";
});

function atualizarFonte() {
  legenda.style.fontSize = tamanhoFonte + "px";

  $("tamanhoFonteInfo").textContent =
    "Fonte: " + tamanhoFonte + "px";
}

$("diminuir").addEventListener("click", () => {
  if (tamanhoFonte > 20) {
    tamanhoFonte -= 2;
    atualizarFonte();
  }
});

$("aumentar").addEventListener("click", () => {
  if (tamanhoFonte < 48) {
    tamanhoFonte += 2;
    atualizarFonte();
  }
});


$("limparLegenda").addEventListener("click", () => {
  textoFinal = "";
  textoIntermediario = "";

  alteradoAposSalvar = true;
  exibirLegenda();
});

$("copiarLegenda").addEventListener("click", async () => {
  const texto = textoFinal.trim();

  if (!texto) {
    mensagemSuporte.textContent =
      "Não há texto para copiar.";
    return;
  }

  try {
    await navigator.clipboard.writeText(texto);

    mensagemSuporte.textContent =
      "Legenda copiada com sucesso.";

  } catch (erro) {
    mensagemSuporte.textContent =
      "Não foi possível copiar a legenda.";
  }
});


$("telaCheia").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) {
      await $("cardLegenda").requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (erro) {
    console.error("Erro na tela cheia:", erro);
  }
});

document.addEventListener("fullscreenchange", () => {
  $("telaCheia").textContent = document.fullscreenElement
    ? "Sair da tela cheia"
    : "Tela cheia";
});


const chaveAulas = "senac-transcreve-aulas-v1";

function carregarAulas() {
  try {
    const dados = JSON.parse(
      localStorage.getItem(chaveAulas) || "[]"
    );

    return Array.isArray(dados) ? dados : [];

  } catch (erro) {
    console.warn("Erro ao carregar aulas:", erro);
    return [];
  }
}

function gravarAulas(aulas) {
  try {
    localStorage.setItem(
      chaveAulas,
      JSON.stringify(aulas)
    );

    return true;

  } catch (erro) {
    alert(
      "Não foi possível salvar. Verifique o armazenamento do navegador."
    );

    return false;
  }
}

function formatarData(data) {
  return new Date(data).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}


btnSalvarAula.addEventListener("click", () => {
  const texto = textoFinal.trim();

  if (!texto) {
    alert("Ainda não há uma transcrição para salvar.");
    return;
  }

  const sugestao =
    "Aula de " +
    disciplinaAtual.textContent +
    " - " +
    new Date().toLocaleDateString("pt-BR");

  const titulo = prompt(
    "Digite um título para esta aula:",
    sugestao
  );

  if (titulo === null) return;

  if (!titulo.trim()) {
    alert("Informe um título para a aula.");
    return;
  }

  const aulas = carregarAulas();

  const novaAula = {
    id:
      Date.now().toString() +
      "-" +
      Math.random().toString(36).slice(2),

    titulo: titulo.trim().slice(0, 120),
    disciplina: disciplinaAtual.textContent,
    professor: professorAtual.textContent,
    duracao: tempo.textContent,
    texto: texto,
    criadaEm: new Date().toISOString()
  };

  aulas.push(novaAula);

  if (gravarAulas(aulas)) {
    alteradoAposSalvar = false;

    mensagemSuporte.textContent =
      "Aula salva! Acesse Disciplinas para visualizar.";

    atualizarPainel();
  }
});


const gradeDisciplinas = $("gradeDisciplinas");
const listaAulasSalvas = $("listaAulasSalvas");
const buscarMateria = $("buscarMateria");
const dialogAula = $("dialogAula");

let filtroMateria = "";
let aulaAberta = null;

function selecionarDisciplina(nome) {
  disciplinaAtual.textContent = nome;

  professorAtual.textContent =
    professores[nome] || "Professor não definido";
}


function mostrarVisao(visao) {
  const materias = visao === "disciplinas";

  $("inicio").hidden = materias;
  $("aula").hidden = materias;
  $("como-funciona").hidden = materias;

  $("disciplinas").hidden = !materias;

  if (materias) {
    atualizarPainel();
  }

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });
}

function navegar(hash) {
  if (hash === "#disciplinas") {
    mostrarVisao("disciplinas");
    return;
  }

  mostrarVisao("inicio");

  const destinos = [
    "#aula",
    "#como-funciona"
  ];

  const destino = destinos.includes(hash)
    ? hash
    : "#inicio";

  requestAnimationFrame(() => {
    document.querySelector(destino).scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const destino = link.getAttribute("href");

    const permitidos = [
      "#inicio",
      "#aula",
      "#disciplinas",
      "#como-funciona"
    ];

    if (!permitidos.includes(destino)) return;

    event.preventDefault();

    history.pushState(null, "", destino);
    navegar(destino);
  });
});

window.addEventListener("popstate", () => {
  navegar(location.hash);
});


function iniciarNovaAulaDaMateria(nome) {
  if (
    alteradoAposSalvar &&
    (textoFinal.trim() || textoIntermediario.trim())
  ) {
    const confirmar = confirm(
      "A transcrição atual não foi salva. Deseja descartá-la?"
    );

    if (!confirmar) return;
  }

  btnNovaAula.click();

  selecionarDisciplina(nome);

  history.pushState(null, "", "#aula");
  navegar("#aula");

  mensagemSuporte.textContent =
    "Aula de " + nome + " preparada.";
}

function criarCardMateria(nome, indice) {
  const card = criarElemento(
    "article",
    "materia-card"
  );

  card.style.setProperty(
    "--cor-materia",
    coresMaterias[indice % coresMaterias.length]
  );

  const titulo = criarElemento("h3", "", nome);

  const professor = criarElemento(
    "p",
    "materia-professor",
    "Professor(a): " + professores[nome]
  );

  const quantidade = carregarAulas().filter(
    (aula) => aula.disciplina === nome
  ).length;

  const total = criarElemento(
    "p",
    "materia-total",
    quantidade +
    (quantidade === 1 ? " aula salva" : " aulas salvas")
  );

  const acoes = criarElemento(
    "div",
    "materia-acoes"
  );

  const btnNova = criarBotao(
    "+ Nova aula",
    "botao-materia-primario",
    () => iniciarNovaAulaDaMateria(nome)
  );

  const btnSalvas = criarBotao(
    "Aulas salvas",
    "botao-materia-outline",
    () => {
      filtroMateria = nome;
      atualizarAulasSalvas();

      $("titulo-salvas").scrollIntoView({
        behavior: "smooth"
      });
    }
  );

  acoes.append(btnNova, btnSalvas);

  card.append(
    titulo,
    professor,
    total,
    acoes
  );

  return card;
}

function atualizarPainel() {
  const filtro = buscarMateria.value
    .trim()
    .toLocaleLowerCase("pt-BR");

  gradeDisciplinas.replaceChildren();

  Object.keys(professores).forEach((nome, indice) => {
    if (
      !nome.toLocaleLowerCase("pt-BR").includes(filtro)
    ) return;

    gradeDisciplinas.appendChild(
      criarCardMateria(nome, indice)
    );
  });

  if (!gradeDisciplinas.children.length) {
    gradeDisciplinas.appendChild(
      criarElemento(
        "p",
        "vazio",
        "Nenhuma matéria encontrada."
      )
    );
  }

  atualizarAulasSalvas();
}

buscarMateria.addEventListener(
  "input",
  atualizarPainel
);

function atualizarAulasSalvas() {
  const aulas = carregarAulas().filter((aula) => {
    return (
      !filtroMateria ||
      aula.disciplina === filtroMateria
    );
  });

  listaAulasSalvas.replaceChildren();

  if (!aulas.length) {
    listaAulasSalvas.appendChild(
      criarElemento(
        "p",
        "vazio",
        "Nenhuma aula salva encontrada."
      )
    );

    return;
  }

  aulas.sort((a, b) => {
    return new Date(b.criadaEm) - new Date(a.criadaEm);
  });

  aulas.forEach((aula) => {
    const item = criarElemento(
      "article",
      "aula-salva-item"
    );

    const conteudo = criarElemento("div");

    const titulo = criarElemento(
      "strong",
      "",
      aula.titulo
    );

    const informacoes = criarElemento(
      "p",
      "",
      aula.disciplina +
      " • " +
      formatarData(aula.criadaEm) +
      " • " +
      aula.duracao
    );

    conteudo.append(titulo, informacoes);

    const acoes = criarElemento(
      "div",
      "aula-salva-acoes"
    );

    const abrir = criarBotao(
      "Abrir",
      "botao-materia-outline",
      () => abrirAulaSalva(aula)
    );

    const excluir = criarBotao(
      "Excluir",
      "botao-excluir",
      () => excluirAula(aula.id)
    );

    acoes.append(abrir, excluir);
    item.append(conteudo, acoes);

    listaAulasSalvas.appendChild(item);
  });
}


function abrirAulaSalva(aula) {
  aulaAberta = aula;

  $("tituloDialog").textContent =
    aula.disciplina + " — " + aula.titulo;

  $("metaDialog").textContent =
    "Professor(a): " +
    aula.professor +
    " • " +
    formatarData(aula.criadaEm) +
    " • Duração: " +
    aula.duracao;

  $("textoDialog").textContent = aula.texto;

  dialogAula.showModal();
}


function excluirAula(id) {
  const aulas = carregarAulas();

  const aula = aulas.find((item) => {
    return item.id === id;
  });

  if (!aula) return;

  const confirmar = confirm(
    "Deseja excluir definitivamente a aula '" +
    aula.titulo +
    "'?"
  );

  if (!confirmar) return;

  const atualizadas = aulas.filter((item) => {
    return item.id !== id;
  });

  if (gravarAulas(atualizadas)) {
    atualizarPainel();
  }
}

$("mostrarTodas").addEventListener("click", () => {
  filtroMateria = "";
  atualizarAulasSalvas();
});

$("fecharDialog").addEventListener("click", () => {
  dialogAula.close();
});

$("fecharDialogRodape").addEventListener("click", () => {
  dialogAula.close();
});

$("copiarDialog").addEventListener("click", async () => {
  if (!aulaAberta) return;

  try {
    await navigator.clipboard.writeText(
      aulaAberta.texto
    );

    $("copiarDialog").textContent = "Copiado ✓";

    setTimeout(() => {
      $("copiarDialog").textContent =
        "Copiar transcrição";
    }, 1500);

  } catch (erro) {
    alert("Não foi possível copiar a transcrição.");
  }
});

const btnContraste = $("btnContraste");

btnContraste.addEventListener("click", () => {
  const ativo = document.body.classList.toggle(
    "alto-contraste"
  );

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
    console.warn("Preferência não salva:", erro);
  }
});

try {
  if (
    localStorage.getItem("edulegendas-contraste") ===
    "ativo"
  ) {
    document.body.classList.add("alto-contraste");

    btnContraste.setAttribute(
      "aria-pressed",
      "true"
    );

    btnContraste.textContent = "Contraste normal";
  }
} catch (erro) {
  console.warn("Armazenamento indisponível:", erro);
}

atualizarTempo();
atualizarFonte();
exibirLegenda();

selecionarDisciplina(
  disciplinaAtual.textContent.trim()
);

atualizarPainel();
navegar(location.hash);
