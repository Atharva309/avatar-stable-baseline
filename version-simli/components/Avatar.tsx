"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  generateIceServers,
  generateSimliSessionToken,
  LogLevel,
  SimliClient,
} from "simli-client";

export interface AvatarRef {
  speakAudio: (data: {
    audio: ArrayBuffer | Blob;
    words?: string[];
    wtimes?: number[];
    wdurations?: number[];
    chars?: string[];
    ctimes?: number[];
    cdurations?: number[];
    /** Optional caption path for alternate avatar implementations (e.g. Rapport TTS). */
    text?: string;
  }) => Promise<void>;
  resumeAudioContext: () => void;
  stopSpeaking: () => void;
}

const TARGET_SAMPLE_RATE = 16000;

/** Bytes per Simli.sendAudioData slice after PCM16 exists (8192 = 4096 Int16 samples). */
const PCM_CHUNK_BYTES = 8192;

/** Float samples per worker job; output is at most PCM_CHUNK_BYTES of PCM16. */
const FLOAT_SAMPLES_PER_WORKER_CHUNK = PCM_CHUNK_BYTES / 2;

const SIMLI_CONNECT_TIMEOUT_MS = 120_000;
const POST_CONNECT_ACK_WAIT_MS = 300;

function resampleLinear(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const outLength = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = srcPos - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}

// Decode + mono + resample on main thread only (decodeAudioData cannot run in a worker).
async function decodeToMonoFloat16k(arrayBuffer: ArrayBuffer, audioContext: AudioContext): Promise<Float32Array> {
  if (audioContext.sampleRate !== TARGET_SAMPLE_RATE) {
    console.warn(`[Avatar] AudioContext sampleRate is ${audioContext.sampleRate}, expected ${TARGET_SAMPLE_RATE}`);
  }

  const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  const nCh = decoded.numberOfChannels;
  const len = decoded.length;

  let samples: Float32Array;
  if (nCh === 1) {
    samples = decoded.getChannelData(0);
  } else {
    samples = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      let sum = 0;
      for (let c = 0; c < nCh; c++) sum += decoded.getChannelData(c)[i];
      samples[i] = sum / nCh;
    }
  }

  if (decoded.sampleRate !== TARGET_SAMPLE_RATE) {
    samples = resampleLinear(samples, decoded.sampleRate, TARGET_SAMPLE_RATE);
  }

  return samples;
}

function convertFloatChunkInWorker(worker: Worker, chunk: Float32Array): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const copy = new Float32Array(chunk.length);
    copy.set(chunk);

    const onMsg = (ev: MessageEvent<ArrayBuffer | null>) => {
      worker.removeEventListener("message", onMsg);
      worker.removeEventListener("error", onErr);
      const buf = ev.data;
      if (!buf) reject(new Error("PCM worker returned empty"));
      else resolve(buf);
    };
    const onErr = () => {
      worker.removeEventListener("message", onMsg);
      worker.removeEventListener("error", onErr);
      reject(new Error("PCM worker error"));
    };

    worker.addEventListener("message", onMsg);
    worker.addEventListener("error", onErr);
    worker.postMessage(copy.buffer, [copy.buffer]);
  });
}

/** Push PCM to Simli in a tight loop — no timers between calls. */
function sendPcmToSimli(client: SimliClient, pcmU8: Uint8Array, shouldAbort: () => boolean) {
  for (let i = 0; i < pcmU8.length; i += PCM_CHUNK_BYTES) {
    if (shouldAbort()) return;
    const end = Math.min(i + PCM_CHUNK_BYTES, pcmU8.length);
    client.sendAudioData(pcmU8.subarray(i, end));
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId)) as Promise<T>;
}

function kickVideoPlay(video: HTMLVideoElement) {
  void video.play().catch(() => {});
  if (video.srcObject) void video.play().catch(() => {});
}

