use sysinfo::System;
use tauri::{Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut, ShortcutState};

#[tauri::command]
fn toggle_overlay(app: tauri::AppHandle) {
    let overlay: WebviewWindow = app.get_webview_window("overlay").unwrap();
    if overlay.is_visible().unwrap() {
        overlay.hide().unwrap();
    } else {
        overlay.show().unwrap();
        overlay.set_focus().unwrap();
    }
}

#[tauri::command]
fn drag_overlay(app: tauri::AppHandle) {
    let overlay: WebviewWindow = app.get_webview_window("overlay").unwrap();
    overlay.start_dragging().unwrap();
}

#[tauri::command]
fn detect_game() -> Option<String> {
    let mut sys = System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let known_games = vec![
        ("RobloxPlayerBeta.exe", "Roblox"),
        ("ZenlessZoneZero.exe", "Zenless Zone Zero"),
        ("GenshinImpact.exe", "Genshin Impact"),
        ("Minecraft.exe", "Minecraft"),
        ("MinecraftLauncher.exe", "Minecraft"),
        ("javaw.exe", "Minecraft"),
        ("FortniteClient-Win64-Shipping.exe", "Fortnite"),
        ("VALORANT-Win64-Shipping.exe", "Valorant"),
        ("csgo.exe", "CS:GO"),
        ("cs2.exe", "CS2"),
        ("LeagueOfLegends.exe", "League of Legends"),
        ("Overwatch.exe", "Overwatch"),
        ("overwatch.exe", "Overwatch 2"),
        ("destiny2.exe", "Destiny 2"),
        ("RainbowSix.exe", "Rainbow Six Siege"),
        ("EscapeFromTarkov.exe", "Escape from Tarkov"),
        ("PetSimulator99.exe", "Pet Simulator 99"),
        ("Steam.exe", "Steam"),
        ("EpicGamesLauncher.exe", "Epic Games"),
    ];

    for (process_name, game_name) in &known_games {
        for (_pid, process) in sys.processes() {
            let name = process.name().to_string_lossy().to_lowercase();
            if name == process_name.to_lowercase() {
                return Some(game_name.to_string());
            }
        }
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
       .plugin(tauri_plugin_sql::Builder::new().build())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            toggle_overlay,
            drag_overlay,
            detect_game
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let shortcut = Shortcut::new(None, Code::F9);
            app.global_shortcut()
                .on_shortcut(shortcut, move |_app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let overlay: WebviewWindow = handle.get_webview_window("overlay").unwrap();
                        if overlay.is_visible().unwrap() {
                            overlay.hide().unwrap();
                        } else {
                            overlay.show().unwrap();
                            overlay.set_focus().unwrap();
                        }
                    }
                })?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
