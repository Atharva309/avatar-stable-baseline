"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message, MessageStreamEvent } from "@anam-ai/js-sdk";
import { MessageRole } from "@anam-ai/js-sdk";
import type { AvatarRef } from "@/components/Avatar";
import { INTRODUCTION_SCRIPT, OPENING_GREETING } from "@/lib/copy";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const STREAM_COMMIT_DEBOUNCE_MS = 1200;

export function useVoiceSession() {
  const [isActive, setIsActive] = useState(false);
  const [statusText, setStatusText] = useState("Ready to start.");
  const [userTranscripts, setUserTranscripts] = useState("");
  const [danaTranscripts, setDanaTranscripts] = useState("");
  const avatarRef = useRef<AvatarRef>(null);
  const isSpeakingRef = useRef(false);
  const playbackEpochRef = useRef(0);
  const isActiveRef = useRef(false);

  const danaWordBufferRef = useRef("");
  const userWordBufferRef = useRef("");
  const danaCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStreamTimers = useCallback(() => {
    if (danaCommitTimerRef.current) {
      clearTimeout(danaCommitTimerRef.current);
      danaCommitTimerRef.current = null;
    }
    if (userCommitTimerRef.current) {
      clearTimeout(userCommitTimerRef.current);
      userCommitTimerRef.current = null;
    }
  }, []);

  const clearStreamBuffers = useCallback(() => {
    danaWordBufferRef.current = "";
    userWordBufferRef.current = "";
    clearStreamTimers();
  }, [clearStreamTimers]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    return () => clearStreamTimers();
  }, [clearStreamTimers]);

  const speakOpeningOrText = useCallback(async (text: string) => {
    clearStreamTimers();
    danaWordBufferRef.current = text;
    setDanaTranscripts(text);
    setStatusText("Dana is speaking...");
    isSpeakingRef.current = true;
    const epoch = playbackEpochRef.current;

    try {
      await avatarRef.current?.speakAudio({ audio: new ArrayBuffer(0), text });
    } catch (e) {
      console.error(e);
    } finally {
      if (epoch === playbackEpochRef.current) {
        isSpeakingRef.current = false;
        setStatusText(isActiveRef.current ? "Listening..." : "Ready to start.");
      }
    }
  }, [clearStreamTimers]);

  const onAnamMessageHistory = useCallback(
    (msgs: Message[]) => {
      clearStreamTimers();
      const lastUser = [...msgs].reverse().find((m) => m.role === MessageRole.USER)?.content;
      if (lastUser !== undefined) {
        userWordBufferRef.current = lastUser;
        setUserTranscripts(lastUser);
      }
      // Dana transcript: stream events only (history would duplicate and refill the word buffer).
    },
    [clearStreamTimers]
  );

  const onAnamMessageStream = useCallback((ev: MessageStreamEvent) => {
    const piece = ev.content.trim();
    if (!piece) return;

    const commitNow = ev.endOfSpeech || ev.interrupted;

    const scheduleUtteranceEnd = (role: "user" | "persona") => {
      if (role === "user") {
        if (userCommitTimerRef.current) clearTimeout(userCommitTimerRef.current);
        userCommitTimerRef.current = setTimeout(() => {
          userWordBufferRef.current = "";
          userCommitTimerRef.current = null;
        }, STREAM_COMMIT_DEBOUNCE_MS);
      } else {
        if (danaCommitTimerRef.current) clearTimeout(danaCommitTimerRef.current);
        danaCommitTimerRef.current = setTimeout(() => {
          danaWordBufferRef.current = "";
          danaCommitTimerRef.current = null;
        }, STREAM_COMMIT_DEBOUNCE_MS);
      }
    };

    if (ev.role === MessageRole.USER) {
      userWordBufferRef.current += (userWordBufferRef.current ? " " : "") + piece;
      setUserTranscripts(userWordBufferRef.current);
      if (userCommitTimerRef.current) clearTimeout(userCommitTimerRef.current);
      if (commitNow) {
        userWordBufferRef.current = "";
        userCommitTimerRef.current = null;
      } else {
        scheduleUtteranceEnd("user");
      }
      return;
    }

    if (ev.role === MessageRole.PERSONA) {
      danaWordBufferRef.current += (danaWordBufferRef.current ? " " : "") + piece;
      setDanaTranscripts(danaWordBufferRef.current);
      if (danaCommitTimerRef.current) clearTimeout(danaCommitTimerRef.current);
      if (commitNow) {
        danaWordBufferRef.current = "";
        danaCommitTimerRef.current = null;
      } else {
        scheduleUtteranceEnd("persona");
      }
    }
  }, []);

  const startCall = useCallback(async () => {
    try {
      setIsActive(true);
      setStatusText("Connecting...");
      setUserTranscripts("");
      setDanaTranscripts("");
      clearStreamBuffers();

      playbackEpochRef.current += 1;

      setStatusText("Connected.");
      await new Promise<void>((r) => queueMicrotask(r));
      await speakOpeningOrText(OPENING_GREETING);
    } catch (err) {
      console.error(err);
      setStatusText(err instanceof Error ? err.message : "Could not start call.");
      setIsActive(false);
    }
  }, [clearStreamBuffers, speakOpeningOrText]);

  const endCall = useCallback(() => {
    setStatusText("Ending call...");
    playbackEpochRef.current += 1;
    isSpeakingRef.current = false;
    avatarRef.current?.stopSpeaking();
    setIsActive(false);
    setStatusText("Call ended.");
    setUserTranscripts("");
    setDanaTranscripts("");
    clearStreamBuffers();
  }, [clearStreamBuffers]);

  const playIntroduction = useCallback(() => {
    if (!isActiveRef.current) setIsActive(true);
    queueMicrotask(() => void speakOpeningOrText(INTRODUCTION_SCRIPT));
  }, [speakOpeningOrText]);

  return {
    avatarRef,
    isActive,
    statusText,
    userTranscripts,
    danaTranscripts,
    startCall,
    endCall,
    playIntroduction,
    onAnamMessageHistory,
    onAnamMessageStream,
  };
}
