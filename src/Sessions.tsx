import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Play, Square, Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import {
    type Session,
    type Task,
    getActiveSession,
    listSessions,
    startSession,
    stopSession,
    deleteSession,
    listTasks,
} from "./api"

const pad = (n: number) => String(n).padStart(2, "0");

function clock(secs: number) {
    return `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;

}

function short(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60;
    if (h > 0) return `${h}h ${pad(m)}m`;
    if (m > 0) return `${m}m ${pad(s)}s`;
    return `${s}s`;
}

const when = (iso: string) =>
    new Date(iso).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });

const titleOf = (s: Session) => s.gameName ?? s.label ?? s.taskTitle ?? "Untitled session";

export default function Sessions() {
    const [active, setActive] = useState<Session | null>(null);
    const [history, setHistory] = useState<Session[]>([]);
    const [openTasks, setOpenTasks] = useState<Task[]>([]);
    const [label, setLabel] = useState("");
    const [taskId, setTaskId] = useState("");
    const [now, setNow] = useState(Date.now());
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [isGame, setIsGame] = useState(false);
    const [error, setError] = useState("");

    const activeId = useRef<number | null>(null);
    useEffect(() => {
      activeId.current = active?.id ?? null;
    }, [active]);

    const refresh = useCallback(async () => {
        const [a, h, t] = await Promise.allSettled([
            getActiveSession(),
            listSessions(),
            listTasks(),
        ]);
      
        if (a.status === "fulfilled") setActive(a.value);
        else setError("Active session failed: " + String(a.reason));

        if (h.status === "fulfilled") setHistory(h.value);
        else setError("History failed: " + String(h.reason));
        
        if (t.status === "fulfilled") setOpenTasks(t.value.filter((x) => !x.completed));
        else setError("Tasks failed: " + String(t.reason));
    }, []);

    useEffect(() =>{
      refresh();
      const unlisten = listen("sessions-changed", () => refresh());
      const poll = setInterval(async () => {
        try {
          const a = await getActiveSession();
          if ((a?.id ?? null) !== activeId.current) refresh();
        } catch (e) {
          console.error(e);
        }
      }, 3000);
      return () => {
        unlisten.then((f) => f());
        clearInterval(poll);
      };
    }, [refresh]);

    useEffect(() => {
        if (!active) return;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [active]);

    async function handleStart() {
        setError("");
        try {
            await startSession(label.trim() || null, taskId ? Number(taskId) : null, isGame);
            setLabel("");
            setTaskId("");
            setIsGame(false);
            await refresh();
        } catch (e) {
            setError(String(e));
        }
    }

    async function handleStop() {
        setError("");
        try {
            await stopSession();
            await refresh();
        } catch (e) {
            setError(String(e));
        }
    }

    async function confirmDelete() {
        const id = confirmId;
        setConfirmId(null);
        if (id === null) return;
        await deleteSession(id);
        await refresh();
    }

    const elapsed = active
        ? Math.max(0, Math.floor((now - Date.parse(active.startedAt)) / 1000))
        : 0;

    return (
      <div>
        <h2>Sessions</h2>

        {active ? (
          <div className="session-card live">
            <div className="sub">
              <span className="live-dot" />
              Session running
            </div>
            <div className="timer">{clock(elapsed)}</div>
            <div className="name">{titleOf(active)}</div>
            {active.taskTitle && titleOf(active) !== active.taskTitle && (
              <div className="sub">Task: {active.taskTitle}</div>
            )}
            <div style={{margin: 14}}>
              <button className="btn destructive" onClick={handleStop}>
                <Square size={16} /> Stop
              </button>
            </div>
          </div>
        ) : (
          <div className="session-card">
            <div className="row">
              <input
                className="input grow"
                value={label}
                placeholder={isGame ? "Game name" : "What are you working on?"}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={isGame}
                  onChange={(e) => setIsGame(e.target.checked)}
                />
                Game
              </label>
              <select
                className="input"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
              >
                <option value="">No task</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <button className="btn primary" onClick={handleStart}>
                <Play size={16} /> Start
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="sub" style={{color: "var(--danger)"}}>
            {error}
          </div>
        )}

        <h3 className="section-title">History</h3>
        {history.length === 0 && <div className="empty">No sessions yet. Start one above.</div>}

        <ul className="history-list">
          {history.map((s) => (
            <li key={s.id} className="history-item">
              <div className="history-main">
                <div className="t">{titleOf(s)}</div>
                <div className="s">
                  {when(s.startedAt)}
                  {s.taskTitle && titleOf(s) !== s.taskTitle ? ` · ${s.taskTitle}` : ""}
                </div>
              </div>
              <span className="chip">{s.source === "auto" ? "Auto" : "Manual"}</span>
              <span className="duration">{short(s.durationSecs ?? 0)}</span>
              <button
                className="btn icon danger"
                onClick={() => setConfirmId(s.id)}
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>

        <ConfirmDialog
          open={confirmId !== null}
          title="Delete this session?"
          message="It will be removed from your history. This can't be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      </div>
    );
}