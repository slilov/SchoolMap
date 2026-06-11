// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn data_dir(_app: &tauri::AppHandle) -> PathBuf {
    // In dev mode (debug build), use data/ from the project root
    if cfg!(debug_assertions) {
        return PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent().unwrap().join("data");
    }
    // In production, resources are bundled with _up_ prefix for "../data/*"
    _app.path().resource_dir().unwrap().join("_up_").join("data")
}

/// Read file content, stripping UTF-8 BOM if present
fn read_json_file(path: &std::path::Path) -> Result<Value, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Cannot read {:?}: {}", path, e))?;
    let clean = content.strip_prefix('\u{FEFF}').unwrap_or(&content);
    serde_json::from_str(clean)
        .map_err(|e| format!("Invalid JSON in {:?}: {}", path, e))
}

#[tauri::command]
fn read_schools(app: tauri::AppHandle) -> Result<Value, String> {
    read_json_file(&data_dir(&app).join("schools.json"))
}

#[tauri::command]
fn read_districts(app: tauri::AppHandle) -> Result<Value, String> {
    read_json_file(&data_dir(&app).join("districts.json"))
}

#[tauri::command]
fn read_overrides(app: tauri::AppHandle) -> Result<Value, String> {
    let path = data_dir(&app).join("overrides.json");
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    read_json_file(&path)
}

#[tauri::command]
fn save_overrides(app: tauri::AppHandle, data: Value) -> Result<(), String> {
    let path = data_dir(&app).join("overrides.json");
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Cannot serialize overrides: {}", e))?;
    fs::write(&path, content)
        .map_err(|e| format!("Cannot write overrides.json: {}", e))
}

#[tauri::command]
fn save_schools(app: tauri::AppHandle, data: Value) -> Result<(), String> {
    let path = data_dir(&app).join("schools.json");
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Cannot serialize schools: {}", e))?;
    fs::write(&path, content)
        .map_err(|e| format!("Cannot write schools.json: {}", e))
}

#[tauri::command]
async fn fetch_schools_from_api() -> Result<Value, String> {
    let url = "https://api.sofiaplan.bg/datasets/166";
    let response = reqwest::get(url).await
        .map_err(|e| format!("API request failed: {}", e))?;
    let json: Value = response.json().await
        .map_err(|e| format!("Invalid JSON from API: {}", e))?;
    Ok(json)
}

#[tauri::command]
async fn fetch_districts_from_api() -> Result<Value, String> {
    let url = "https://api.sofiaplan.bg/datasets/350";
    let response = reqwest::get(url).await
        .map_err(|e| format!("API request failed: {}", e))?;
    let json: Value = response.json().await
        .map_err(|e| format!("Invalid JSON from API: {}", e))?;
    Ok(json)
}

#[tauri::command]
fn save_districts(app: tauri::AppHandle, data: Value) -> Result<(), String> {
    let path = data_dir(&app).join("districts.json");
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Cannot serialize districts: {}", e))?;
    fs::write(&path, content)
        .map_err(|e| format!("Cannot write districts.json: {}", e))
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_schools,
            read_districts,
            read_overrides,
            save_overrides,
            save_schools,
            save_districts,
            fetch_schools_from_api,
            fetch_districts_from_api
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
