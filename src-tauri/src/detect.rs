use rusqlite::{Connection, OptionalExtension};
use std::{
    collections::HashSet, 
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread, 
    time::Duration,
};
use sysinfo::{ProcessesToUpdate, System};
use tauri::{AppHandle, Emitter, Manager};

use crate::{games, AppState};

const POLL: Duration = Duration::from_secs(5);
const MISSES_BEFORE_STOP: u32 = 2;
const LIST_REFRESH: Duration = Duration::from_secs(6 * 60 * 60);

const NOW: &str = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

struct Tracked {
    session_id: i64,
    name: String,
    exes: Vec<String>,
    misses: u32,
}

pub fn start(app: AppHandle) {
    let reload = Arc::new(AtomicBool::new(false));

    {
        let app = app.clone();
        let reload = reload.clone();
        thread::spawn(move || {
            let dir = match app.path().app_data_dir() {
                Ok(d) => d,
                Err(_) => return,
            };
            loop {
                match games::fetch_remote(&dir) {
                    Ok(n) => {
                        eprintln!("[games] updated list from GitHub: {n} games");
                        reload.store(true, Ordering::SeqCst);
                    }
                    Err(e) => eprintln!("[games] update skipped: {e}"),
                }
                thread::sleep(LIST_REFRESH);
            }
        });
    }

    thread::spawn(move || run(app, reload));
}

fn end_session(conn: &Connection, id: i64) {
    let _ = conn.execute(
        &format!("UPDATE sessions SET ended_at = {NOW} WHERE id = ?1"),
        [id],
    );
}

fn begin_auto(conn: &Connection, game: &str) -> Option<i64> {
    conn.execute(
        &format!(
            "INSERT INTO sessions (game_name, source, started_at) VALUES (?1, 'auto', {NOW})"
        ),
        [game],
    )
    .ok()?;
    Some(conn.last_insert_rowid())
}

fn run(app: AppHandle, reload: Arc<AtomicBool>) {
    let dir = match app.path().app_data_dir() {
        Ok(d) => d,
        Err(_) => return,
    };
    let mut games = games::load(&dir);
    eprintln!("[detect] started with {} games", games.len());

    let mut sys = System::new();
    let mut tracked: Option<Tracked> = None;
    let mut suppressed: HashSet<String> = HashSet::new();

    loop {
        if reload.swap(false, Ordering::SeqCst) {
            games = games::load(&dir);
            eprintln!("[detect] reloaded {} games", games.len());
        }

        sys.refresh_processes(ProcessesToUpdate::All, true);
        let running: HashSet<String> = sys
            .processes()
            .values()
            .map(|p| p.name().to_string_lossy().to_lowercase())
            .collect();

        suppressed.retain(|n| {
            games
                .iter()
                .find(|g| &g.name == n)
                .map_or(false, |g| g.exes.iter().any(|e| running.contains(e)))
        });

        let mut changed = false;
        let mut pending: Vec<(&'static str, String)> = Vec::new();

        {
            let state = app.state::<AppState>();
            if let Ok(conn) = state.db.lock() {
                let active: Option<(i64, String, Option<String>)> = conn
                    .query_row(
                        "SELECT id, source, game_name FROM sessions
                        WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1",
                        [],
                        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
                    )
                    .optional()
                    .unwrap_or(None);

                match active {
                    Some((id, source, name)) if source == "auto" => {
                        if tracked.as_ref().map(|t| t.session_id) != Some(id) {
                            let name = name.unwrap_or_default();
                            let exes = games
                                .iter()
                                .find(|g| g.name == name)
                                .map(|g| g.exes.clone())
                                .unwrap_or_default();
                            tracked = Some(Tracked {
                                session_id: id, 
                                name, 
                                exes, 
                                misses: 0
                            });
                        }
                        if let Some(t) = tracked.as_mut() {
                            if t.exes.iter().any(|e| running.contains(e)) {
                                t.misses = 0;
                            } else {
                                t.misses += 1;
                                if t.misses >= MISSES_BEFORE_STOP {
                                    pending.push(("game-ended", t.name.clone()));
                                    end_session(&conn, id);
                                    tracked = None;
                                    changed = true;
                                }
                            }
                        }
                    }

                    Some((id, _, name)) => {
                        tracked = None;
                        if let Some(n) = name {
                            if let Some(g) = games.iter().find(|g| {
                                g.name.eq_ignore_ascii_case(&n) 
                                    && g.exes.iter().any(|e| running.contains(e))
                            }) {
                                let _ = conn.execute(
                                    "UPDATE sessions SET source = 'auto', game_name = ?1 WHERE id = ?2",
                                    (&g.name, id),
                                );
                                tracked = Some(Tracked {
                                    session_id: id,
                                    name: g.name.clone(),
                                    exes: g.exes.clone(),
                                    misses: 0,
                                });
                                changed = true;
                            }
                        }
                    }

                    None => {
                        if let Some(t) = tracked.take() {
                            if t.exes.iter().any(|e| running.contains(e)) {
                                suppressed.insert(t.name);
                            }
                        }

                        let found = games.iter().find(|g| {
                            !suppressed.contains(&g.name)
                                && g.exes.iter().any(|e| running.contains(e))
                        });

                        if let Some(g) = found {
                            if let Some(id) = begin_auto(&conn, &g.name) {
                                pending.push(("game-started", g.name.clone()));

                                tracked = Some(Tracked {
                                    session_id: id,
                                    name: g.name.clone(),
                                    exes: g.exes.clone(),
                                    misses: 0,
                                });
                                changed = true;
                            }
                        }
                    }
                }
            }
        }

        for (event, name) in pending {
            let _ = app.emit(event, name);
        }

        if changed {
            let _ = app.emit("sessions-changed", ());
        }
        thread::sleep(POLL);
    }
}