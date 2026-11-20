use rusqlite::Connection;
use serde::Serialize;
use tauri::State;

use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    id: i64,
    title: String,
    body: String,
    updated_at: String,
}

fn row_to_note(r: &rusqlite::Row) -> rusqlite::Result<Note> {
    Ok(Note {
        id: r.get(0)?,
        title: r.get(1)?,
        body: r.get(2)?,
        updated_at: r.get(3)?,
    })
}

const SELECT: &str = "SELECT id, title, body, updated_at FROM notes";

fn get_note(conn: &Connection, id: i64) -> Result<Note, String> {
    conn.query_row(&format!("{SELECT} WHERE id = ?1"), [id], row_to_note)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_notes(state: State<AppState>) -> Result<Vec<Note>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!("{SELECT} ORDER BY updated_at DESC, id DESC"))
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], row_to_note).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_note(state: State<AppState>) -> Result<Note, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO notes DEFAULT VALUES", [])
        .map_err(|e| e.to_string())?;
    get_note(&conn, conn.last_insert_rowid())
}

#[tauri::command]
pub fn update_note(
    state: State<AppState>,
    id: i64,
    title: String,
    body: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE notes SET title = ?1, body = ?2, updated_at = datetime('now') WHERE id = ?3",
        (&title, &body, id),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_note(state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM notes WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}