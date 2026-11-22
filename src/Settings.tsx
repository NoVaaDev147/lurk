import { useEffect, useState } from "react";
import { Moon, Sun, Check } from "lucide-react";
import { PALETTES, useTheme } from "./theme";
import { getAutostart, setAutostart, getSetting, setSetting } from "./api";
import HotkeyRow from "./HotkeyRow";
import UpdatesSection from "./UpdatesSection";

function Switch({on, onChange}: {on: boolean; onChange: (v: boolean) => void}) {
  return (
    <button
      className={`switch ${on ? "on" : ""}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    >
      <span />
    </button>
  );
}

export default function Settings() {
    const {mode, palette, setMode, setPalette} = useTheme();
    const [autostart, setAutostartOn] = useState(false);
    const [closeToTray, setCloseToTray] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      getAutostart().then(setAutostartOn).catch(console.error);
      getSetting("close_to_tray")
        .then((v) => setCloseToTray(v !== "false"))
        .catch(console.error);
    }, []);

    async function toggleAutoStart(v: boolean) {
      setAutostartOn(v);
      setError("");
      try {
        await setAutostart(v);
      } catch (e) {
        setAutostartOn(!v);
        setError("Couldn't change launch on startup: " + String(e));
      }
    }

    async function toggleCloseToTray(v: boolean) {
      setCloseToTray(v);
      setError("");
      try {
        await setSetting("close_to_tray", String(v));
      } catch (e) {
        setCloseToTray(!v);
        setError("Couldn't save that setting: " + String(e));
      }
    }

    return (
        <div>
          <h2>Settings</h2>

          <section className="settings-section">
            <h3 className="section-title">Appearance</h3>

            <div className="setting-row">
              <div>
                <div className="setting-name">Launch on startup</div>
                <div className="setting-desc">Start Lurk when you sign in to Windows</div>
              </div>
              <Switch on={autostart} onChange={toggleAutoStart} />
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-name">Keep running in the tray</div>
                <div className="setting-desc">
                  Closing the window hides Lurk instead of quitting, so game detection keeps working
                </div>
              </div>
              <Switch on={closeToTray} onChange={toggleCloseToTray} />
            </div>

            <HotkeyRow />

            {error && <div className="setting-desc" style={{color: "var(--danger)"}}>{error}</div>}
          </section>

          <UpdatesSection />

          <section className="settings-section">
            <h3 className="section-title">Appearance</h3>

            <div className="setting-row">
              <div>
                <div className="setting-name">Mode</div>
                <div className="setting-desc">Light or dark interface</div>
              </div>
              <div className="segmented">
                <button className={mode === "dark" ? "active" : ""} onClick={() => setMode("dark")}>
                  <Moon size={14} /> Dark
                </button>
                <button className={mode === "light" ? "active" : ""} onClick={() => setMode("light")}>
                  <Sun size={14} /> Light
                </button>
              </div>
            </div>

            <div className="setting-name">Theme</div>
            <div className="setting-desc">Pick a color palette</div>
            <div className="palette-grid">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  className={`palette-card ${palette === p.id ? "active" : ""}`}
                  style={{background: p.bg}}
                  onClick={() => setPalette(p.id)}
                >
                  <div className="swatches">
                    {p.colors.map((c) => (
                      <span key={c} style={{background: c}} />
                    ))}
                  </div>
                  <div className="palette-name">{p.name}</div>
                  {palette === p.id && <Check size={14} className="palette-check" />}
                </button>
              ))}
            </div>
          </section>
        </div>
    );
}