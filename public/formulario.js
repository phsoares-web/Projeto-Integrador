// Utilitários compartilhados pelos formulários de login e cadastro.
(function () {
  function marcarErro(campo, texto) {
    campo.setAttribute("aria-invalid", texto ? "true" : "false");
    const erro = document.getElementById(`erro-${campo.id}`);
    if (erro) erro.textContent = texto;
    return !texto;
  }

  function mostrarMensagem(texto, tipo, id = "mensagem") {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.className = `mensagem ${tipo}`;
    el.hidden = false;
  }

  function esconderMensagem(id = "mensagem") {
    document.getElementById(id).hidden = true;
  }

  // Botões "Mostrar/Ocultar" senha.
  document.querySelectorAll("[data-alternar]").forEach((botao) => {
    botao.addEventListener("click", () => {
      const campo = document.getElementById(botao.dataset.alternar);
      const visivel = campo.type === "text";
      campo.type = visivel ? "password" : "text";
      botao.textContent = visivel ? "Mostrar" : "Ocultar";
      botao.setAttribute("aria-pressed", String(!visivel));
    });
  });

  window.Formulario = { marcarErro, mostrarMensagem, esconderMensagem };
})();
