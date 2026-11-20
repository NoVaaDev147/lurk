use rusqlite::OptionalExtension;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::AppState;

pub fn toggle(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("widget") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.show();
            let _ = win.set_focus();
            let _ = app.emit("widget-shown", ());
        }
    }
}

#[tauri::command]
pub fn toggle_widget(app: AppHandle) {
    toggle(&app);
}

#[tauri::command]
pub fn hide_widget(window: tauri::WebviewWindow) {
    let _ = window.hide();
}

pub fn register_hotkey(app: &AppHandle, accelerator: &str) -> Result<(), String> {
    let shortcut: Shortcut = accelerator
        .parse()
        .map_err(|e| format!("invalid hotkey 'accelerator': {e:?}"))?;

    app.global_shortcut()
        .on_shortcut(shortcut, |app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                toggle(app);
            }
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_hotkey(
    app: AppHandle,
    state: State<AppState>,
    accelerator: String,
) -> Result<(), String> {
    let new: Shortcut = accelerator
        .parse()
        .map_err(|e| format!("Invalid hotkey: {e:?}"))?;

    let old_text: Option<String> = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT value FROM settings WHERE key = 'hotkey'",
            [],
            |r| r.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
    };
    let old: Option<Shortcut> = old_text.as_deref().and_then(|t| t.parse().ok());

    if let Some(o) = old {
        if o == new {
            return Ok(());
        }
        let _ = app.global_shortcut().unregister(o);
    }

    if let Err(e) = register_hotkey(&app, &accelerator) {
        if let Some(o) = old_text.as_deref() {
            let _ = register_hotkey(&app, o);
        }
        return Err(format!("Couldn't use {accelerator}: {e}"));
    }

    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('hotkey', ?1)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [&accelerator],
        )
        .map_err(|e| e.to_string())?;
    }
    let _ = app.emit("settings-changed", ());
    Ok(())
}