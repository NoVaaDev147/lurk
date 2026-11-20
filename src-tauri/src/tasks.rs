use rusqlite::Connection;
use serde::Serialize;
use tauri::State;

use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    id: i64,
    title: String,
    completed: bool,
    due_date: Option<String>,
    created_at: String,
}

fn row_to_task(r: &rusqlite::Row) -> rusqlite::Result<Task> {
    Ok(Task {
        id: r.get(0)?,
        title: r.get(1)?,
        completed: r.get(2)?,
        due_date: r.get(3)?,
        created_at: r.get(4)?,
    })
}

const SELECT: &str = "SELECT id, title, completed, due_date, created_at FROM tasks";

fn get_task(conn: &Connection, id: i64) -> Result<Task, String> {
    conn.query_row(&format!("{SELECT} WHERE id = ?1"), [id], row_to_task)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_tasks(state: State<AppState>) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(&format!(
            "{SELECT} ORDER BY completed, due_date IS NULL, due_date, id DESC"
        ))
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_task)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_task(
    state: State<AppState>,
    title: String,
    due_date: Option<String>,
) -> Result<Task, String> {
    let title = title.trim().to_string();
    if title.is_empty() {
        return Err("Title can't be empty".into());
    }
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO tasks (title, due_date) VALUES (?1, ?2)",
        (&title, &due_date),
    )
    .map_err(|e| e.to_string())?;
    get_task(&conn, conn.last_insert_rowid())
}

#[tauri::command]
pub fn update_task(
    state: State<AppState>,
    id: i64,
    title: String,
    due_date: Option<String>,
) -> Result<Task, String> {
    let title = title.trim().to_string();
    if title.is_empty() {
        return Err("Title can't be empty".into());
    }
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE tasks SET title = ?1, due_date = ?2, updated_at = datetime('now') WHERE id = ?3",
        (&title, &due_date, id),
    )
    .map_err(|e| e.to_string())?;
    get_task(&conn, id)
}

#[tauri::command]
pub fn set_task_completed(
    state: State<AppState>,
    id: i64,
    completed: bool,
) -> Result<Task, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE tasks SET completed = ?1, updated_at = datetime('now') WHERE id = ?2",
        (completed, id),
    )
    .map_err(|e| e.to_string())?;
    get_task(&conn, id)
}

#[tauri::command]
pub fn delete_task(state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tasks WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}