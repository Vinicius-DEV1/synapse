use tauri::State;
use serde_json::Value;
use crate::db::DbState;

#[tauri::command]
pub fn sync_get_table(table_name: String, db_state: State<'_, DbState>) -> Result<Vec<Value>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    // Validar nome da tabela para evitar SQL injection (nomes de tabelas não podem ser parametrizados)
    if !table_name.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err("Invalid table name".into());
    }
    
    let query = format!("SELECT * FROM {}", table_name);
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
    let column_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    
    let iter = stmt.query_map([], |row| {
        let mut map = serde_json::Map::new();
        for (i, col) in column_names.iter().enumerate() {
            let val = row.get_ref(i).unwrap();
            let json_val = match val {
                rusqlite::types::ValueRef::Null => Value::Null,
                rusqlite::types::ValueRef::Integer(i) => Value::Number(i.into()),
                rusqlite::types::ValueRef::Real(f) => serde_json::Number::from_f64(f).map(Value::Number).unwrap_or(Value::Null),
                rusqlite::types::ValueRef::Text(t) => Value::String(String::from_utf8_lossy(t).to_string()),
                rusqlite::types::ValueRef::Blob(_) => Value::Null, // Ignorando blobs no sync
            };
            map.insert(col.clone(), json_val);
        }
        Ok(Value::Object(map))
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i { items.push(item); }
    }
    Ok(items)
}

#[tauri::command]
pub fn sync_delete_row(table_name: String, id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    if !table_name.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err("Invalid table name".into());
    }
    
    let query = format!("UPDATE {} SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", table_name);
    conn.execute(&query, [&id]).map_err(|e| e.to_string())?;
    
    Ok(true)
}

#[tauri::command]
pub fn sync_upsert_row(table_name: String, row: Value, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    if !table_name.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err("Invalid table name".into());
    }
    
    let obj = row.as_object().ok_or("Row must be an object")?;
    
    let mut columns = Vec::new();
    let mut placeholders = Vec::new();
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
    
    for (k, v) in obj {
        columns.push(k.clone());
        placeholders.push("?".to_string());
        
        let sql_val = match v {
            Value::Null => rusqlite::types::Value::Null,
            Value::Bool(b) => rusqlite::types::Value::Integer(if *b { 1 } else { 0 }),
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    rusqlite::types::Value::Integer(i)
                } else if let Some(f) = n.as_f64() {
                    rusqlite::types::Value::Real(f)
                } else {
                    rusqlite::types::Value::Null
                }
            },
            Value::String(s) => rusqlite::types::Value::Text(s.clone()),
            Value::Array(_) | Value::Object(_) => rusqlite::types::Value::Text(v.to_string()),
        };
        params_vec.push(sql_val);
    }
    
    let cols_str = columns.join(", ");
    let placeholders_str = placeholders.join(", ");
    let update_str = columns.iter().filter(|c| *c != "id").map(|c| format!("{} = excluded.{}", c, c)).collect::<Vec<_>>().join(", ");
    
    let query = if update_str.is_empty() {
        format!("INSERT OR IGNORE INTO {} ({}) VALUES ({})", table_name, cols_str, placeholders_str)
    } else {
        format!("INSERT INTO {} ({}) VALUES ({}) ON CONFLICT(id) DO UPDATE SET {}", table_name, cols_str, placeholders_str, update_str)
    };
    
    let params_iter = rusqlite::params_from_iter(params_vec.iter());
    conn.execute(&query, params_iter).map_err(|e| e.to_string())?;
    
    Ok(true)
}
