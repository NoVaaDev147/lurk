use serde::Serialize;
use std::{sync::Mutex, thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;

use crate::AppState;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub current_version: String,
    pub notes: Option<String>,
    pub date: Option<String>,
}

static PENDING: Mutex<Option<UpdateInfo>> = Mutex::new(None);

async fn check(app: &AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let found = updater.check().await.map_err(|e| e.to_string())?;

    let info = found.map(|u| UpdateInfo {
        version: u.version.clone(),
        current_version: u.current_version.clone(),
        notes: u.body.clone(),
        date: u.date.map(|d| d.to_string()),
    });

    if let Ok(mut pending) = PENDING.lock() {
        *pending = info.clone();
    }
    Ok(info)
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    check(&app).await
}

#[tauri::command]
pub fn get_pending_update() -> Option<UpdateInfo> {
    PENDING.lock().ok().and_then(|p| p.clone())
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("No update available")?;

    let mut downloaded: u64 = 0;
    let on_progress = app.clone();
    let on_done = app.clone();

    update
        .download_and_install(
            move |chunk, total| {
                downloaded += chunk as u64;
                let _ = on_progress.emit(
                    "update-progress",
                    serde_json::json!({"downloaded": downloaded, "total": total}),
                );
            },
            move || {
                let _ = on_done.emit("update-installing", ());
            },
        )
        .await
        .map_err(|e| e.to_string())?;

    app.restart();
}

fn auto_check_enabled(app: &AppHandle) -> bool {
    let state = app.state::<AppState>();
    let enabled = match state.db.lock() {
        Ok(conn) => conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'auto_update_check'",
                [],
                |r| r.get::<_, String>(0),
            )
            .map(|v| v != "false")
            .unwrap_or(true),
        Err(_) => true,
    };
    enabled
}

pub fn start_background_check(app: AppHandle) {
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(20));
        loop {
            if auto_check_enabled(&app) {
                match tauri::async_runtime::block_on(check(&app)) {
                    Ok(Some(info)) => {
                        let _ = app.emit("update-available", info);
                    }
                    Ok(None) => {}
                    Err(e) => eprintln!("[updater] check failed: {e}"),
                }
            }
            thread::sleep(Duration::from_secs(6 * 60 * 60));
        }
    });
}