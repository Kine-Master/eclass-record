// Prevents additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod compute;
mod db;
mod export;
mod models;

use db::DbState;
use std::sync::Mutex;

fn main() {
    let conn = db::init_connection().expect("failed to initialize local database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            commands::list_presets,
            commands::save_preset,
            commands::delete_preset,
            commands::list_classes,
            commands::create_class,
            commands::update_class,
            commands::set_class_status,
            commands::delete_class,
            commands::list_students,
            commands::save_student,
            commands::delete_student,
            commands::list_assessments,
            commands::save_assessment,
            commands::delete_assessment,
            commands::save_score,
            commands::get_gradebook,
            export::export_class_xlsx,
            export::export_class_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
