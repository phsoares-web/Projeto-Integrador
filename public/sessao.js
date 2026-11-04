// Funções usadas por todas as páginas: chamadas à API e botão "Sair".
// A sessão em si fica num cookie httpOnly controlado pelo servidor.
(function () {
  async function api(url, { metodo = "GET", corpo } = {}) {
    let resposta;
    try {
      resposta = await fetch(url, {
        method: metodo,
        headers: corpo === undefined ? {} : { "Content-Type": "application/json" },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        credentials: "same-origin",
      });
    } catch {
      throw new Error("Sem conexão com o servidor. Tente novamente.");
    }
    const dados = await resposta.json().catch(() => ({}));
    if (resposta.status === 401 && !url.endsWith("/login")) {
      window.location.href = `/login?voltar=${encodeURIComponent(location.pathname)}`;
    }
    if (!resposta.ok) throw new Error(dados.erro || "Algo deu errado. Tente novamente mais tarde.");
    return dados;
  }

  const formatarData = (valor, opcoes = {}) =>
    valor ? new Date(valor).toLocaleDateString("pt-BR", { timeZone: "UTC", ...opcoes }) : "";

  window.App = { api, formatarData };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-sair]").forEach((botao) =>
      botao.addEventListener("click", async () => {
        botao.disabled = true;
        try {
          await api("/api/logout", { metodo: "POST" });
        } finally {
          window.location.href = "/login";
        }
      }),
    );
  });
})();
