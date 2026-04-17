import { create } from "zustand";
import { getDb } from "./db";
import { Session } from "../types";

interface SessionStore {
  sessions: Session[];
  activeSession: Session | null;
  elapsed: number;
  timerInterval: ReturnType<typeof setInterval> | null;
  fetchSessions: () => Promise<void>;
  startSession: (game: string) => Promise<void>;
  endSession: () => Promise<void>;
  tickTimer: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  activeSession: null,
  elapsed: 0,
  timerInterval: null,

  fetchSessions: async () => {
    const db = await getDb();
    const sessions = await db.select<Session[]>(
      "SELECT * FROM sessions ORDER BY started_at DESC LIMIT 20"
    );
    set({ sessions });
  },

  startSession: async (game) => {
    const db = await getDb();
    await db.execute("INSERT INTO sessions (game) VALUES (?)", [game]);
    const rows = await db.select<Session[]>(
      "SELECT * FROM sessions ORDER BY id DESC LIMIT 1"
    );
    const activeSession = rows[0];
    const interval = setInterval(() => get().tickTimer(), 1000);
    set({ activeSession, elapsed: 0, timerInterval: interval });
  },

  endSession: async () => {
    const { activeSession, elapsed, timerInterval } = get();
    if (!activeSession) return;
    if (timerInterval) clearInterval(timerInterval);
    const db = await getDb();
    await db.execute(
      "UPDATE sessions SET ended_at = datetime('now'), duration_seconds = ? WHERE id = ?",
      [elapsed, activeSession.id]
    );
    set({ activeSession: null, elapsed: 0, timerInterval: null });
    get().fetchSessions();
  },

  tickTimer: () => {
    set((state) => ({ elapsed: state.elapsed + 1 }));
  },
}));