import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { listen } from "@tauri-apps/api/event";
import { type UpdateInfo, checkForUpdate, getPendingUpdate, installUpdate } from "./api";

type Phase = "idle" | "downloading" | "installing" | "error";
interface Progress {
    downloaded: number;
    total: number | null;
}

interface UpdatesContext {
    available: UpdateInfo | null;
    screenOpen: boolean;
    phase: Phase;
    progress: Progress;
    error: string;
    checkNow: () => Promise<UpdateInfo | null>;
    startUpdate: () => void;
    closeScreen: () => void;
}

const Ctx = createContext<UpdatesContext | null>(null);

export function useUpdates() {
    const c = useContext(Ctx);
    if (!c) throw new Error("useUpdates must be used inside <UpdatesProvider>");
    return c;
}

export function UpdatesProvider({children}: {children: ReactNode}) {
    const [available, setAvailable] = useState<UpdateInfo | null>(null);
    const [screenOpen, setScreenOpen] = useState(false);
    const [phase, setPhase] = useState<Phase>("idle");
    const [progress, setProgress] = useState<Progress>({downloaded: 0, total: null});
    const [error, setError] = useState("");

    useEffect(() => {
        getPendingUpdate()
            .then(setAvailable)
            .catch(() => {});

        const subs = [
            listen<UpdateInfo>("update-available", (e) => setAvailable(e.payload)),
            listen<Progress>("update-progress", (e) => setProgress(e.payload)),
            listen("update-installing", () => setPhase("installing")),
        ];
        return () => {
            subs.forEach((s) => s.then((f) => f()));
        };
    }, []);

    const checkNow = useCallback(async () => {
        const info = await checkForUpdate();
        setAvailable(info);
        return info;
    }, []);

    const startUpdate = useCallback(() => {
        setError("");
        setProgress({downloaded: 0, total: null});
        setPhase("downloading");
        setScreenOpen(true);
        installUpdate().catch((e) => {
            setError(String(e));
            setPhase("error");
        });
    }, []);

    const closeScreen = useCallback(() => {
        setScreenOpen(false);
        setPhase("idle");
    }, []);

    return (
        <Ctx.Provider
          value={{available, screenOpen, phase, progress, error, checkNow, startUpdate, closeScreen}}
        >
          {children}
        </Ctx.Provider>
    );
}