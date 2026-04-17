import { useEffect, useState } from "react";
import { useNotesStore } from "../store/notesStore";
import { Note } from "../types";

export default function Notes() {
  const { notes, loading, fetchNotes, addNote, updateNote, togglePin, deleteNote } = useNotesStore();
  const [selected, setSelected] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  function handleSelect(note: Note) {
    setSelected(note);
    setTitle(note.title);
    setContent(note.content);
    setIsNew(false);
    setSaved(false);
  }

  function handleNew() {
    setSelected(null);
    setTitle("");
    setContent("");
    setIsNew(true);
    setSaved(false);
  }

  async function handleSave() {
    if (!title.trim() && !content.trim()) return;
    if (isNew) {
      await addNote(title, content);
      setIsNew(false);
    } else if (selected) {
      await updateNote(selected.id, title, content);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDelete() {
    if (!selected) return;
    await deleteNote(selected.id);
    setSelected(null);
    setTitle("");
    setContent("");
  }

  const pinned = notes.filter((n) => n.pinned);
  const unpinned = notes.filter((n) => !n.pinned);

  return (
    <div className="flex h-full">
      {/* Notes list */}
      <div className="w-64 bg-zinc-900/50 border-r border-zinc-800/50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800/50">
          <h1 className="text-xs font-semibold text-zinc-400 tracking-widest uppercase">Notes</h1>
          <button
            onClick={handleNew}
            className="w-6 h-6 rounded-md bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
          >
            <span className="text-sm leading-none">+</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading && (
            <p className="text-zinc-600 text-xs px-4 py-3">Loading...</p>
          )}
          {!loading && notes.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-zinc-600 text-xs">No notes yet.</p>
              <p className="text-zinc-700 text-xs mt-1">Hit + to create one.</p>
            </div>
          )}

          {/* Pinned section */}
          {pinned.length > 0 && (
            <>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-4 py-2">Pinned</p>
              {pinned.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  selected={selected?.id === note.id}
                  onClick={() => handleSelect(note)}
                />
              ))}
            </>
          )}

          {/* All notes */}
          {unpinned.length > 0 && (
            <>
              {pinned.length > 0 && (
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-4 py-2 mt-2">All Notes</p>
              )}
              {unpinned.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  selected={selected?.id === note.id}
                  onClick={() => handleSelect(note)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {(selected || isNew) ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="Note title..."
                className="bg-transparent text-lg font-semibold text-zinc-100 outline-none flex-1 placeholder-zinc-700"
              />
              <div className="flex items-center gap-2">
                {selected && (
                  <button
                    onClick={() => togglePin(selected.id, selected.pinned)}
                    className={`p-1.5 rounded-md transition-all duration-200 ${
                      selected.pinned
                        ? "text-violet-400 bg-violet-500/10"
                        : "text-zinc-600 hover:text-zinc-400"
                    }`}
                    title="Pin note"
                  >
                    📌
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className={`text-xs px-3 py-1.5 rounded-md transition-all duration-200 font-medium ${
                    saved
                      ? "bg-green-600/20 text-green-400 border border-green-500/20"
                      : "bg-violet-600 hover:bg-violet-500 text-white"
                  }`}
                >
                  {saved ? "Saved ✓" : "Save"}
                </button>
                {selected && (
                  <button
                    onClick={handleDelete}
                    className="text-xs text-zinc-600 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-red-500/10"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write anything... game strats, seeds, quest notes, coords..."
              className="flex-1 bg-transparent text-zinc-300 text-sm p-6 outline-none resize-none placeholder-zinc-700 leading-relaxed"
            />
            <div className="px-6 py-2 border-t border-zinc-800/50 flex items-center justify-between">
              <p className="text-xs text-zinc-700">
                {content.length} characters
              </p>
              {selected && (
                <p className="text-xs text-zinc-700">
                  Last edited {new Date(selected.updated_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-zinc-600 text-sm">Select a note or create a new one</p>
            <button
              onClick={handleNew}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              + New note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteItem({ note, selected, onClick }: { note: Note; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 mb-0.5 ${
        selected
          ? "bg-violet-500/10 border border-violet-500/20"
          : "hover:bg-zinc-800/50 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {note.pinned && <span className="text-violet-400 text-[10px]">📌</span>}
        <p className={`text-sm font-medium truncate ${selected ? "text-violet-200" : "text-zinc-300"}`}>
          {note.title || "Untitled"}
        </p>
      </div>
      <p className="text-xs text-zinc-600 truncate mt-0.5">{note.content || "No content"}</p>
    </div>
  );
}