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
  AnamEvent,
  unsafe_createClientWithApiKey,
  type AnamClient,
  type Message,
  type MessageStreamEvent,
  type PersonaConfig,
} from "@anam-ai/js-sdk";
import { CHAT_SYSTEM_PROMPT } from "@/lib/persona";

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

export type AvatarProps = {
  /** When true, starts (or keeps) the Anam WebRTC stream; when false, tears down streaming. */
  conversationActive?: boolean;
  onMessageHistoryUpdated?: (messages: Message[]) => void;
  onMessageStreamEvent?: (event: MessageStreamEvent) => void;
};

const VIDEO_ID = "anam-avatar-video";
const AUDIO_ID = "anam-avatar-audio";

export const Avatar = forwardRef<AvatarRef, AvatarProps>((props, ref) => {
  const { conversationActive = false, onMessageHistoryUpdated, onMessageStreamEvent } = props;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const anamRef = useRef<AnamClient | null>(null);
  const streamingRef = useRef(false);
  const historyCbRef = useRef(onMessageHistoryUpdated);
  const streamCbRef = useRef(onMessageStreamEvent);

  const [initError, setInitError] = useState<string | null>(null);
  /** Transport connected and media attached (only while conversationActive). */
  const [streamReady, setStreamReady] = useState(false);

  useEffect(() => {
    historyCbRef.current = onMessageHistoryUpdated;
    streamCbRef.current = onMessageStreamEvent;
  }, [onMessageHistoryUpdated, onMessageStreamEvent]);

  useLayoutEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
  }, []);

  // Create Anam client once; message listeners stay registered for the component lifetime.
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ANAM_API_KEY;
    const personaId = process.env.NEXT_PUBLIC_ANAM_PERSONA_ID;

    if (!apiKey || !personaId) {
      setInitError("Add NEXT_PUBLIC_ANAM_API_KEY and NEXT_PUBLIC_ANAM_PERSONA_ID to .env.local.");
      return;
    }

    const personaConfig: PersonaConfig = {
      personaId,
      name: "Dana",
      avatarId: personaId,
      voiceId: personaId,
      systemPrompt: CHAT_SYSTEM_PROMPT,
    };

    const client = unsafe_createClientWithApiKey(apiKey, personaConfig);
    anamRef.current = client;

    const onHistory = (messages: Message[]) => {
      historyCbRef.current?.(messages);
    };
    const onStream = (ev: MessageStreamEvent) => {
      streamCbRef.current?.(ev);
    };

    client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, onHistory);
    client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onStream);

    return () => {
      client.removeListener(AnamEvent.MESSAGE_HISTORY_UPDATED, onHistory);
      client.removeListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onStream);
      streamingRef.current = false;
      void client.stopStreaming().catch(() => {});
      anamRef.current = null;
      const video = videoRef.current;
      const audio = audioRef.current;
      if (video) video.srcObject = null;
      if (audio) audio.srcObject = null;
    };
  }, []);

  // Start/stop streaming when the user starts or ends a call.
  useEffect(() => {
    const client = anamRef.current;
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!client || !video || !audio || initError) return;

    if (!conversationActive) {
      if (streamingRef.current) {
        streamingRef.current = false;
        setStreamReady(false);
        void client.stopStreaming().catch(() => {});
        video.srcObject = null;
        audio.srcObject = null;
      }
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (streamingRef.current) return;

      try {
        const streams = await client.stream();
        if (cancelled) return;

        streamingRef.current = true;

        for (const stream of streams) {
          if (stream.getVideoTracks().length > 0) {
            video.srcObject = stream;
            video.muted = true;
            void video.play().catch(() => {});
          }
          if (stream.getAudioTracks().length > 0) {
            audio.srcObject = stream;
            void audio.play().catch(() => {});
          }
        }

        if (!cancelled) setStreamReady(true);
      } catch (e) {
        console.error("Anam stream failed:", e);
        if (!cancelled) {
          setInitError(e instanceof Error ? e.message : "Could not start Anam session.");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [conversationActive, initError]);

  useImperativeHandle(ref, () => ({
    resumeAudioContext: () => {},
    stopSpeaking: () => {
      try {
        anamRef.current?.interruptPersona();
      } catch {
        /* no-op */
      }
    },
    speakAudio: async ({ text }) => {
      const client = anamRef.current;
      if (!client || !text?.trim()) return;
      for (let i = 0; i < 80; i++) {
        if (client.isStreaming()) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      if (!client.isStreaming()) return;
      await client.talk(text.trim());
    },
  }));

  const showOverlay =
    initError !== null || !conversationActive || (conversationActive && !streamReady);

  const overlayMessage =
    initError ??
    (!conversationActive ? "Press Start Call to begin." : !streamReady ? "Connecting to Anam..." : null);

  return (
    <div className="w-full max-w-sm aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-b from-gray-800 to-black relative">
      {showOverlay && overlayMessage && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/60 px-4 text-center text-sm text-gray-300">
          {overlayMessage}
        </div>
      )}
      <video
        id={VIDEO_ID}
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay={true}
        playsInline={true}
        muted={true}
      />
      <audio id={AUDIO_ID} ref={audioRef} className="hidden" autoPlay={true} playsInline={true} />
    </div>
  );
});

Avatar.displayName = "Avatar";
