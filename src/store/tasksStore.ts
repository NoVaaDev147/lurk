import { create } from "zustand";
import { getDb } from "./db";
import { Task } from "../types";

interface TasksStore {
  tasks: Task[];
  loading: boolean;
  fetchTasks: () => Promise<void>;
  addTask: (text: string, game_tag?: string) => Promise<void>;
  toggleTask: (id: number, completed: boolean) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  clearCompleted: () => Promise<void>;
}

export const useTasksStore = create<TasksStore>((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async () => {
    set({ loading: true });
    const db = await getDb();
    const tasks = await db.select<Task[]>(
      "SELECT * FROM tasks ORDER BY completed ASC, created_at DESC"
    );
    set({ tasks, loading: false });
  },

  addTask: async (text, game_tag) => {
    const db = await getDb();
    await db.execute(
      "INSERT INTO tasks (text, game_tag) VALUES (?, ?)",
      [text, game_tag ?? null]
    );
    get().fetchTasks();
  },

  toggleTask: async (id, completed) => {
    const db = await getDb();
    await db.execute("UPDATE tasks SET completed = ? WHERE id = ?", [completed ? 0 : 1, id]);
    get().fetchTasks();
  },

  deleteTask: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM tasks WHERE id = ?", [id]);
    get().fetchTasks();
  },

  clearCompleted: async () => {
    const db = await getDb();
    await db.execute("DELETE FROM tasks WHERE completed = 1");
    get().fetchTasks();
  },
}));