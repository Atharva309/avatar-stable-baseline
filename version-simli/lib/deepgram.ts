// Direct browser WebSocket connection to Deepgram STT
// Avoids the @deepgram/sdk package which has Node.js dependencies (ws, bufferutil)

export interface DeepgramConnection {
  send: (data: Blob | ArrayBuffer) => void;
  close: () => void;
  /** Second arg is true when `is_final` or `speech_final` from Deepgram. */
  onTranscript: (callback: (transcript: string, utteranceComplete: boolean) => void) => void;
  onOpen: (callback: () => void) => void;
  onClose: (callback: () => void) => void;
  onError: (callback: (error: Event) => void) => void;
}

/** Defaults for browser streaming STT. */
export const DEEPGRAM_STREAM_DEFAULTS = {
  model: "nova-2",
  language: "en-US",
  smart_format: true,
  interim_results: true,
  utterance_end_ms: 1000,
  vad_events: true,
  endpointing: 350,
} as const;

export type DeepgramStreamOptions = {
  model?: string;
  language?: string;
  smart_format?: boolean;
  interim_results?: boolean;
  utterance_end_ms?: number;
  vad_events?: boolean;
  /** Silence (ms) before Deepgram finalizes a phrase; helps `is_final` / `speech_final` fire reliably. */
  endpointing?: number;
};

export function createDeepgramConnection(options: DeepgramStreamOptions = {}): DeepgramConnection {
  const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_DEEPGRAM_API_KEY");
  }

  const merged = { ...DEEPGRAM_STREAM_DEFAULTS, ...options };

  const params = new URLSearchParams();
  params.set("model", merged.model);
  params.set("language", merged.language);
  if (merged.smart_format) params.set("smart_format", "true");
  if (merged.interim_results) params.set("interim_results", "true");
  if (merged.utterance_end_ms) params.set("utterance_end_ms", String(merged.utterance_end_ms));
  if (merged.vad_events) params.set("vad_events", "true");
  params.set("endpointing", String(merged.endpointing ?? 350));

  const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params.toString()}`, ["token", apiKey]);

  let transcriptCallback: ((transcript: string, utteranceComplete: boolean) => void) | null = null;
  let openCallback: (() => void) | null = null;
  let closeCallback: (() => void) | null = null;
  let errorCallback: ((error: Event) => void) | null = null;

  ws.onopen = () => {
    openCallback?.();
  };

  ws.onclose = () => {
    closeCallback?.();
  };

  ws.onerror = (event) => {
    errorCallback?.(event);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "Results") {
        const transcript = data.channel?.alternatives?.[0]?.transcript || "";
        // Treat either flag as "this transcript is safe to act on" (browser streams often rely on speech_final).
        const utteranceComplete = data.is_final === true || data.speech_final === true;
        if (transcript.trim().length > 0) {
          transcriptCallback?.(transcript, utteranceComplete);
        }
      }
    } catch (e) {
      console.error("Deepgram message parse error:", e);
    }
  };

  return {
    send: (data: Blob | ArrayBuffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    },
    close: () => {
      ws.close();
    },
    onTranscript: (callback) => {
      transcriptCallback = callback;
    },
    onOpen: (callback) => {
      openCallback = callback;
      // WebSocket may already be OPEN if registration happens after connect (race on fast networks).
      if (ws.readyState === WebSocket.OPEN) {
        callback();
      }
    },
    onClose: (callback) => {
      closeCallback = callback;
    },
    onError: (callback) => {
      errorCallback = callback;
    },
  };
}
