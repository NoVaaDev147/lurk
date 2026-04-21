use tauri::{
    Manager, WebviewWindow,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    menu::{Menu, MenuItem},
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut, ShortcutState};
use sysinfo::System;

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
        .invoke_handler(tauri::generate_handler![toggle_overlay, drag_overlay, detect_game])
        .setup(|app| {
            // global shortcut
            let handle = app.handle().clone();
            let shortcut = Shortcut::new(None, Code::F9);
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
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

            // system tray
            let show = MenuItem::with_id(app, "show", "Show Lurk", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Lurk", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                })
                .build(app)?;

            // intercept close button to hide instead of quit
            let main_handle = app.get_webview_window("main").unwrap();
            let main_handle_clone = main_handle.clone();
            main_handle.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    main_handle_clone.hide().unwrap();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}