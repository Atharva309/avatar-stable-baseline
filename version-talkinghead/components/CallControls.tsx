"use client";

type CallControlsProps = {
  isActive: boolean;
  onStart: () => void;
  onEnd: () => void;
  statusText: string;
};

export function CallControls({ isActive, onStart, onEnd, statusText }: CallControlsProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-4 mt-6">
      <div className="h-6 flex items-center justify-center text-sm font-semibold tracking-wide text-gray-400 min-w-[200px]">
        {statusText}
      </div>
      <button 
        onClick={isActive ? onEnd : onStart}
        className={`px-10 py-4 rounded-full text-white font-bold text-xl transition-all shadow-xl hover:scale-105 active:scale-95 ${isActive ? 'bg-red-500 hover:bg-red-600 shadow-red-900/50' : 'bg-green-500 hover:bg-green-600 shadow-green-900/50'}`}
      >
        {isActive ? "End Call" : "Start Call"}
      </button>
    </div>
  );
}
