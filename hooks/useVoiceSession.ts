"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AvatarRef } from "@/components/Avatar";
import { base64ToArrayBuffer, pickMediaRecorderMimeType } from "@/lib/audio";
import { INTRODUCTION_SCRIPT, OPENING_GREETING } from "@/lib/copy";
import { createDeepgramConnection, DeepgramConnection } from "@/lib/deepgram";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const UTTERANCE_DEDUPE_MS = 900;

export function useVoiceSession() {
  const [isActive, setIsActive] = useState(false);
  const [statusText, setStatusText] = useState("Ready to start.");
  const [userTranscripts, setUserTranscripts] = useState("");
  const [danaTranscripts, setDanaTranscripts] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const avatarRef = useRef<AvatarRef>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const deepgramConnectionRef = useRef<DeepgramConnection | null>(null);
  const isSpeakingRef = useRef(false);
  const recentVoiceUtteranceRef = useRef<{ text: string; at: number } | null>(null);
  const playbackEpochRef = useRef(0);
  const messagesRef = useRef<ChatMessage[]>([]);
  const isActiveRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const speakFromApi = useCallback(async (text: string) => {
    setDanaTranscripts(text);
    setStatusText("Dana is speaking...");
    isSpeakingRef.current = true;
    const epoch = playbackEpochRef.current;

    try {
      const ttsRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (epoch !== playbackEpochRef.current) return;

      const data = await ttsRes.json();

      if (!data.audioBase64 || epoch !== playbackEpochRef.current) return;

      const buffer = base64ToArrayBuffer(data.audioBase64);

      if (avatarRef.current && epoch === playbackEpochRef.current) {
        await avatarRef.current.speakAudio({
          audio: buffer,
          words: data.words,
          wtimes: data.wtimes,
          wdurations: data.wdurations,
          chars: data.chars,
          ctimes: data.ctimes,
          cdurations: data.cdurations,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (epoch === playbackEpochRef.current) {
        isSpeakingRef.current = false;
        setStatusText(isActiveRef.current ? "Listening..." : "Ready to start.");
      }
    }
  }, []);

  const handleUserSentence = useCallback(async (text: string) => {
    if (isSpeakingRef.current) return;
    setUserTranscripts(text);
    setStatusText("Thinking...");

    const prior = messagesRef.current;

    try {
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: prior, newMessage: text }),
      });
      const { reply } = await chatRes.json();
      const next: ChatMessage[] = [
        ...prior,
        { role: "user", content: text },
        { role: "assistant", content: reply },
      ];
      setMessages(next);
      messagesRef.current = next;
      await speakFromApi(reply);
    } catch (e) {
      console.error("Chat error:", e);
    }
  }, [speakFromApi]);

  const startCall = useCallback(async () => {
    let stream: MediaStream | null = null;
    try {
      setIsActive(true);
      setStatusText("Connecting...");
      setMessages([]);
      messagesRef.current = [];
      setUserTranscripts("");
      setDanaTranscripts("");
      recentVoiceUtteranceRef.current = null;

      avatarRef.current?.resumeAudioContext();

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneRef.current = stream;

      const connection = createDeepgramConnection();

      const mimeType = pickMediaRecorderMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) connection.send(event.data);
      };
      mediaRecorderRef.current = mediaRecorder;
      deepgramConnectionRef.current = connection;

      connection.onOpen(() => {
        if (mediaRecorder.state === "inactive") {
          mediaRecorder.start(250);
        }
        setStatusText("Connected.");
        void speakFromApi(OPENING_GREETING);
      });

      connection.onTranscript((sentence, utteranceComplete) => {
        if (isSpeakingRef.current) return;
        if (!utteranceComplete || sentence.trim().length === 0) return;
        const now = Date.now();
        const prev = recentVoiceUtteranceRef.current;
        if (prev && sentence === prev.text && now - prev.at < UTTERANCE_DEDUPE_MS) return;
        recentVoiceUtteranceRef.current = { text: sentence, at: now };
        void handleUserSentence(sentence);
      });

      connection.onError(() => {
        setStatusText("Speech service error — check Deepgram API key and browser console.");
      });
    } catch (err) {
      console.error(err);
      stream?.getTracks().forEach((t) => t.stop());

      const message =
        err instanceof Error && err.message.includes("NEXT_PUBLIC_DEEPGRAM_API_KEY")
          ? "Missing NEXT_PUBLIC_DEEPGRAM_API_KEY — add it to .env.local and restart npm run dev."
          : err instanceof Error && err.message.includes("Deepgram")
            ? err.message
            : "Microphone access denied or connection failed.";
      setStatusText(message);
      setIsActive(false);
    }
  }, [handleUserSentence, speakFromApi]);

  const endCall = useCallback(() => {
    setStatusText("Ending call...");
    playbackEpochRef.current += 1;
    isSpeakingRef.current = false;
    avatarRef.current?.stopSpeaking();

    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;

    microphoneRef.current?.getTracks().forEach((t) => t.stop());
    microphoneRef.current = null;

    deepgramConnectionRef.current?.close();
    deepgramConnectionRef.current = null;

    setIsActive(false);
    setStatusText("Call ended.");
  }, []);

  const playIntroduction = useCallback(() => {
    avatarRef.current?.resumeAudioContext();
    void speakFromApi(INTRODUCTION_SCRIPT);
  }, [speakFromApi]);

  return {
    avatarRef,
    isActive,
    statusText,
    userTranscripts,
    danaTranscripts,
    startCall,
    endCall,
    playIntroduction,
  };
}
