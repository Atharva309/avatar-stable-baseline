"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { AvatarRef } from "@/components/Avatar";

const RAPPORT_SCRIPT_URL = "https://cdn.rapport.cloud/rapport-web-viewer/rapport.js";

function ensureRapportScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).customElements?.get("rapport-scene")) return Promise.resolve();

  const existing = document.querySelector(`script[src="${RAPPORT_SCRIPT_URL}"]`) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Rapport script")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RAPPORT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Rapport script"));
    document.head.appendChild(script);
  });
}

export const RapportAvatar = forwardRef<AvatarRef, {}>((props, ref) => {
  const sceneRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const projectToken = process.env.NEXT_PUBLIC_RAPPORT_PROJECT_TOKEN;
  const speakerMuted = process.env.NEXT_PUBLIC_RAPPORT_SPEAKER_MUTED === "true";

  useEffect(() => {
    let disposed = false;

    const init = async () => {
      if (!projectToken) {
        console.warn("NEXT_PUBLIC_RAPPORT_PROJECT_TOKEN is not set. Rapport avatar is disabled.");
        setIsReady(true);
        return;
      }

      await ensureRapportScript();
      if (disposed) return;
      const scene = sceneRef.current;
      if (!scene) return;

      const onConnected = () => {
        if (!disposed) {
          setIsConnected(true);
          setIsReady(true);
        }
      };
      const onDisconnected = () => {
        if (!disposed) setIsConnected(false);
      };

      scene.addEventListener("sessionConnected", onConnected);
      scene.addEventListener("sessionDisconnected", onDisconnected);

      try {
        await scene.sessionRequest({
          projectToken,
          micRequired: false,
          speakerMuted,
          progressBar: false,
          statusBar: false,
        });
      } catch (error) {
        console.error("Rapport sessionRequest failed:", error);
        if (!disposed) setIsReady(true);
      }

      return () => {
        scene.removeEventListener("sessionConnected", onConnected);
        scene.removeEventListener("sessionDisconnected", onDisconnected);
      };
    };

    const cleanupPromise = init();
    return () => {
      disposed = true;
      Promise.resolve(cleanupPromise).then((cleanup) => cleanup?.());
      try {
        sceneRef.current?.sessionDisconnect?.();
      } catch {
        // no-op
      }
    };
  }, [projectToken, speakerMuted]);

  useImperativeHandle(ref, () => ({
    resumeAudioContext: () => {
      // Rapport internally controls audio context once session is connected.
    },
    stopSpeaking: () => {
      try {
        sceneRef.current?.modules?.commands?.stopAllSpeech?.();
      } catch {
        // no-op
      }
    },
    speakAudio: async ({ audio, text }) => {
      const scene = sceneRef.current;

      if (scene && isConnected && typeof text === "string" && text.trim()) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            scene.removeEventListener("ttsEnd", handler);
            resolve();
          };
          scene.addEventListener("ttsEnd", handler, { once: true });
          try {
            scene.modules.tts.sendText(text);
          } catch {
            scene.removeEventListener("ttsEnd", handler);
            resolve();
          }
        });
        return;
      }

      // Fallback: play supplied audio if Rapport TTS path is unavailable.
      if (!audio) return;
      const arrayBuffer = audio instanceof Blob ? await audio.arrayBuffer() : audio;
      const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const player = new Audio(url);
      await player.play();
      await new Promise<void>((resolve) => {
        player.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
      });
    },
  }));

  return (
    <div className="w-full max-w-sm aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-b from-gray-800 to-black relative">
      {!isReady && (
        <div className="absolute inset-0 grid place-items-center text-sm text-gray-300">
          Loading rapport avatar...
        </div>
      )}
      <rapport-scene
        ref={sceneRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        project-token={projectToken ?? ""}
      />
      {!projectToken && (
        <div className="absolute bottom-2 left-2 right-2 text-[11px] text-center text-yellow-300 bg-black/50 rounded px-2 py-1">
          Set NEXT_PUBLIC_RAPPORT_PROJECT_TOKEN to enable managed avatar runtime.
        </div>
      )}
    </div>
  );
});

RapportAvatar.displayName = "RapportAvatar";
