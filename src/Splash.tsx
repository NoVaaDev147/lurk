import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";

export default function Splash() {
    const [version, setVersion] = useState("");

    useEffect(() => {
        getVersion()
            .then(setVersion)
            .catch(() => {});
    }, []);

    return (
        <div className="splash">
          <div className="splash-card">
            <div className="splash-logo">Lurk</div>
            <div className="splash-sub">Tasks. Notes. Sessions. All in one.</div>
            <div className="splash-bar">
              <span />
            </div>
              {version && <div className="splash-ver">v{version}</div>}
          </div>
        </div>
    );
}