const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const startButton = document.querySelector("#start-button");
const startButtonLabel = startButton.querySelector("span");
const clearButton = document.querySelector("#clear-button");
const status = document.querySelector("#status");
const recordingIndicator = document.querySelector("#recording-indicator");
const placeholder = document.querySelector("#transcript-placeholder");
const finalTranscript = document.querySelector("#final-transcript");
const interimTranscript = document.querySelector("#interim-transcript");

let recognition;
let isRecording = false;

function setRecording(recording) {
  isRecording = recording;
  startButton.classList.toggle("is-recording", recording);
  recordingIndicator.classList.toggle("is-visible", recording);
  startButtonLabel.textContent = recording ? "Parar transcrição" : "Iniciar transcrição";
  placeholder.hidden = finalTranscript.textContent.length > 0;
}

function showError(message) {
  status.textContent = message;
  status.setAttribute("aria-live", "assertive");
}

if (!SpeechRecognition) {
  startButton.disabled = true;
  status.textContent =
    "Este navegador não oferece reconhecimento de voz. Tente usar o Google Chrome.";
} else {
  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.addEventListener("start", () => {
    status.textContent = "Ouvindo... fale naturalmente.";
    status.setAttribute("aria-live", "polite");
    setRecording(true);
  });

  recognition.addEventListener("result", (event) => {
    let interim = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const text = result[0].transcript;

      if (result.isFinal) {
        finalTranscript.textContent += `${text.trim()} `;
      } else {
        interim += text;
      }
    }

    interimTranscript.textContent = interim;
    placeholder.hidden =
      finalTranscript.textContent.length > 0 || interim.length > 0;
    clearButton.disabled = finalTranscript.textContent.length === 0 && interim.length === 0;
  });

  recognition.addEventListener("error", (event) => {
    const messages = {
      "not-allowed": "Permita o acesso ao microfone para iniciar a transcrição.",
      "service-not-allowed": "O reconhecimento de voz não está disponível neste momento.",
      "no-speech": "Nenhuma fala foi detectada. Tente novamente.",
      "audio-capture": "Não foi possível acessar o microfone.",
      network: "Falha de conexão durante o reconhecimento de voz.",
    };

    showError(messages[event.error] || "Não foi possível iniciar o reconhecimento de voz.");
  });

  recognition.addEventListener("end", () => {
    setRecording(false);
    interimTranscript.textContent = "";
    if (status.getAttribute("aria-live") !== "assertive") {
      status.textContent = "Transcrição finalizada.";
    }
  });

  startButton.addEventListener("click", () => {
    if (isRecording) {
      recognition.stop();
      status.textContent = "Finalizando transcrição...";
      return;
    }

    status.setAttribute("aria-live", "polite");
    try {
      recognition.start();
    } catch (error) {
      showError("Não foi possível iniciar. Aguarde um instante e tente novamente.");
      console.error("Falha ao iniciar o reconhecimento de voz:", error);
    }
  });
}

clearButton.addEventListener("click", () => {
  finalTranscript.textContent = "";
  interimTranscript.textContent = "";
  placeholder.hidden = false;
  clearButton.disabled = true;
});
