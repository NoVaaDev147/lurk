import { useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ListChecks, NotebookPen, Timer, Settings as SettingsIcon } from "lucide-react";
import Tasks from "./Tasks";
import Notes from "./Notes"
import Sessions from "./Sessions";
import Settings from "./Settings";
import TitleBar from "./TitleBar";
import { Toaster } from "./toast";
import { useTheme } from "./theme";

type Page = "tasks" | "notes" | "sessions" | "settings";

const MIN_SPLASH_MS = 1500

export default function App() {
  const [page, setPage] = useState<Page>("tasks");
  useTheme();

  useEffect(() => {
    const wait = Math.max(0, MIN_SPLASH_MS - performance.now())
    const t = setTimeout(() => {
      invoke("app_ready").catch(console.error);
    }, wait);
    return () => clearTimeout(t);
  }, []);

  const nav = (p: Page, icon: ReactNode, text: string) => (
    <button className={`nav-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>
      {icon} {text}
    </button>
  );

  return (
    <div className="shell">
      <TitleBar />
      <div className="app">
        <aside className="sidebar">
          <div className="brand">Lurk</div>

          {nav("tasks", <ListChecks size={18} />, "Tasks")}
          {nav("notes", <NotebookPen size={18} />, "Notes")}
          {nav("sessions", <Timer size={18} />, "Sessions")}

          <div className="spacer" />

          {nav("settings", <SettingsIcon size={18} />, "Settings")}
        </aside>

        <main className="content">
          <div className="page" key={page}>
            {page === "tasks" && <Tasks />}
            {page === "notes" && <Notes />}
            {page === "sessions" && <Sessions />}
            {page === "settings" && <Settings />}
          </div>
        </main>
        
        <Toaster />
      </div>
    </div>
  );
}