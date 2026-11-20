import { useEffect } from "react";

interface Props {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "Confirm",
    destructive,
    onConfirm,
    onCancel,
}: Props) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onCancel]);

    if (!open) return null;

    return (
      <div className="modal-overlay" onMouseDown={onCancel}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h3>{title}</h3>
          <p>{message}</p>
          <div className="modal-actions">
            <button className="btn" onClick={onCancel} autoFocus>
              Cancel
            </button>
            <button
              className={`btn ${destructive ? "destructive" : "primary"}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
}