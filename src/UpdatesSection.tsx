import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Download, RefreshCw } from "lucide-react";
import { getSetting, setSetting } from "./api";
import { useUpdates } from "./updates";

export default function UpdatesSection() {
    const {available, checkNow, startUpdate} = useUpdates();
    const [version, setVersion] = useState("");
    const [auto, setAuto] = useState(true);
    const [state, setState] = useState<"idle" | "checking" | "uptodate" | "error">("idle");
    const [error, setError] = useState("");

    useEffect(() => {
      getVersion()
        .then(setVersion)
        .catch(() => {});
      getSetting("auto_update_check")
        .then((v) => setAuto(v !== "false"))
        .catch(() => {});
    }, []);

    async function check() {
      setState("checking");
      setError("");
      try {
        const info = await checkNow();
        setState(info ? "idle" : "uptodate");
      } catch (e) {
        setError(String(e));
        setState("error");
      }
    }

    function toggleAuto(v: boolean) {
      setAuto(v);
      setSetting("auto_update_check", String(v))
    }

    const status = available
      ? `Version ${available.version} is available`
      : state === "checking"
        ? "Checking for updates..."
        : state === "uptodate"
          ? "You're up to date"
          : state === "error"
            ? "Couldn't check for updates"
            : "Check whether a newer version is out"

    return (
      <section className="settings-section">
        <h3 className="section-title">Updates</h3>

        <div className="setting-row">
          <div>
            <div className="setting-name">Lurk {version && `v${version}`}</div>
            <div className="setting-desc">{status}</div>
          </div>
          {available ? (
            <button className="btn primary" onClick={startUpdate}>
              <Download size={16} /> Update
            </button>
          ) : (
            <button className="btn" onClick={check} disabled={state === "checking"}>
              <RefreshCw size={16} /> Check for updates
            </button>
          )}
        </div>
        {state === "error" && (
          <div
            className="setting-desc"
            style={{color: "var(--danger)", marginTop: -8, marginBottom: 12}}
          >
            {error}
          </div>
        )}

        <div className="setting-row">
          <div>
            <div className="setting-name">Check automatically</div>
            <div className="setting-desc">
              Look for updates when Lurk starts, then every few hours.
            </div>
          </div>
          <button
            className={`switch ${auto ? "on" : ""}`}
            role="switch"
            aria-checked={auto}
            onClick={() => toggleAuto(!auto)}
          >
            <span />
          </button>
        </div>
      </section>
    );
}