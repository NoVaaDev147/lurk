use rusqlite::OptionalExtension;
use tauri::{AppHandle, Emitter, State};

use crate::AppState;

#[tauri::command]
pub fn get_setting(state: State<AppState>, key: String) -> Result<Option<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        [key.as_str()],
        |r| r.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(
    app: AppHandle,
    state: State<AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (&key, &value),
        )
        .map_err(|e| e.to_string())?;
    }
    let _ = app.emit("settings-changed", ());
    Ok(())
}