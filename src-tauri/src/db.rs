use directories::ProjectDirs;
use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState(pub Mutex<Connection>);

const MIGRATION_SQL: &str = include_str!("../migrations/001_init.sql");

/// Resolve the OS-appropriate app data directory.
/// Linux:   ~/.local/share/e-class-record/
/// Windows: %APPDATA%\e-class-record\
pub fn app_data_dir() -> PathBuf {
    if let Some(proj) = ProjectDirs::from("com", "krishna", "e-class-record") {
        proj.data_dir().to_path_buf()
    } else {
        PathBuf::from("./e-class-record-data")
    }
}

pub fn init_connection() -> anyhow::Result<Connection> {
    let dir = app_data_dir();
    fs::create_dir_all(&dir)?;
    let db_path = dir.join("class_records.sqlite3");
    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "foreign_keys", true)?;
    conn.execute_batch(MIGRATION_SQL)?;
    Ok(conn)
}
