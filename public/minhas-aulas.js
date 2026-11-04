// Área do usuário: lista de aulas salvas, transcrição e resumo de cada uma.
(function () {
  const $ = (seletor) => document.querySelector(seletor);

  const el = {
    carregando: $("#carregando"),
    vazio: $("#vazio"),
    area: $("#area-aulas"),
    busca: $("#busca"),
    lista: $("#lista"),
    semResultado: $("#sem-resultado"),
    titulo: $("#aula-titulo"),
    meta: $("#aula-meta"),
    texto: $("#aula-texto"),
    copiarTranscricao: $("#copiar-transcricao"),
    excluirAula: $("#excluir-aula"),
    resumoStatus: $("#resumo-status"),
    resumoMensagem: $("#resumo-mensagem"),
    resumoTexto: $("#resumo-texto"),
    resumoContador: $("#resumo-contador"),
    gerar: $("#gerar-resumo"),
    salvar: $("#salvar-resumo"),
    copiarResumo: $("#copiar-resumo"),
    excluirResumo: $("#excluir-resumo"),
  };

  let aulas = [];
  let atual = null; // aula aberta (com resumo completo)
  let resumoSalvo = ""; // para saber se há alterações não salvas

  /* ----- utilidades ----- */

  function mensagem(texto, tipo) {
    el.resumoMensagem.textContent = texto;
    el.resumoMensagem.className = `mensagem ${tipo}`;
    el.resumoMensagem.hidden = !texto;
  }

  async function copiar(texto, botao) {
    const original = botao.textContent;
    try {
      await navigator.clipboard.writeText(texto);
      botao.textContent = "Copiado!";
    } catch {
      botao.textContent = "Não foi possível copiar";
    }
    setTimeout(() => (botao.textContent = original), 1500);
  }

  // Botão de exclusão em duas etapas (sem caixa de confirmação do navegador).
  function confirmarDuasVezes(botao, acao) {
    const original = botao.textContent;
    botao.addEventListener("click", async () => {
      if (botao.dataset.confirmar !== "1") {
        botao.dataset.confirmar = "1";
        botao.textContent = "Clique de novo para confirmar";
        setTimeout(() => {
          botao.dataset.confirmar = "";
          botao.textContent = original;
        }, 3000);
        return;
      }
      botao.dataset.confirmar = "";
      botao.textContent = original;
      botao.disabled = true;
      try {
        await acao();
      } finally {
        botao.disabled = false;
      }
    });
  }

  const temAlteracao = () => el.resumoTexto.value.trim() !== resumoSalvo.trim();

  function atualizarBotoesResumo() {
    const valor = el.resumoTexto.value.trim();
    el.salvar.disabled = valor.length < 5 || !temAlteracao();
    el.copiarResumo.disabled = !valor;
    el.excluirResumo.hidden = !resumoSalvo;
    const palavras = valor ? valor.split(/\s+/).length : 0;
    el.resumoContador.textContent = `${palavras} palavra${palavras === 1 ? "" : "s"}${temAlteracao() && valor ? " · alterações não salvas" : ""}`;
  }

  /* ----- lista ----- */

  function renderizarLista() {
    const termo = el.busca.value.trim().toLowerCase();
    const filtradas = aulas.filter((a) =>
      `${a.titulo} ${a.materia || ""}`.toLowerCase().includes(termo),
    );

    el.lista.replaceChildren(
      ...filtradas.map((aula) => {
        const li = document.createElement("li");
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "item-aula";
        botao.setAttribute("aria-current", atual && atual.id === aula.id ? "true" : "false");

        const titulo = document.createElement("strong");
        titulo.textContent = aula.titulo;
        const meta = document.createElement("span");
        meta.className = "item-aula-meta";
        meta.textContent = [aula.materia, App.formatarData(aula.data)].filter(Boolean).join(" · ");
        const selo = document.createElement("span");
        selo.className = aula.resumo ? "selo selo-ok" : "selo";
        selo.textContent = aula.resumo ? "Com resumo" : "Sem resumo";

        botao.append(titulo, meta, selo);
        botao.addEventListener("click", () => abrirAula(aula.id));
        li.append(botao);
        return li;
      }),
    );
    el.semResultado.hidden = filtradas.length > 0;
  }

  async function carregarLista() {
    aulas = await App.api("/api/me/textos");
    el.carregando.hidden = true;
    el.vazio.hidden = aulas.length > 0;
    el.area.hidden = aulas.length === 0;
    renderizarLista();
  }

  /* ----- detalhe ----- */

  async function abrirAula(id) {
    if (atual && atual.id !== id && temAlteracao() && el.resumoTexto.value.trim()) {
      mensagem("Você tem alterações não salvas no resumo. Salve antes de trocar de aula, ou clique de novo na aula para descartar.", "erro");
      if (el.resumoMensagem.dataset.descartar !== String(id)) {
        el.resumoMensagem.dataset.descartar = String(id);
        return;
      }
    }
    el.resumoMensagem.dataset.descartar = "";

    try {
      atual = await App.api(`/api/texto/${id}`);
    } catch (erro) {
      mensagem(erro.message, "erro");
      return;
    }

    history.replaceState(null, "", `/minhas-aulas?aula=${id}`);
    el.titulo.textContent = atual.titulo;
    el.meta.textContent = [atual.materia, App.formatarData(atual.data, { dateStyle: "long" })]
      .filter(Boolean)
      .join(" · ");
    el.texto.textContent = atual.texto;

    resumoSalvo = atual.resumo ? atual.resumo.conteudo : "";
    el.resumoTexto.value = resumoSalvo;
    el.resumoStatus.textContent = atual.resumo
      ? `Salvo em ${new Date(atual.resumo.atualizadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
      : "Esta aula ainda não tem resumo.";
    mensagem("", "");
    atualizarBotoesResumo();
    renderizarLista();

    if (window.innerWidth < 860) $("#detalhe").scrollIntoView({ behavior: "smooth" });
  }

  /* ----- ações ----- */

  el.busca.addEventListener("input", renderizarLista);
  el.resumoTexto.addEventListener("input", atualizarBotoesResumo);
  el.copiarTranscricao.addEventListener("click", () => copiar(atual.texto, el.copiarTranscricao));
  el.copiarResumo.addEventListener("click", () => copiar(el.resumoTexto.value.trim(), el.copiarResumo));

  el.gerar.addEventListener("click", async () => {
    if (el.resumoTexto.value.trim() && el.gerar.dataset.confirmar !== "1") {
      el.gerar.dataset.confirmar = "1";
      mensagem("O resumo atual será substituído pela sugestão. Clique em “Gerar” de novo para confirmar.", "erro");
      setTimeout(() => (el.gerar.dataset.confirmar = ""), 4000);
      return;
    }
    el.gerar.dataset.confirmar = "";
    el.gerar.disabled = true;
    try {
      const sugestao = await App.api(`/api/texto/${atual.id}/resumo/gerar`, { metodo: "POST" });
      el.resumoTexto.value = sugestao.texto;
      mensagem("Sugestão gerada a partir da transcrição. Revise, ajuste o que quiser e clique em “Salvar resumo”.", "sucesso");
      atualizarBotoesResumo();
      el.resumoTexto.focus();
    } catch (erro) {
      mensagem(erro.message, "erro");
    } finally {
      el.gerar.disabled = false;
    }
  });

  el.salvar.addEventListener("click", async () => {
    el.salvar.disabled = true;
    el.salvar.textContent = "Salvando...";
    try {
      const resumo = await App.api(`/api/texto/${atual.id}/resumo`, {
        metodo: "PUT",
        corpo: { conteudo: el.resumoTexto.value },
      });
      resumoSalvo = resumo.conteudo;
      atual.resumo = resumo;
      const naLista = aulas.find((a) => a.id === atual.id);
      if (naLista) naLista.resumo = { id: resumo.id, atualizadoEm: resumo.atualizadoEm };
      el.resumoStatus.textContent = "Salvo agora há pouco.";
      mensagem("Resumo salvo.", "sucesso");
      renderizarLista();
    } catch (erro) {
      mensagem(erro.message, "erro");
    } finally {
      el.salvar.textContent = "Salvar resumo";
      atualizarBotoesResumo();
    }
  });

  confirmarDuasVezes(el.excluirResumo, async () => {
    try {
      await App.api(`/api/texto/${atual.id}/resumo`, { metodo: "DELETE" });
      resumoSalvo = "";
      el.resumoTexto.value = "";
      atual.resumo = null;
      const naLista = aulas.find((a) => a.id === atual.id);
      if (naLista) naLista.resumo = null;
      el.resumoStatus.textContent = "Esta aula ainda não tem resumo.";
      mensagem("Resumo excluído.", "sucesso");
      atualizarBotoesResumo();
      renderizarLista();
    } catch (erro) {
      mensagem(erro.message, "erro");
    }
  });

  confirmarDuasVezes(el.excluirAula, async () => {
    try {
      await App.api(`/api/texto/${atual.id}`, { metodo: "DELETE" });
      aulas = aulas.filter((a) => a.id !== atual.id);
      atual = null;
      resumoSalvo = "";
      el.resumoTexto.value = "";
      el.vazio.hidden = aulas.length > 0;
      el.area.hidden = aulas.length === 0;
      if (aulas.length) await abrirAula(aulas[0].id);
      else history.replaceState(null, "", "/minhas-aulas");
    } catch (erro) {
      mensagem(erro.message, "erro");
    }
  });

  window.addEventListener("beforeunload", (e) => {
    if (atual && temAlteracao() && el.resumoTexto.value.trim()) e.preventDefault();
  });

  /* ----- início ----- */

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await carregarLista();
      if (!aulas.length) return;
      const pedida = Number(new URLSearchParams(location.search).get("aula"));
      const inicial = aulas.find((a) => a.id === pedida) || aulas[0];
      await abrirAula(inicial.id);
    } catch (erro) {
      el.carregando.textContent = erro.message;
    }
  });
})();
