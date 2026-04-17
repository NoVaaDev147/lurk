import { create } from "zustand";
import { getDb } from "./db";
import { Note } from "../types";

interface NotesStore {
  notes: Note[];
  loading: boolean;
  fetchNotes: () => Promise<void>;
  addNote: (title: string, content: string, game_tag?: string) => Promise<void>;
  updateNote: (id: number, title: string, content: string) => Promise<void>;
  togglePin: (id: number, pinned: boolean) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: [],
  loading: false,

  fetchNotes: async () => {
    set({ loading: true });
    const db = await getDb();
    const notes = await db.select<Note[]>("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC");
    set({ notes, loading: false });
  },

  addNote: async (title, content, game_tag) => {
    const db = await getDb();
    await db.execute(
      "INSERT INTO notes (title, content, game_tag) VALUES (?, ?, ?)",
      [title, content, game_tag ?? null]
    );
    get().fetchNotes();
  },

  updateNote: async (id, title, content) => {
    const db = await getDb();
    await db.execute(
      "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?",
      [title, content, id]
    );
    get().fetchNotes();
  },

  togglePin: async (id, pinned) => {
    const db = await getDb();
    await db.execute("UPDATE notes SET pinned = ? WHERE id = ?", [pinned ? 0 : 1, id]);
    get().fetchNotes();
  },

  deleteNote: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM notes WHERE id = ?", [id]);
    get().fetchNotes();
  },
}));