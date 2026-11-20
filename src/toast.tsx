import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Check, Gamepad2, Info } from "lucide-react";

type Kind = "info" | "success" | "game" | "error"
interface ToastItem {
    id: number;
    kind: Kind;
    text: String;
}

let counter = 0;

export function toast(text: string, kind: Kind = "info") {
    window.dispatchEvent(new CustomEvent("lurk-toast", {detail: {text, kind}}));
}

export function Toaster() {
    const [items, setItems] = useState<ToastItem[]>([]);

    useEffect(() => {
        const push = (text: string, kind: Kind) => {
            const id = ++counter;
            setItems((prev) => [...prev.slice(-3), {id, kind, text}]);
            setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
        };

        const onToast = (e: Event) => {
            const d = (e as CustomEvent).detail;
            push(d.text, d.kind);
        };
        window.addEventListener("lurk-toast", onToast);

        const visible = () => document.visibilityState === "visible";
        const subs = [
            listen<string>("game-started", (e) => {
                if (visible()) push(`Tracking ${e.payload}`, "game");
            }),
            listen<string>("game-ended", (e) => {
                if (visible()) push(`${e.payload} session ended`, "game");
            }),
        ];

        return () => {
            window.removeEventListener("lurk-toast", onToast);
            subs.forEach((s) => s.then((f) => f()));
        };
    }, []);

    return (
      <div className="toaster">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === "game" ? (
              <Gamepad2 size={16} />
            ) : t.kind === "success" ? (
              <Check size={16} />
            ) : (
              <Info size={16} />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    );
}