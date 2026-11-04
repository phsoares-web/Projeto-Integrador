// Painel do administrador: números, usuários e aulas.
(function () {
  const $ = (s) => document.querySelector(s);
  const TIPOS = { ALUNO: "Aluno", PROFESSOR: "Professor", ADMIN: "Admin" };

  let usuarios = [];
  let aulas = [];

  function aviso(texto, tipo) {
    const el = $("#painel-mensagem");
    el.textContent = texto;
    el.className = `mensagem ${tipo}`;
    el.hidden = !texto;
    if (texto) setTimeout(() => (el.hidden = true), 4000);
  }

  const celula = (conteudo, classe) => {
    const td = document.createElement("td");
    if (classe) td.className = classe;
    if (conteudo instanceof Node) td.append(conteudo);
    else td.textContent = conteudo ?? "";
    return td;
  };

  function linhaVazia(tbody, texto) {
    const tr = document.createElement("tr");
    const td = celula(texto, "aviso");
    td.colSpan = 6;
    tr.append(td);
    tbody.replaceChildren(tr);
  }

  // Exclusão em dois cliques, sem caixa de diálogo do navegador.
  function botaoExcluir(rotulo, acao) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn btn-perigo btn-pequeno";
    botao.textContent = rotulo;
    botao.addEventListener("click", async () => {
      if (botao.dataset.confirmar !== "1") {
        botao.dataset.confirmar = "1";
        botao.textContent = "Confirmar?";
        setTimeout(() => {
          botao.dataset.confirmar = "";
          botao.textContent = rotulo;
        }, 3000);
        return;
      }
      botao.disabled = true;
      try {
        await acao();
      } catch (erro) {
        aviso(erro.message, "erro");
        botao.disabled = false;
        botao.dataset.confirmar = "";
        botao.textContent = rotulo;
      }
    });
    return botao;
  }

  /* ----- números ----- */

  async function carregarNumeros() {
    const numeros = await App.api("/api/admin/resumo");
    document.querySelectorAll("[data-stat]").forEach((el) => {
      el.textContent = numeros[el.dataset.stat] ?? 0;
    });
  }

  /* ----- usuários ----- */

  function renderizarUsuarios() {
    const tbody = $("#tabela-usuarios");
    const termo = $("#busca-usuarios").value.trim().toLowerCase();
    const tipo = $("#filtro-tipo").value;
    const lista = usuarios.filter(
      (u) => (!tipo || u.tipo === tipo) && `${u.nome} ${u.email}`.toLowerCase().includes(termo),
    );
    if (!lista.length) return linhaVazia(tbody, "Nenhum usuário encontrado.");

    tbody.replaceChildren(
      ...lista.map((u) => {
        const tr = document.createElement("tr");
        const ehVoce = u.id === window.ADMIN_ID;

        const nome = document.createElement("span");
        nome.textContent = u.nome;
        if (ehVoce) {
          const selo = document.createElement("span");
          selo.className = "selo";
          selo.textContent = "você";
          nome.append(" ", selo);
        }

        const select = document.createElement("select");
        select.className = "filtro filtro-pequeno";
        select.setAttribute("aria-label", `Tipo de ${u.nome}`);
        select.disabled = ehVoce;
        for (const [valor, rotulo] of Object.entries(TIPOS)) {
          const opt = new Option(rotulo, valor, false, valor === u.tipo);
          select.append(opt);
        }
        select.addEventListener("change", async () => {
          const anterior = u.tipo;
          select.disabled = true;
          try {
            await App.api(`/api/admin/usuarios/${u.id}`, { metodo: "PATCH", corpo: { tipo: select.value } });
            u.tipo = select.value;
            aviso(`${u.nome} agora é ${TIPOS[u.tipo]}.`, "sucesso");
            carregarNumeros();
          } catch (erro) {
            select.value = anterior;
            aviso(erro.message, "erro");
          } finally {
            select.disabled = false;
          }
        });

        const acoes = ehVoce
          ? document.createTextNode("")
          : botaoExcluir("Excluir", async () => {
              await App.api(`/api/admin/usuarios/${u.id}`, { metodo: "DELETE" });
              usuarios = usuarios.filter((x) => x.id !== u.id);
              aulas = aulas.filter((a) => a.usuario?.id !== u.id);
              aviso(`Conta de ${u.nome} excluída (as aulas dela também).`, "sucesso");
              renderizarUsuarios();
              renderizarAulas();
              carregarNumeros();
            });

        tr.append(
          celula(nome),
          celula(u.email, "quebra"),
          celula(select),
          celula(String(u._count?.textos ?? 0), "numero"),
          celula(App.formatarData(u.criadoEm)),
          celula(acoes, "acoes"),
        );
        return tr;
      }),
    );
  }

  /* ----- aulas ----- */

  function renderizarAulas() {
    const tbody = $("#tabela-aulas");
    const termo = $("#busca-aulas").value.trim().toLowerCase();
    const lista = aulas.filter((a) =>
      `${a.titulo} ${a.materia || ""} ${a.usuario?.nome || ""}`.toLowerCase().includes(termo),
    );
    if (!lista.length) return linhaVazia(tbody, "Nenhuma aula encontrada.");

    tbody.replaceChildren(
      ...lista.map((a) => {
        const tr = document.createElement("tr");
        const selo = document.createElement("span");
        selo.className = a.resumo ? "selo selo-ok" : "selo";
        selo.textContent = a.resumo ? "Sim" : "Não";

        tr.append(
          celula(a.titulo),
          celula(a.materia || "—"),
          celula(a.usuario ? a.usuario.nome : "—"),
          celula(App.formatarData(a.data)),
          celula(selo),
          celula(
            botaoExcluir("Excluir", async () => {
              await App.api(`/api/texto/${a.id}`, { metodo: "DELETE" });
              aulas = aulas.filter((x) => x.id !== a.id);
              const dono = usuarios.find((u) => u.id === a.usuario?.id);
              if (dono?._count) dono._count.textos -= 1;
              aviso(`Aula “${a.titulo}” excluída.`, "sucesso");
              renderizarAulas();
              renderizarUsuarios();
              carregarNumeros();
            }),
            "acoes",
          ),
        );
        return tr;
      }),
    );
  }

  /* ----- abas ----- */

  const abas = [...document.querySelectorAll(".aba")];
  function ativarAba(aba) {
    for (const a of abas) {
      const ativa = a === aba;
      a.setAttribute("aria-selected", String(ativa));
      a.tabIndex = ativa ? 0 : -1;
      document.getElementById(a.getAttribute("aria-controls")).hidden = !ativa;
    }
  }
  abas.forEach((aba, i) => {
    aba.addEventListener("click", () => ativarAba(aba));
    aba.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const proxima = abas[(i + (e.key === "ArrowRight" ? 1 : abas.length - 1)) % abas.length];
      ativarAba(proxima);
      proxima.focus();
    });
  });

  $("#busca-usuarios").addEventListener("input", renderizarUsuarios);
  $("#filtro-tipo").addEventListener("change", renderizarUsuarios);
  $("#busca-aulas").addEventListener("input", renderizarAulas);

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      [usuarios, aulas] = await Promise.all([
        App.api("/api/admin/usuarios"),
        App.api("/api/admin/aulas"),
        carregarNumeros(),
      ]);
      renderizarUsuarios();
      renderizarAulas();
    } catch (erro) {
      aviso(erro.message, "erro");
    }
  });
})();
