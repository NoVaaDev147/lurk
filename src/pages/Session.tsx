import { useEffect, useState } from "react";
import { useSessionStore } from "../store/sessionStore";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Session() {
  const { sessions, activeSession, elapsed, fetchSessions, startSession, endSession } = useSessionStore();
  const [gameInput, setGameInput] = useState("");

  useEffect(() => {
    fetchSessions();
  }, []);

  async function handleStart() {
    if (!gameInput.trim()) return;
    await startSession(gameInput.trim());
    setGameInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleStart();
  }

  const totalSeconds = sessions.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);

  return (
    <div className="flex flex-col h-full p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Session</h1>
        <p className="text-zinc-600 text-xs mt-0.5">
          {sessions.length} sessions · {formatDuration(totalSeconds)} total
        </p>
      </div>

      {/* Active session */}
      {activeSession ? (
        <div className="bg-zinc-900 border border-violet-500/20 rounded-2xl p-6 mb-6 relative overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-violet-500/5 rounded-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Now Playing</p>
                <p className="text-lg font-bold text-zinc-100">{activeSession.game}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <p className="text-5xl font-mono font-bold text-violet-400 mb-6 tracking-tight">
              {formatTime(elapsed)}
            </p>
            <button
              onClick={endSession}
              className="text-sm text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-red-500/10"
            >
              End Session
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 mb-6">
          <p className="text-sm text-zinc-400 mb-3 font-medium">What are you playing?</p>
          <div className="flex gap-2">
            <input
              value={gameInput}
              onChange={(e) => setGameInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Game name... press Enter to start"
              className="flex-1 bg-zinc-800 text-zinc-100 text-sm px-4 py-3 rounded-xl outline-none placeholder-zinc-700 border border-zinc-700/50 focus:border-violet-500/50 transition-all duration-200"
            />
            <button
              onClick={handleStart}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-3 rounded-xl transition-all duration-200 hover:scale-105 font-medium"
            >
              Start
            </button>
          </div>
        </div>
      )}

      {/* Session history */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-zinc-800/50" />
          <p className="text-xs text-zinc-600 uppercase tracking-widest">History</p>
          <div className="flex-1 h-px bg-zinc-800/50" />
        </div>

        <div className="space-y-2">
          {sessions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
              <p className="text-zinc-600 text-sm">No sessions yet. Start one above!</p>
            </div>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-150"
            >
              <div>
                <p className="text-sm font-medium text-zinc-200">{session.game}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{formatDate(session.started_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono text-zinc-400">
                  {session.duration_seconds ? formatDuration(session.duration_seconds) : (
                    <span className="text-green-500 animate-pulse">live</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}