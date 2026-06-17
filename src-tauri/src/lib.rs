// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Привет, {}! Сообщение отправлено из Rust ядра Tauri!", name)
}

#[derive(serde::Serialize, serde::Deserialize)]
struct TelegramBotInfo {
    id: i64,
    is_bot: bool,
    first_name: String,
    username: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct TelegramGetMeResponse {
    ok: bool,
    result: Option<TelegramBotInfo>,
    description: Option<String>,
}

#[tauri::command]
fn get_bot_me(token: String) -> Result<TelegramGetMeResponse, String> {
    let url = format!("https://api.telegram.org/bot{}/getMe", token);
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    let res = client.get(&url)
        .send()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    let response_data: TelegramGetMeResponse = res.json()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    Ok(response_data)
}

#[tauri::command]
fn get_updates(token: String) -> Result<serde_json::Value, String> {
    let url = format!("https://api.telegram.org/bot{}/getUpdates?allowed_updates=%5B%5D", token);
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    let res = client.get(&url)
        .send()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    let response_data: serde_json::Value = res.json()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    Ok(response_data)
}

#[derive(serde::Serialize)]
struct SendMessagePayload {
    chat_id: String,
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    message_thread_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    parse_mode: Option<String>,
}

#[tauri::command]
fn send_message(
    token: String,
    chat_id: String,
    message_thread_id: Option<i64>,
    text: String,
    parse_mode: Option<String>,
) -> Result<serde_json::Value, String> {
    let url = format!("https://api.telegram.org/bot{}/sendMessage", token);
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    let payload = SendMessagePayload {
        chat_id,
        text,
        message_thread_id,
        parse_mode: match parse_mode {
            Some(ref mode) if !mode.is_empty() => Some(mode.clone()),
            _ => None,
        },
    };

    let res = client.post(&url)
        .json(&payload)
        .send()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    let response_data: serde_json::Value = res.json()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    Ok(response_data)
}

#[tauri::command]
fn get_webhook_info(token: String) -> Result<serde_json::Value, String> {
    let url = format!("https://api.telegram.org/bot{}/getWebhookInfo", token);
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    let res = client.get(&url)
        .send()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    let response_data: serde_json::Value = res.json()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    Ok(response_data)
}

#[derive(serde::Serialize)]
struct DeleteWebhookPayload {
    drop_pending_updates: bool,
}

#[tauri::command]
fn delete_webhook(token: String, drop_pending_updates: bool) -> Result<serde_json::Value, String> {
    let url = format!("https://api.telegram.org/bot{}/deleteWebhook", token);
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    let payload = DeleteWebhookPayload { drop_pending_updates };

    let res = client.post(&url)
        .json(&payload)
        .send()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    let response_data: serde_json::Value = res.json()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    Ok(response_data)
}

#[derive(serde::Serialize)]
struct SetWebhookPayload {
    url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    secret_token: Option<String>,
}

#[tauri::command]
fn set_webhook(token: String, url: String, secret_token: Option<String>) -> Result<serde_json::Value, String> {
    let api_url = format!("https://api.telegram.org/bot{}/setWebhook", token);
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    let payload = SetWebhookPayload { 
        url,
        secret_token: if let Some(ref s) = secret_token {
            if s.is_empty() { None } else { Some(s.clone()) }
        } else {
            None
        }
    };

    let res = client.post(&api_url)
        .json(&payload)
        .send()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    let response_data: serde_json::Value = res.json()
        .map_err(|e| clean_error(e.to_string(), &token))?;

    Ok(response_data)
}

fn clean_error(mut err: String, token: &str) -> String {
    if !token.is_empty() {
        err = err.replace(token, "[REDACTED_TOKEN]");
    }
    err
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_bot_me, 
            get_updates, 
            send_message,
            get_webhook_info,
            delete_webhook,
            set_webhook
        ])
        .run(tauri::generate_context!())
        .expect("ошибка при запуске приложения tauri");
}
