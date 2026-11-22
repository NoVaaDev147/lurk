import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, Copy, X, Download } from "lucide-react";
import { useUpdates } from "./updates";

export default function TitleBar() {
    const win = getCurrentWindow();
    const [maximized, setMaximized] = useState(false);
    const {available, startUpdate} = useUpdates();

    useEffect(() => {
        const sync = () =>
            win
                .isMaximized()
                .then(setMaximized)
                .catch(() => {});
        sync();
        const unlisten = win.onResized(sync);
        return () => {
            unlisten.then((f) => f());
        };
    }, []);

    return (
        <div className="titlebar" data-tauri-drag-region>
          <span className="titlebar-title" data-tauri-drag-region>
            Lurk
          </span>

          {available && (
            <button
              className="update-pill"
              onClick={startUpdate}
              title={`Version ${available.version} is available`}
            >
              <Download size={12} /> Update client
            </button>
          )}

          <div className="window-controls">
            <button onClick={() => win.minimize()} title="Minimize">
              <Minus size={14} />
            </button>
            <button
              onClick={() => win.toggleMaximize()}
              title={maximized ? "Restore" : "Maximize"}
            >
              {maximized ? <Copy size={12} /> : <Square size={12} />}
            </button>
            <button className="close" onClick={() => win.close()} title="Close">
              <X size={14} />
            </button>
          </div>
        </div>
    );
}