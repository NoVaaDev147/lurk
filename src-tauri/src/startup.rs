use std::{thread, time::Duration};
use tauri::{AppHandle, Manager};

pub fn finish(app: &AppHandle) {
    if let Some(splash) = app.get_webview_window("splash") {
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.show();
            let _ = main.set_focus();
        }
        let _ = splash.close();
    }
}

#[tauri::command]
pub fn app_ready(app: AppHandle) {
    finish(&app);
}

pub fn start_watchdog(app: AppHandle) {
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(12));
        finish(&app);
    });
}