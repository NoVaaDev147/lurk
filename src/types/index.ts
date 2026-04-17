export interface Note {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
  game_tag: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  text: string;
  completed: boolean;
  game_tag: string | null;
  created_at: string;
}

export interface Session {
  id: number;
  game: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface Settings {
  overlay_hotkey: string;
  overlay_opacity: number;
  current_game: string | null;
  theme: string;
}