export const Avatar = forwardRef<AvatarRef, {}>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const simliRef = useRef<SimliClient | null>(null);
  const decodeAudioContextRef = useRef<AudioContext | null>(null);
  const pcmWorkerRef = useRef<Worker | null>(null);
  const speakAbortRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const ensureDecodeAudioContext = (): AudioContext => {
    const prev = decodeAudioContextRef.current;
    if (prev && prev.state !== "closed") {
      return prev;
    }

    if (prev?.state === "closed") {
      console.warn("[Avatar] Decode AudioContext was closed; creating a new one.");
    }

    const next = new AudioContext({
      sampleRate: TARGET_SAMPLE_RATE,
      latencyHint: "playback",
    });
    decodeAudioContextRef.current = next;
    return next;
  };

  useLayoutEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
  }, []);

  useEffect(() => {
    const worker = new Worker("/pcm-worker.js");
    pcmWorkerRef.current = worker;
    return () => {
      worker.terminate();
      pcmWorkerRef.current = null;
    };
  }, []);

  // Init: Simli token + WebRTC; kick video.play once streams attach.
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    let cancelled = false;

    const initSimli = async () => {
      const apiKey = process.env.NEXT_PUBLIC_SIMLI_API_KEY;
      const faceId = process.env.NEXT_PUBLIC_SIMLI_FACE_ID;

      if (!apiKey || !faceId) {
        setInitError("Add NEXT_PUBLIC_SIMLI_API_KEY and NEXT_PUBLIC_SIMLI_FACE_ID to .env.local.");
        return;
      }

      try {
        const tokenRes = await generateSimliSessionToken({
          apiKey,
          config: {
            faceId,
            handleSilence: true,
            maxSessionLength: 3600,
            maxIdleTime: 300,
          },
        });

        const sessionToken = tokenRes?.session_token;
        if (typeof sessionToken !== "string" || sessionToken.length === 0) {
          throw new Error("Simli token response missing session_token — check API key and face ID.");
        }

        const iceServers = await generateIceServers(apiKey);

        const client = new SimliClient(
          sessionToken,
          video,
          audio,
          iceServers,
          LogLevel.ERROR,
          "livekit",
          "websockets",
          "wss://api.simli.ai"
        );

        client.on("error", (detail) => {
          console.error("Simli:", detail);
        });

        if (cancelled) {
          await client.stop().catch(() => {});
          return;
        }

        simliRef.current = client;

        kickVideoPlay(video);

        await withTimeout(
          client.start(),
          SIMLI_CONNECT_TIMEOUT_MS,
          `Simli did not connect within ${SIMLI_CONNECT_TIMEOUT_MS / 1000}s. Try Chrome, disable VPN/ad-block on api.simli.ai, confirm your face ID and API key, then reload.`
        );

        if (cancelled) {
          await client.stop().catch(() => {});
          return;
        }

        kickVideoPlay(video);

        await new Promise<void>((resolve) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          client.on("ack", done);
          setTimeout(done, POST_CONNECT_ACK_WAIT_MS);
        });

        if (cancelled) {
          await client.stop().catch(() => {});
          return;
        }

        kickVideoPlay(video);
        requestAnimationFrame(() => kickVideoPlay(video));
        requestAnimationFrame(() => requestAnimationFrame(() => kickVideoPlay(video)));

        setIsReady(true);
      } catch (e) {
        console.error("Simli session failed:", e);
        if (cancelled) return;

        const msg = e instanceof Error ? e.message : "Could not connect to Simli.";
        const hint =
          msg.includes("CONNECTION TIMED OUT") || msg.includes("timed out")
            ? `${msg} If this persists, try another network or browser (Safari sometimes blocks WebRTC until a user gesture — tap “Start call” first).`
            : msg;
        setInitError(hint);
      }
    };

    void initSimli();

    // Cleanup: stop Simli, terminate PCM worker is separate effect; close decode AudioContext here.
    return () => {
      cancelled = true;
      setIsReady(false);

      const client = simliRef.current;
      simliRef.current = null;
      void client?.stop().catch(() => {});

      const ctx = decodeAudioContextRef.current;
      decodeAudioContextRef.current = null;
      void ctx?.close().catch(() => {});
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      resumeAudioContext: () => {
        const ctx = decodeAudioContextRef.current;
        if (ctx?.state === "suspended") void ctx.resume();
        const v = videoRef.current;
        if (v) kickVideoPlay(v);
        void audioRef.current?.play().catch(() => {});
      },
      stopSpeaking: () => {
        speakAbortRef.current = true;
        try {
          simliRef.current?.ClearBuffer();
        } catch {
          /* no-op */
        }
      },
      speakAudio: async ({ audio }) => {
        const client = simliRef.current;
        const worker = pcmWorkerRef.current;
        if (!client || !isReady || !worker) return;

        speakAbortRef.current = false;

        const arrayBuffer = audio instanceof Blob ? await audio.arrayBuffer() : audio;
        const ctx = ensureDecodeAudioContext();
        if (ctx.state === "suspended") await ctx.resume();

        const samples = await decodeToMonoFloat16k(arrayBuffer, ctx);

        await new Promise<void>((r) => queueMicrotask(r));

        for (let off = 0; off < samples.length; off += FLOAT_SAMPLES_PER_WORKER_CHUNK) {
          if (speakAbortRef.current) break;

          const end = Math.min(off + FLOAT_SAMPLES_PER_WORKER_CHUNK, samples.length);
          const slice = samples.subarray(off, end);

          const pcmBuf = await convertFloatChunkInWorker(worker, slice);
          const pcmU8 = new Uint8Array(pcmBuf);

          sendPcmToSimli(client, pcmU8, () => speakAbortRef.current);

          await new Promise<void>((r) => queueMicrotask(r));
        }
      },
    }),
    [isReady]
  );

  const showOverlay = !isReady || initError !== null;

  return (
    <div className="w-full max-w-sm aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-b from-gray-800 to-black relative">
      {showOverlay && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/60 px-4 text-center text-sm text-gray-300">
          {initError ?? "Connecting to Simli..."}
        </div>
      )}
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay={true}
        playsInline={true}
        muted={true}
      />
      <audio ref={audioRef} className="hidden" autoPlay={true} playsInline={true} />
    </div>
  );
});

Avatar.displayName = "Avatar";
