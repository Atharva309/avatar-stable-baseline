"use client";

import { Avatar } from "@/components/Avatar";
import { CallControls } from "@/components/CallControls";
import { Transcript } from "@/components/Transcript";
import { useVoiceSession } from "@/hooks/useVoiceSession";

export default function Page() {
  const {
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
  } = useVoiceSession();

  return (
    <main className="min-h-screen bg-black text-gray-100 flex flex-col p-4 md:p-8 font-sans selection:bg-blue-900 selection:text-white">
      <div className="flex-grow w-full max-w-4xl mx-auto flex flex-col">
        <header className="text-center mb-8 pt-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-gray-100 to-gray-500 bg-clip-text text-transparent">
            Dana Reeves
          </h1>
          <p className="text-blue-400 font-semibold tracking-widest uppercase text-xs md:text-sm">
            Retail shop owner · Walmart tenant
          </p>
        </header>

        <div className="flex-grow flex flex-col items-center">
          <Avatar
            ref={avatarRef}
            conversationActive={isActive}
            onMessageHistoryUpdated={onAnamMessageHistory}
            onMessageStreamEvent={onAnamMessageStream}
          />
          <CallControls isActive={isActive} onStart={startCall} onEnd={endCall} statusText={statusText} />
          <button
            type="button"
            onClick={playIntroduction}
            className="mt-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded text-sm"
          >
            Hear introduction
          </button>
          <Transcript userText={userTranscripts} danaText={danaTranscripts} />
        </div>
      </div>
    </main>
  );
}
