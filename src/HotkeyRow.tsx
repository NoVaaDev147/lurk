import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getSetting, setHotkey } from "./api";

const RESERVED = new Set([
    "CTRL+A", "CTRL+C", "CTRL+V", "CTRL+X", "CTRL+Z", "CTRL+Y",
    "CTRL+S", "CTRL+F", "CTRL+W", "ALT+F4",
]);

function toAccelerator(e: KeyboardEvent): {combo?: string, error?: string} | null {
    const mods: string[] = [];
    if (e.ctrlKey) mods.push("Ctrl");
    if (e.altKey) mods.push("Alt");
    if (e.shiftKey) mods.push("Shift");

    let key: string | null = null;
    if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
    else if (/^Digit[0-9]$/.test(e.code)) key = e.code.slice(5);
    else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(e.code)) key = e.code;
    else if (e.code === "Space") key = "Space";

    if (!key) return null;

    const isFKey = /^F\d+$/.test(key);
    if (mods.length === 0 && !isFKey) {
        return {error: "Add Ctrl, Alt, Or Shift, or use an F-key on its own."};
    }
    const combo = [...mods, key].join("+");
    if (RESERVED.has(combo)) return {error: `${combo} is reserved by Windows apps. Pick another.`};
    return {combo};
}

export default function HotkeyRow() {
    const [current, setCurrent] = useState("F9");
    const [listening, setListening] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(() => {
        getSetting("hotkey")
            .then((v) => {
                if (v) setCurrent(v);
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        load();
        const unlisten = listen("settings-changed", load);
        return () => {
            unlisten.then((f) => f());
        };
    }, [load]);

    useEffect(() => {
        if (!listening) return;
        const onKey = async (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.code === "Escape") {
                setListening(false);
                return;
            }
            const result = toAccelerator(e);
            if (!result) return;
            if (result.error) {
                setError(result.error);
                return;
            }
            setListening(false);
            try {
                await setHotkey(result.combo!);
                setError("");
            } catch (err) {
                setError(String(err));
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [listening]);

    return (
      <>
        <div className="setting-row">
          <div>
            <div className="setting-name">Widget hotkey</div>
            <div className="setting-desc">Shows or hides the pop-out widget from anywhere</div>
          </div>
          <div className="row">
            <span className="chip key">{listening ? "Press a combo..." : current}</span>
            <button
              className="btn"
              onClick={() => {
                setError("");
                setListening((l) => !l);
              }}
            >
              {listening ? "Cancel" : "Change"}
            </button>
          </div>
        </div>
        {error && (
            <div className="setting-desc" style={{color: "var(--danger)", marginTop: -8, marginBottom: 12}}>
              {error}
          </div>
        )}
      </>
    )
}