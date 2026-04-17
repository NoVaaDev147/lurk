import { useEffect, useState } from "react";
import { useNotesStore } from "../store/notesStore";
import { useTasksStore } from "../store/tasksStore";
import { useSessionStore } from "../store/sessionStore";
import { invoke } from "@tauri-apps/api/core";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Overlay() {
  const { notes, fetchNotes, addNote } = useNotesStore();
  const { tasks, fetchTasks, toggleTask, addTask } = useTasksStore();
  const [taskInput, setTaskInput] = useState("");
  const { activeSession, elapsed, fetchSessions } = useSessionStore();
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [opacity, setOpacity] = useState(0.9);

async function handleOpacity(val: number) {
  setOpacity(val);
}

async function handleAddNote(e: React.KeyboardEvent) {
  if (e.key === "Enter" && noteInput.trim()) {
    await addNote(noteInput.trim(), "");
    setNoteInput("");
  }
}
  
async function handleAddTask(e: React.KeyboardEvent) {
  if (e.key === "Enter" && taskInput.trim()) {
    await addTask(taskInput.trim());
    setTaskInput("");
  }
}

  useEffect(() => {
  fetchNotes();
  fetchTasks();
  fetchSessions();

  const interval = setInterval(() => {
    fetchNotes();
    fetchTasks();
    fetchSessions();
  }, 3000);

  return () => clearInterval(interval);
}, []);

async function handleDragStart() {
  await invoke("drag_overlay");
}

  const pinnedNotes = notes.filter((n) => n.pinned);
  const incompleteTasks = tasks.filter((t) => !t.completed);

  return (
    <div
  onMouseDown={handleDragStart}
  style={{ opacity }}
  className="h-screen w-screen p-3 flex flex-col gap-3 select-none overflow-hidden cursor-grab active:cursor-grabbing bg-zinc-900"
>
 {/* Header bar */}
<div
  className="flex items-center justify-between mb-1 gap-2"
  onMouseDown={(e) => e.stopPropagation()}
>
  <p className="text-xs font-bold text-zinc-500 tracking-widest">LURK</p>
  <input
    type="range"
    min="0.3"
    max="1"
    step="0.05"
    value={opacity}
    onChange={(e) => handleOpacity(parseFloat(e.target.value))}
    className="flex-1 accent-violet-500 h-1"
  />
  <button
    onClick={() => invoke("toggle_overlay")}
    className="text-zinc-600 hover:text-red-400 transition-colors text-sm leading-none"
  >
    ✕
  </button>
</div>
      {/* Session timer */}
      {activeSession && (
        <div className="bg-zinc-900/90 border border-violet-500/30 rounded-xl px-4 py-3 backdrop-blur-sm">
          <p className="text-xs text-zinc-500 mb-0.5">{activeSession.game}</p>
          <p className="text-2xl font-mono font-bold text-violet-400">{formatTime(elapsed)}</p>
        </div>
      )}

     {/* Pinned notes */}
<div
  className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 backdrop-blur-sm shrink-0"
  onMouseDown={(e) => e.stopPropagation()}
>
  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">📌 Pinned</p>

  {/* Quick add note */}
  <div className="flex gap-1.5 mb-2">
    <input
      value={noteInput}
      onChange={(e) => setNoteInput(e.target.value)}
      onKeyDown={handleAddNote}
      placeholder="Quick note... Enter to save"
      className="flex-1 bg-zinc-800 text-zinc-100 text-xs px-2.5 py-1.5 rounded-lg outline-none placeholder-zinc-600 border border-zinc-700 focus:border-violet-500 transition-colors"
    />
  </div>

  {pinnedNotes.length === 0 && (
    <p className="text-xs text-zinc-600">No pinned notes yet.</p>
  )}

  <div className="space-y-2 max-h-48 overflow-y-auto">
    {pinnedNotes.map((note) => (
      <div
        key={note.id}
        className="border-b border-zinc-800 pb-2 last:border-0 last:pb-0"
        onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
      >
        <p className="text-xs font-medium text-zinc-200 cursor-pointer hover:text-violet-300 transition-colors">
          {expandedNote === note.id ? "▼" : "▶"} {note.title || "Untitled"}
        </p>
        {expandedNote === note.id && (
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{note.content}</p>
        )}
      </div>
    ))}
  </div>
</div>

      {/* Tasks */}
<div
  className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 backdrop-blur-sm flex-1 overflow-hidden flex flex-col"
  onMouseDown={(e) => e.stopPropagation()}
>
  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
    ✅ Tasks ({incompleteTasks.length})
  </p>

  {/* Quick add input */}
  <div className="flex gap-1.5 mb-2">
    <input
      value={taskInput}
      onChange={(e) => setTaskInput(e.target.value)}
      onKeyDown={handleAddTask}
      placeholder="Add task... Enter to save"
      className="flex-1 bg-zinc-800 text-zinc-100 text-xs px-2.5 py-1.5 rounded-lg outline-none placeholder-zinc-600 border border-zinc-700 focus:border-violet-500 transition-colors"
    />
  </div>

  <div className="space-y-1.5 overflow-y-auto flex-1">
    {incompleteTasks.map((task) => (
      <div
        key={task.id}
        onClick={() => toggleTask(task.id, task.completed)}
        className="flex items-center gap-2 cursor-pointer group"
      >
        <div className="w-3.5 h-3.5 rounded border border-zinc-600 group-hover:border-violet-400 transition-colors shrink-0" />
        <p className="text-xs text-zinc-300 group-hover:text-zinc-100 transition-colors">{task.text}</p>
      </div>
    ))}
    {incompleteTasks.length === 0 && (
      <p className="text-xs text-zinc-600">No tasks. Add one above!</p>
    )}
  </div>
</div>

      {/* Empty state */}
      {!activeSession && pinnedNotes.length === 0 && incompleteTasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-600 text-xs text-center">No active session,<br/>pinned notes, or tasks</p>
        </div>
      )}
    </div>
  );
}