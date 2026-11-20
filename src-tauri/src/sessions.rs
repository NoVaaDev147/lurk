use rusqlite::{Connection, OptionalExtension};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    id: i64,
    task_id: Option<i64>,
    task_title: Option<String>,
    label: Option<String>,
    game_name: Option<String>,
    source: String,
    started_at: String,
    ended_at: Option<String>,
    duration_secs: Option<i64>,
}

const NOW: &str = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

const SELECT: &str = "
    SELECT s.id, s.task_id, t.title, s.label, s.game_name, s.source,
           s.started_at, s.ended_at,
           CASE WHEN s.ended_at IS NULL THEN NULL
                ELSE CAST(ROUND((julianday(s.ended_at) - julianday(s.started_at)) * 86400) AS INTEGER)
            END
    FROM sessions s
    LEFT JOIN tasks t ON t.id = s.task_id";

fn row_to_session(r: &rusqlite::Row) -> rusqlite::Result<Session> {
    Ok(Session {
        id: r.get(0)?,
        task_id: r.get(1)?,
        task_title: r.get(2)?,
        label: r.get(3)?,
        game_name: r.get(4)?,
        source: r.get(5)?,
        started_at: r.get(6)?,
        ended_at: r.get(7)?,
        duration_secs: r.get(8)?,
    })
}

fn get_session(conn: &Connection, id: i64) -> Result<Session, String> {
    conn.query_row(&format!("{SELECT} WHERE s.id = ?1"), [id], row_to_session)
        .map_err(|e| e.to_string())
}

fn current(conn: &Connection) -> Result<Option<Session>, String> {
    conn.query_row(
        &format!("{SELECT} WHERE s.ended_at IS NULL ORDER BY s.id DESC LIMIT 1"),
        [],
        row_to_session,
    )
    .optional()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_active_session(state: State<AppState>) -> Result<Option<Session>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    current(&conn)
}

#[tauri::command]
pub fn list_sessions(state: State<AppState>) -> Result<Vec<Session>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!(
            "{SELECT} WHERE s.ended_at IS NOT NULL ORDER BY s.started_at DESC LIMIT 200"
        ))
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_session)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn start_session(
    app: AppHandle,
    state: State<AppState>,
    label: Option<String>,
    task_id: Option<i64>,
    is_game: bool,
) -> Result<Session, String> {
    let text = label.map(|l| l.trim().to_string()).filter(|l| !l.is_empty());

    let (label, game_name) = if is_game {
        if text.is_none() {
            return Err("Enter the game's name".into());
        }
        (None, text)
    } else {
        (text, None)
    };

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    if current(&conn)?.is_some() {
        return Err("A session is already running".into());
    }

    conn.execute(
        &format!(
            "INSERT INTO sessions (task_id, label, game_name, source, started_at)
            VALUES (?1, ?2, ?3, 'manual', {NOW})"
        ),
        (&task_id, &label, &game_name),
    )
    .map_err(|e| e.to_string())?;

    let session = get_session(&conn, conn.last_insert_rowid())?;
    let _ = app.emit("sessions-changed", ());
    Ok(session)
}

#[tauri::command]
pub fn stop_session(app: AppHandle, state: State<AppState>) -> Result<Session, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = current(&conn)?.ok_or("No session is running")?.id;

    conn.execute(
        &format!("UPDATE sessions SET ended_at = {NOW} WHERE id = ?1"),
        [id],
    )
    .map_err(|e| e.to_string())?;

    let session = get_session(&conn, id)?;
    let _ = app.emit("sessions-changed", ());
    Ok(session)
}

#[tauri::command]
pub fn delete_session(app: AppHandle, state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM sessions WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    let _ = app.emit("sessions-changed", ());
    Ok(())
}