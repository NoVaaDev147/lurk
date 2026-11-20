import { useEffect, useState} from "react";
import { listen } from "@tauri-apps/api/event";
import { ListChecks, NotebookPen, Timer, X } from "lucide-react";
import Tasks from "./Tasks";
import Notes from "./Notes";
import Sessions from "./Sessions";
import { Toaster } from "./toast";
import { useTheme } from "./theme";
import { getCurrentWindow } from "@tauri-apps/api/window";

type Tab = "tasks" | "notes" | "session"

export default function Widget() {
    const [tab, setTab] = useState<Tab>("tasks");
    const [epoch, setEpoch] = useState(0);
    useTheme(epoch);

    useEffect(() => {
        const unlisten = listen("widget-shown", () => setEpoch((e) => e + 1));
        return () => {
            unlisten.then((f) => f());
        };
    }, []);

    return (
        <div className="widget">
          <header className="widget-bar" data-tauri-drag-region>
            <span className="widget-title">
              Lurk
            </span>
            <div className="widget-tabs">
              <button
                className={`tab ${tab === "tasks" ? "active" : ""}`}
                onClick={() => setTab("tasks")}
                title="Tasks"
              >
                <ListChecks size={16} />
              </button>
              <button
                className={`tab ${tab === "notes" ? "active" : ""}`}
                onClick={() => setTab("notes")}
                title="Notes"
              >
                <NotebookPen size={16} />
              </button>
              <button
                className={`tab ${tab === "session" ? "active" : ""}`}
                onClick={() => setTab("session")}
                title="Session"
              >
                <Timer size={16} />
              </button>
            </div>
            <div className="drag-fill" data-tauri-drag-region />
            <button className="btn icon" onClick={() => getCurrentWindow().hide()} title="Hide">
              <X size={16} />
            </button>
          </header>

          <div className="widget-body">
            {tab === "tasks" && <Tasks key={epoch} />}
            {tab === "notes" && <Notes key={epoch} />}
            {tab === "session" && <Sessions key={epoch} />}
          </div>
          <Toaster />
        </div>
    );
} 