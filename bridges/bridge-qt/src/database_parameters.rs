use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};
use synapse_core::Database;

fn parse_parameters(json: &str) -> Result<Vec<rusqlite::types::Value>, ()> {
    let values = serde_json::from_str::<Vec<serde_json::Value>>(json).map_err(|_| ())?;
    Ok(values
        .into_iter()
        .map(|value| match value {
            serde_json::Value::Null => rusqlite::types::Value::Null,
            serde_json::Value::Bool(value) => {
                rusqlite::types::Value::Integer(if value { 1 } else { 0 })
            }
            serde_json::Value::Number(value) => value
                .as_i64()
                .map(rusqlite::types::Value::Integer)
                .or_else(|| value.as_f64().map(rusqlite::types::Value::Real))
                .unwrap_or(rusqlite::types::Value::Null),
            serde_json::Value::String(value) => rusqlite::types::Value::Text(value),
            other => rusqlite::types::Value::Text(other.to_string()),
        })
        .collect())
}

fn c_string(value: String) -> *mut c_char {
    CString::new(value)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
#[deprecated(since = "0.2.0", note = "Direct SQL queries are deprecated. Use typed domain APIs instead.")]
pub unsafe extern "C" fn synapse_db_query_json_params(
    db: *mut Database,
    sql: *const c_char,
    parameters_json: *const c_char,
) -> *mut c_char {
    if db.is_null() || sql.is_null() || parameters_json.is_null() {
        return std::ptr::null_mut();
    }
    let sql_str = match CStr::from_ptr(sql).to_str() {
        Ok(value) => value,
        Err(_) => return std::ptr::null_mut(),
    };
    let parameters_str = match CStr::from_ptr(parameters_json).to_str() {
        Ok(value) => value,
        Err(_) => return std::ptr::null_mut(),
    };
    let parameters = match parse_parameters(parameters_str) {
        Ok(values) => values,
        Err(_) => return std::ptr::null_mut(),
    };
    let database = &*db;
    let conn = match database.lock() {
        Ok(connection) => connection,
        Err(_) => return std::ptr::null_mut(),
    };
    let mut statement = match conn.prepare(sql_str) {
        Ok(statement) => statement,
        Err(_) => return std::ptr::null_mut(),
    };
    let column_names: Vec<String> = statement
        .column_names()
        .into_iter()
        .map(str::to_owned)
        .collect();
    let mut rows = match statement.query(rusqlite::params_from_iter(parameters.iter())) {
        Ok(rows) => rows,
        Err(_) => return std::ptr::null_mut(),
    };
    let mut results: Vec<serde_json::Map<String, serde_json::Value>> = Vec::new();
    loop {
        let row = match rows.next() {
            Ok(Some(row)) => row,
            Ok(None) => break,
            Err(_) => return std::ptr::null_mut(),
        };
        let mut result = serde_json::Map::new();
        for (index, name) in column_names.iter().enumerate() {
            let value = match row.get_ref(index) {
                Ok(rusqlite::types::ValueRef::Null) => serde_json::Value::Null,
                Ok(rusqlite::types::ValueRef::Integer(number)) => number.into(),
                Ok(rusqlite::types::ValueRef::Real(number)) => serde_json::Number::from_f64(number)
                    .map(serde_json::Value::Number)
                    .unwrap_or(serde_json::Value::Null),
                Ok(rusqlite::types::ValueRef::Text(text)) => {
                    serde_json::Value::String(String::from_utf8_lossy(text).into_owned())
                }
                Ok(rusqlite::types::ValueRef::Blob(bytes)) => {
                    serde_json::Value::String(hex::encode(bytes))
                }
                Err(_) => return std::ptr::null_mut(),
            };
            result.insert(name.clone(), value);
        }
        results.push(result);
    }
    let json = match serde_json::to_string(&results) {
        Ok(value) => value,
        Err(_) => return std::ptr::null_mut(),
    };
    c_string(json)
}

#[no_mangle]
#[deprecated(since = "0.2.0", note = "Direct SQL execution is deprecated. Use typed domain APIs instead.")]
pub unsafe extern "C" fn synapse_db_execute_params(
    db: *mut Database,
    sql: *const c_char,
    parameters_json: *const c_char,
) -> c_int {
    if db.is_null() || sql.is_null() || parameters_json.is_null() {
        return -1;
    }
    let sql_str = match CStr::from_ptr(sql).to_str() {
        Ok(value) => value,
        Err(_) => return -1,
    };
    let parameters_str = match CStr::from_ptr(parameters_json).to_str() {
        Ok(value) => value,
        Err(_) => return -1,
    };
    let parameters = match parse_parameters(parameters_str) {
        Ok(values) => values,
        Err(_) => return -1,
    };
    let database = &*db;
    let conn = match database.lock() {
        Ok(connection) => connection,
        Err(_) => return -1,
    };
    match conn.execute(sql_str, rusqlite::params_from_iter(parameters.iter())) {
        Ok(changed_rows) => changed_rows as c_int,
        Err(error) => {
            eprintln!("[Synapse Bridge] Parameterized database write failed: {error}");
            -1
        }
    }
}
