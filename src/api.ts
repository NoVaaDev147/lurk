import { invoke } from "@tauri-apps/api/core";

export interface Task {
    id: number;
    title: string;
    completed: boolean;
    dueDate: string | null;
    createdAt: string;
}

export const listTasks = () => invoke<Task[]>("list_tasks");

export const addTask = (title: string, dueDate: string | null) =>
    invoke<Task>("add_task", {title, dueDate});

export const updateTask = (id: number, title: string, dueDate: string | null) =>
    invoke<Task>("update_task", {id, title, dueDate});

export const setTaskCompleted = (id: number, completed: boolean) =>
    invoke<Task>("set_task_completed", {id, completed});

export const deleteTask = (id: number) => invoke<void>("delete_task", {id});

export interface Note {
    id: number;
    title: string;
    body: string;
    updatedAt: string;
}

export const listNotes = () => invoke<Note[]>("list_notes");
export const createNote = () => invoke<Note>("create_note");
export const updateNote = (id: number, title: string, body: string) =>
    invoke<void>("update_note", {id, title, body});
export const deleteNote = (id: number) => invoke<void>("delete_note", {id});

export const getSetting = (key: string) => invoke<string | null>("get_setting", {key});
export const setSetting = (key: string, value: string) =>
    invoke<void>("set_setting", {key, value});

export interface Session {
    id: number;
    taskId: number | null;
    taskTitle: string | null;
    label: string | null;
    gameName: string | null;
    source: "manual" | "auto";
    startedAt: string;
    endedAt: string | null;
    durationSecs: number | null;
}

export const getActiveSession = () => invoke<Session | null>("get_active_session");
export const listSessions = () => invoke<Session[]>("list_sessions");
export const startSession = (label: string | null, taskId: number | null, isGame: boolean) =>
    invoke<Session>("start_session", {label, taskId, isGame});
export const stopSession = () => invoke<Session>("stop_session");
export const deleteSession = (id: number) => invoke<void>("delete_session", {id});

export const getAutostart = () => invoke<boolean>("get_autostart");
export const setAutostart = (enabled: boolean) => invoke<void>("set_autostart", {enabled});
export const setHotkey = (accelerator: string) => invoke<void>("set_hotkey", {accelerator});

export interface UpdateInfo {
    version: string;
    currentVersion: string;
    notes: string | null;
    date: string | null;
}

export const checkForUpdate = () => invoke<UpdateInfo | null>("check_for_update");
export const getPendingUpdate = () => invoke<UpdateInfo | null>("get_pending_update");
export const installUpdate = () => invoke<void>("install_update");