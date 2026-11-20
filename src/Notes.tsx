import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { toast } from "./toast";
import { type Note, listNotes, createNote, updateNote, deleteNote } from "./api";

export default function Notes() {
    const [notes, setNotes] = useState<Note[]>([])
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

    const timer = useRef<number | null>(null);
    const pending = useRef<Note | null>(null);

    const selected = notes.find((n) => n.id === selectedId) ?? null;

    function cancelTimer() {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
    }

    async function flush() {
        cancelTimer();
        const n = pending.current;
        if (n) {
            pending.current = null;
            try {
              await updateNote(n.id, n.title, n.body)
              setSaveState("saved");
            } catch (e) {
              setSaveState("idle");
              toast("Couldn't save your note: " + String(e), "error");
            }
        }
    }

    useEffect(() => {
        listNotes().then((list) =>{
            setNotes(list);
            setSelectedId(list[0]?.id ?? null);
        });
        return () => {
            flush();
        };
    }, []);

    function edit(patch: Partial<Pick<Note, "title" | "body">>) {
        if (!selected) return;
        const next = {...selected, ...patch};
        setNotes((prev) => prev.map((n) => (n.id === next.id ? next : n)));
        setSaveState("saving");
        pending.current = next;
        cancelTimer();
        timer.current = window.setTimeout(flush, 600);
    }

    async function select(id: number) {
        await flush();
        setSaveState("idle");
        setSelectedId(id);
    }

    async function handleNew() {
        await flush();
        setSaveState("idle");
        const n = await createNote();
        setNotes((prev) => [n, ...prev]);
        setSelectedId(n.id);
    }

    async function confirmDelete() {
      const id = confirmId;
      setConfirmId(null);
      if (id === null) return;
      if (pending.current?.id === id) {
        pending.current = null;
        cancelTimer();
      }
      await deleteNote(id);
      const rest = notes.filter((n) => n.id !== id);
      setNotes(rest);
      setSelectedId(rest[0]?.id ?? null);
      setSaveState("idle");
    }

    return (
      <div className="notes">
        <div className="notes-side">
          <button className="btn primary" onClick={handleNew}>
            <Plus size={16} /> New note 
          </button>
          <div className="notes-list">
            {notes.map((n) => (
              <button
                key={n.id}
                className={`note-item ${n.id === selectedId ? "active" : ""}`}
                onClick={() => select(n.id)}
              >
                <div className="t">{n.title.trim() || "Untitled"}</div>
                <div className="p">{n.body.trim().split("\n")[0] || "No content"}</div>
              </button>
            ))}
          </div>
        </div>

        {selected ? (
          <div className="note-editor">
            <div className="row">
              <input
                className="input note-title grow"
                value={selected.title}
                placeholder="Title"
                onChange={(e) => edit({title: e.target.value})}
              />
              <span className="save-state">
                {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved ✔" : ""}
              </span>
              <button
                className="btn icon danger"
                onClick={() => setConfirmId(selected.id)}
                title="Delete note"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <textarea
              className="input note-body"
              value={selected.body}
              placeholder="Start writing..."
              onChange={(e) => edit({body: e.target.value})}
            />
          </div>
        ) : (
          <div className="empty">No notes yet. Create one to get started.</div>
        )}
        <ConfirmDialog
          open={confirmId !== null}
          title="Delete this note?"
          message="This can't be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      </div>
    );
}