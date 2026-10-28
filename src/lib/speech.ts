// Minimal Web Speech API wrapper. Works in Chrome and Edge; the text box is always the fallback.

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported() {
  return getCtor() !== null;
}

export function startDictation(handlers: {
  onText: (text: string, final: boolean) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): () => void {
  const Ctor = getCtor();
  if (!Ctor) {
    handlers.onError("Voice input isn't supported in this browser. Type your request instead.");
    handlers.onEnd();
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    let text = "";
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      final = e.results[i].isFinal;
    }
    handlers.onText(text, final);
  };
  rec.onerror = (e) =>
    handlers.onError(e.error === "not-allowed" ? "Microphone access was blocked. Type your request instead." : "Voice input stopped. Type your request instead.");
  rec.onend = handlers.onEnd;
  rec.start();
  return () => rec.stop();
}
