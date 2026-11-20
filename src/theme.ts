import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getSetting, setSetting } from "./api";

export type Mode = "dark" | "light"

export interface Palette {
    id: string;
    name: string;
    colors: [string, string, string];
    bg: string;
}

export const PALETTES: Palette[] = [
    {id: "neon", name: "Neon", colors: ["#a855f7", "#22d3ee", "#4ade80"], bg: "#0d0d14"},
    {id: "ocean", name: "Ocean", colors: ["#3b82f6", "#22d3ee", "#2dd4bf"], bg: "#0a1118"},
    {id: "sunset", name: "Sunset", colors: ["#f97316", "#f43f5e", "#facc15"], bg: "#140c0e"},
    {id: "forest", name: "Forest", colors: ["#22c55e", "#84cc16", "#2dd4bf"], bg: "#0a130e"},
    {id: "rose", name: "Rose", colors: ["#ec4899", "#f472b6", "#c084fc"], bg: "#150b12"},
    {id: "graphite", name: "Graphite", colors: ["#d4d4d8", "#a1a1aa", "#86efac"], bg: "#0e0e10"},
]

const CACHE_KEY = "lurk-theme-cache"

function readCache(): {mode: Mode; palette: string} | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const {mode, palette} = JSON.parse(raw);
        if ((mode === "dark" || mode === "light") && PALETTES.some((p) => p.id === palette)) {
            return {mode, palette};
        }
    } catch {
        /*--ignore broken/missing cache--*/
    }
    return null;
}

function writeCache(mode: Mode, palette: string) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({mode, palette}));
    } catch {
        /*ignore*/
    }
}

export function applyCachedTheme() {
    const c = readCache();
    if (!c) return;
    document.documentElement.dataset.theme = c.mode;
    document.documentElement.dataset.palette = c.palette;
}

export function useTheme(refreshKey = 0) {
    const [mode, setModeState] = useState<Mode>(() => readCache()?.mode ?? "dark");
    const [palette, setPaletteState] = useState(() => readCache()?.palette ?? "neon");

    const load = useCallback(async () => {
        for (let attempt = 0; attempt < 6; attempt++) {
            try {
                const [m, p] = await Promise.all([getSetting("theme"), getSetting("palette")]);
                if (m === "dark" || m === "light") setModeState(m);
                if (p && PALETTES.some((x) => x.id === p)) setPaletteState(p);
                return;
            } catch {
                await new Promise((r) => setTimeout(r, 300));
            }
        }
    }, []);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    useEffect(() => {
        const unlisten = listen("settings-changed", () => load());
        return () => {
            unlisten.then((f) => f());
        };
    }, [load]);

    useEffect(() => {
        document.documentElement.dataset.theme = mode;
        document.documentElement.dataset.palette = palette;
        writeCache(mode, palette);
    }, [mode, palette]);

    const setMode = (m: Mode) => {
        setModeState(m);
        setSetting("theme", m);
    };
    const setPalette = (p: string) => {
        setPaletteState(p);
        setSetting("palette", p);
    };

    return {mode, palette, setMode, setPalette};
}