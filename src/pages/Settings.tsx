import { useEffect, useState } from "react";
import { getDb } from "../store/db";
import { Settings as SettingsType } from "../types";
import { invoke } from "@tauri-apps/api/core";

const VERSION = "0.1.5";

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType>({
    overlay_hotkey: "F9",
    overlay_opacity: 0.9,
    current_game: null,
    theme: "dark",
  });
  const [saved, setSaved] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "up-to-date">("idle");

  useEffect(() => {
    async function loadSettings() {
      const db = await getDb();
      const rows = await db.select<SettingsType[]>("SELECT * FROM settings WHERE id = 1");
      if (rows.length > 0) setSettings(rows[0]);
    }
    loadSettings();
  }, []);

  async function handleSave() {
    const db = await getDb();
    await db.execute(
      `UPDATE settings SET overlay_hotkey = ?, current_game = ? WHERE id = 1`,
      [settings.overlay_hotkey, settings.current_game]
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleCheckUpdates() {
  setUpdateStatus("checking");
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    console.log("update check result:", update);
    if (update?.available) {
      setUpdateStatus("idle");
      const confirm = window.confirm(`Update ${update.version} available!\n\n${update.body}\n\nInstall now?`);
      if (confirm) {
        await update.downloadAndInstall();
      }
    } else {
      console.log("no update available, current version is latest");
      setUpdateStatus("up-to-date");
      setTimeout(() => setUpdateStatus("idle"), 3000);
    }
  } catch (e) {
    console.error("update check error:", e);
    alert("Update check failed: " + JSON.stringify(e));
    setUpdateStatus("idle");
  }
}

  useEffect(() => {
  async function detectGame() {
    try {
      const detected = await invoke<string | null>("detect_game");
      if (detected) {
        setSettings((prev) => ({ ...prev, current_game: detected }));
      }
    } catch (e) {
      console.error("detection error:", e);
    }
  }

  detectGame();
  const interval = setInterval(detectGame, 10000);
  return () => clearInterval(interval);
}, []);

  return (
    <div className="flex flex-col h-full p-6 max-w-xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-600 text-xs mt-0.5">Configure Lurk to your liking</p>
      </div>

      <div className="space-y-4">
        {/* Overlay hotkey */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5">
          <p className="text-sm font-medium text-zinc-200 mb-0.5">Overlay Hotkey</p>
          <p className="text-xs text-zinc-600 mb-3">Key to toggle the overlay while in-game</p>
          <input
            value={settings.overlay_hotkey}
            onChange={(e) => setSettings({ ...settings, overlay_hotkey: e.target.value })}
            className="bg-zinc-800 text-zinc-100 text-sm px-4 py-2.5 rounded-xl outline-none border border-zinc-700/50 focus:border-violet-500/50 transition-all duration-200 w-32 font-mono"
          />
        </div>

        {/* Current game */}
<div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5">
  <div className="flex items-center justify-between mb-0.5">
    <p className="text-sm font-medium text-zinc-200">Current Game</p>
    {settings.current_game && (
      <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
        auto-detected
      </span>
    )}
  </div>
  <p className="text-xs text-zinc-600 mb-3">Detected automatically or set manually</p>
  <input
    value={settings.current_game ?? ""}
    onChange={(e) => setSettings({ ...settings, current_game: e.target.value || null })}
    placeholder="No game detected..."
    className="w-full bg-zinc-800 text-zinc-100 text-sm px-4 py-2.5 rounded-xl outline-none placeholder-zinc-700 border border-zinc-700/50 focus:border-violet-500/50 transition-all duration-200"
  />
</div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className={`w-full text-sm py-3 rounded-xl transition-all duration-200 font-medium ${
            saved
              ? "bg-green-600/20 text-green-400 border border-green-500/20"
              : "bg-violet-600 hover:bg-violet-500 text-white hover:scale-[1.01]"
          }`}
        >
          {saved ? "Saved ✓" : "Save Settings"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-zinc-800/50" />
          <p className="text-xs text-zinc-700 uppercase tracking-widest">About</p>
          <div className="flex-1 h-px bg-zinc-800/50" />
        </div>

        {/* App info + update */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">Lurk</p>
              <p className="text-xs text-zinc-600 mt-0.5">Version {VERSION}</p>
            </div>
            <button
              onClick={handleCheckUpdates}
              className={`text-xs px-3 py-2 rounded-lg border transition-all duration-200 ${
                updateStatus === "up-to-date"
                  ? "text-green-400 border-green-500/20 bg-green-500/10"
                  : updateStatus === "checking"
                  ? "text-zinc-500 border-zinc-700 cursor-wait"
                  : "text-zinc-400 border-zinc-700 hover:border-violet-500/50 hover:text-violet-400"
              }`}
            >
              {updateStatus === "checking"
                ? "Checking..."
                : updateStatus === "up-to-date"
                ? "Up to date ✓"
                : "Check for updates"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}