use rusqlite::Connection;
use std::{fs, path::PathBuf};

const MIGRATIONS: &[&str] = &[
    "
    CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        due_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT 'Untitled',
        body TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
        label TEXT,
        game_name TEXT,
        source TEXT NOT NULL CHECK (source IN ('manual', 'auto')),
        started_at TEXT NOT NULL,
        ended_at TEXT
    );

    CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );

    INSERT INTO settings (key, value) VALUES
        ('theme', 'dark'),
        ('hotkey', 'F9'),
        ('launch_on_startup', 'false');
    ",
];

pub fn open(path: PathBuf) -> rusqlite::Result<Connection> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).ok();
    }
    let mut conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&mut conn)?;
    Ok(conn)
}

fn migrate(conn: &mut Connection) -> rusqlite::Result<()> {
    let current: i64 = conn.pragma_query_value(None, "user_version", |r| r.get(0))?;
    for (i, sql) in MIGRATIONS.iter().enumerate().skip(current as usize) {
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.pragma_update(None, "user_version", (i + 1) as i64)?;
        tx.commit()?;
    }
    Ok(())
}