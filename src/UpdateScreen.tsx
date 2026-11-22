import { AlertTriangle, Download } from "lucide-react";
import { useUpdates } from "./updates";

const mb = (n: number) => (n / 1024 / 1024).toFixed(1);

export default function UpdateScreen() {
    const {available, screenOpen, phase, progress, error, startUpdate, closeScreen} = useUpdates();
    if (!screenOpen || !available) return null;

    const pct = progress.total
        ? Math.min(100, Math.round((progress.downloaded/progress.total) * 100))
        : null;
    const indeterminate = phase === "installing" || pct === null;

    return (
      <div className="update-overlay">
        <div className="update-card">
          <div className="update-icon">
            {phase === "error" ? <AlertTriangle size={26} /> : <Download size={26} />}
          </div>

          <h2>
            {phase === "error"
              ? "Update failed"
              : phase === "installing"
                ? "Installing update..."
                : "Updating Lurk"}
          </h2>
          <div className="update-versions">
            v{available.currentVersion} ➔ v{available.version}
          </div>

          {phase === "error" ? (
            <>
              <div className="update-error">{error}</div>
              <div className="update-actions">
                <button className="btn" onClick={closeScreen}>
                  Close
                </button>
                <button className="btn primary" onClick={startUpdate}>
                  Try again
                </button>
              </div>
            </>
        ) : (
          <>
            <div className={`update-bar ${indeterminate ? "indeterminate" : ""}`}>
              <span style={!indeterminate ? {width: `${pct}%`} : undefined} />
            </div>
            <div className="update-status">
              {phase === "installing"
                ? "Almost done. Lurk will restart on its own."
                : pct !== null
                  ? `Downloading... ${pct}% (${mb(progress.downloaded)} / ${mb(progress.total!)} MB)`
                  : "Downloading..."}
            </div>

            {available.notes && (
              <div className="update-notes">
                <div className="update-notes-title">What's new</div>
                <div className="update-notes-body">{available.notes}</div>
              </div>
            )}

            <div className="update-foot">
              A running session, if you have one, keeps going through the restart.
            </div>
          </>
        )}
      </div>
    </div>
  );
}