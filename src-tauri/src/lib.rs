//! Tauri shell.
//!
//! Contains no logic: command handlers delegate to the engine crates and forward events to
//! the frontend. Keeping it thin is what allows the whole engine to be tested headlessly
//! with `cargo test` on Linux.

mod chrome;

#[tauri::command]
fn linked_crates() -> Vec<(String, u8)> {
    vec![
        (seagulla_core::NAME.into(), seagulla_core::LAYER),
        (seagulla_db::NAME.into(), seagulla_db::LAYER),
        (seagulla_ingest::NAME.into(), seagulla_ingest::LAYER),
        (seagulla_search::NAME.into(), seagulla_search::LAYER),
        (seagulla_export::NAME.into(), seagulla_export::LAYER),
        (seagulla_platform::NAME.into(), seagulla_platform::LAYER),
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            chrome::apply(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![linked_crates])
        .run(tauri::generate_context!())
        .expect("error while running Seagulla");
}
