mod db;
mod detect;
mod games;
mod notes;
mod sessions;
mod settings;
mod system;
mod tasks;
mod widget;
mod updater;
mod startup;

use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_autostart::MacosLauncher;
pub struct AppState {
    pub db: Mutex<Connection>,
}

#[tauri::command]
fn db_version(state: tauri::State<AppState>) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.pragma_query_value(None, "user_version", |r| r.get(0))
        .map_err(|e| e.to_string())
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

fn quit_app(app: &AppHandle) {
    let _ = app.remove_tray_by_id("lurk-tray");
    app.exit(0);
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Lurk", true, None::<&str>)?;
    let widget = MenuItem::with_id(app, "widget", "Toggle widget", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &widget, &quit])?;

    TrayIconBuilder::with_id("lurk-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Lurk")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main(app),
            "widget" => widget::toggle(app),
            "quit" => quit_app(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app);
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            let conn = db::open(dir.join("lurk.db"))?;

            let hotkey: String = conn
                .query_row(
                    "SELECT value FROM settings WHERE key = 'hotkey'",
                    [],
                    |r| r.get::<_, String>(0),
                )
                .unwrap_or_else(|_| "F9".to_string());

            app.manage(AppState { db: Mutex::new(conn) });

            if let Err(e) = widget::register_hotkey(app.handle(), &hotkey) {
                eprintln!("Could not register hotkey: {e}");
            }

            detect::start(app.handle().clone());
            updater::start_background_check(app.handle().clone());
            startup::start_watchdog(app.handle().clone());
            setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                match window.label() {
                    "widget" => {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                    
                    "main" => {
                        let app = window.app_handle();
                        let state = app.state::<AppState>();
                        let raw: Option<String> = match state.db.lock() {
                            Ok(conn) => conn
                                .query_row(
                                    "SELECT value FROM settings WHERE key = 'close_to_tray'",
                                    [],
                                    |r| r.get::<_, String>(0),
                                )
                                .ok(),
                            Err(_) => None,
                        };

                        let to_tray = raw.as_deref() != Some("false");
                        if to_tray {
                            api.prevent_close();
                            let _ = window.hide();
                        } else {
                            quit_app(&app);
                        }
                    }
                    _ => {}
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            db_version,
            settings::get_setting,
            settings::set_setting,
            system::get_autostart,
            system::set_autostart,
            tasks::list_tasks,
            tasks::add_task,
            tasks::update_task,
            tasks::set_task_completed,
            tasks::delete_task,
            notes::list_notes,
            notes::create_note,
            notes::update_note,
            notes::delete_note,
            sessions::get_active_session,
            sessions::list_sessions,
            sessions::start_session,
            sessions::stop_session,
            sessions::delete_session,
            widget::toggle_widget,
            widget::hide_widget,
            widget::set_hotkey,
            updater::check_for_update,
            updater::get_pending_update,
            updater::install_update,
            startup::app_ready,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lurk");
}
