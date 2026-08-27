use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use futures::stream::{self, StreamExt};
use regex::Regex;
use reqwest::header::{
    HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, CACHE_CONTROL, DNT, REFERER, UPGRADE_INSECURE_REQUESTS, USER_AGENT,
};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Duration;
use uuid::Uuid;

const MAX_TOTAL_BYTES: usize = 50 * 1024 * 1024; // 50MB safety cap
const MAX_CONCURRENT_DOWNLOADS: usize = 12;
const BROWSER_USER_AGENT: &str = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScrapPayload {
    pub id: String,
    pub url: String,
    pub title: String,
    pub favicon: Option<String>,
    pub html_content: String,
    pub file_size: usize,
    pub created_at: String,
    pub local_path: String,
}

fn create_browser_client() -> Result<reqwest::Client, String> {
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static(BROWSER_USER_AGENT));
    headers.insert(
        ACCEPT,
        HeaderValue::from_static("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"),
    );
    headers.insert(
        ACCEPT_LANGUAGE,
        HeaderValue::from_static("pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"),
    );
    headers.insert(UPGRADE_INSECURE_REQUESTS, HeaderValue::from_static("1"));
    headers.insert(CACHE_CONTROL, HeaderValue::from_static("max-age=0"));
    headers.insert(DNT, HeaderValue::from_static("1"));
    // Simula navegação originada do Google para contornar restrições de hotlink/WAF
    headers.insert(REFERER, HeaderValue::from_static("https://www.google.com/"));
    headers.insert(
        "Sec-Ch-Ua",
        HeaderValue::from_static("\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\""),
    );
    headers.insert("Sec-Ch-Ua-Mobile", HeaderValue::from_static("?0"));
    headers.insert("Sec-Ch-Ua-Platform", HeaderValue::from_static("\"Linux\""));
    headers.insert("Sec-Fetch-Dest", HeaderValue::from_static("document"));
    headers.insert("Sec-Fetch-Mode", HeaderValue::from_static("navigate"));
    headers.insert("Sec-Fetch-Site", HeaderValue::from_static("cross-site"));
    headers.insert("Sec-Fetch-User", HeaderValue::from_static("?1"));

    reqwest::Client::builder()
        .default_headers(headers)
        .timeout(Duration::from_secs(30))
        .redirect(reqwest::redirect::Policy::limited(10))
        .cookie_store(true)
        .build()
        .map_err(|e| format!("Falha ao inicializar cliente de rede: {}", e))
}

fn resolve_url(base: &str, relative: &str) -> Option<String> {
    let clean_rel = relative.trim().trim_matches('\'').trim_matches('"');
    if clean_rel.starts_with("data:") || clean_rel.starts_with("javascript:") || clean_rel.is_empty() {
        return None;
    }
    if clean_rel.starts_with("//") {
        if let Ok(base_url) = reqwest::Url::parse(base) {
            return Some(format!("{}:{}", base_url.scheme(), clean_rel));
        }
        return Some(format!("https:{}", clean_rel));
    }
    if clean_rel.starts_with("http://") || clean_rel.starts_with("https://") {
        return Some(clean_rel.to_string());
    }

    if let Ok(base_url) = reqwest::Url::parse(base) {
        if let Ok(joined) = base_url.join(clean_rel) {
            return Some(joined.to_string());
        }
    }
    None
}

fn guess_mime(url: &str, default_mime: &str) -> String {
    let clean_path = url.split('?').next().unwrap_or(url).split('#').next().unwrap_or(url);
    if let Some(ext) = clean_path.split('.').last() {
        match ext.to_lowercase().as_str() {
            "png" => "image/png".to_string(),
            "jpg" | "jpeg" => "image/jpeg".to_string(),
            "webp" => "image/webp".to_string(),
            "gif" => "image/gif".to_string(),
            "svg" => "image/svg+xml".to_string(),
            "ico" => "image/x-icon".to_string(),
            "avif" => "image/avif".to_string(),
            "css" => "text/css".to_string(),
            "js" | "mjs" => "application/javascript".to_string(),
            "woff2" => "font/woff2".to_string(),
            "woff" => "font/woff".to_string(),
            "ttf" => "font/ttf".to_string(),
            "otf" => "font/otf".to_string(),
            _ => default_mime.to_string(),
        }
    } else {
        default_mime.to_string()
    }
}

fn is_tracker_or_ad(url: &str) -> bool {
    let u = url.to_lowercase();
    u.contains("google-analytics.com")
        || u.contains("googletagmanager.com")
        || u.contains("doubleclick.net")
        || u.contains("connect.facebook.net")
        || u.contains("clarity.ms")
        || u.contains("hotjar.com")
        || u.contains("sentry.io")
        || u.contains("analytics")
        || u.contains("telemetry")
}

async fn fetch_asset_as_base64(
    client: &reqwest::Client,
    asset_url: &str,
    page_referer: &str,
    default_mime: &str,
    total_downloaded: &Arc<AtomicUsize>,
) -> Option<String> {
    if total_downloaded.load(Ordering::Relaxed) >= MAX_TOTAL_BYTES {
        return None;
    }

    let mut req = client.get(asset_url).timeout(Duration::from_secs(12));
    if let Ok(ref_val) = HeaderValue::from_str(page_referer) {
        req = req.header(REFERER, ref_val);
    }

    let res = req.send().await.ok()?;

    if !res.status().is_success() {
        return None;
    }

    let mime = res
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(';').next().unwrap_or(s).trim().to_string())
        .unwrap_or_else(|| guess_mime(asset_url, default_mime));

    let bytes = res.bytes().await.ok()?;
    let byte_len = bytes.len();
    if byte_len == 0 || byte_len > 15 * 1024 * 1024 {
        return None;
    }

    total_downloaded.fetch_add(byte_len, Ordering::Relaxed);
    let b64 = BASE64.encode(&bytes);
    Some(format!("data:{};base64,{}", mime, b64))
}

async fn fetch_asset_as_text(
    client: &reqwest::Client,
    asset_url: &str,
    page_referer: &str,
    total_downloaded: &Arc<AtomicUsize>,
) -> Option<String> {
    if total_downloaded.load(Ordering::Relaxed) >= MAX_TOTAL_BYTES {
        return None;
    }

    let mut req = client.get(asset_url).timeout(Duration::from_secs(12));
    if let Ok(ref_val) = HeaderValue::from_str(page_referer) {
        req = req.header(REFERER, ref_val);
    }

    let res = req.send().await.ok()?;

    if !res.status().is_success() {
        return None;
    }

    let text = res.text().await.ok()?;
    total_downloaded.fetch_add(text.len(), Ordering::Relaxed);
    Some(text)
}

fn extract_title(html: &str, fallback_url: &str) -> String {
    // 1. Open Graph Title
    if let Ok(re) = Regex::new(r#"(?i)<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']"#) {
        if let Some(caps) = re.captures(html) {
            if let Some(m) = caps.get(1) {
                let t = m.as_str().trim();
                if !t.is_empty() {
                    return t.to_string();
                }
            }
        }
    }

    // 2. <title>...</title>
    if let Ok(re) = Regex::new(r#"(?is)<title[^>]*>(.*?)</title>"#) {
        if let Some(caps) = re.captures(html) {
            if let Some(m) = caps.get(1) {
                let t = m.as_str().trim();
                if !t.is_empty() {
                    return t
                        .replace("&amp;", "&")
                        .replace("&quot;", "\"")
                        .replace("&#39;", "'")
                        .replace("&lt;", "<")
                        .replace("&gt;", ">");
                }
            }
        }
    }

    if let Ok(parsed) = reqwest::Url::parse(fallback_url) {
        if let Some(host) = parsed.host_str() {
            return format!("Página de {}", host);
        }
    }
    fallback_url.to_string()
}

fn extract_favicon_urls(html: &str, base_url: &str) -> Vec<String> {
    let mut results = Vec::new();
    if let Ok(re) = Regex::new(r#"(?i)<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*>"#) {
        let href_re = Regex::new(r#"(?i)href=["']([^"']+)["']"#).unwrap();
        for cap in re.find_iter(html) {
            if let Some(href_cap) = href_re.captures(cap.as_str()) {
                if let Some(href_val) = href_cap.get(1) {
                    if let Some(resolved) = resolve_url(base_url, href_val.as_str()) {
                        results.push(resolved);
                    }
                }
            }
        }
    }

    if let Ok(parsed) = reqwest::Url::parse(base_url) {
        if let Some(host) = parsed.host_str() {
            results.push(format!("{}://{}/favicon.ico", parsed.scheme(), host));
        }
    }
    results
}

/**
 * Processa CSS: resolve @import e inlineia todas as imagens/fontes url(...) dentro das regras.
 */
async fn process_css_content(
    client: &reqwest::Client,
    css_content: &str,
    css_base_url: &str,
    total_downloaded: &Arc<AtomicUsize>,
) -> String {
    let mut processed_css = css_content.to_string();

    // 1. Encontrar todos os url(...) dentro do CSS
    let url_re = Regex::new(r#"(?i)url\(\s*(?:['"]?)([^'"\)\s]+)(?:['"]?)\s*\)"#).unwrap();
    let mut url_matches = Vec::new();
    for cap in url_re.captures_iter(css_content) {
        if let Some(raw_match) = cap.get(1) {
            let asset_path = raw_match.as_str();
            if !asset_path.starts_with("data:") {
                if let Some(resolved) = resolve_url(css_base_url, asset_path) {
                    url_matches.push((asset_path.to_string(), resolved));
                }
            }
        }
    }

    // 2. Baixar fontes e imagens de CSS em paralelo com referer correto
    let client_clone = client.clone();
    let total_downloaded_clone = total_downloaded.clone();
    let referer = css_base_url.to_string();

    let fetched_assets: HashMap<String, String> = stream::iter(url_matches)
        .map(|(raw_path, resolved_url)| {
            let client = client_clone.clone();
            let total = total_downloaded_clone.clone();
            let ref_header = referer.clone();
            async move {
                let mime = guess_mime(&resolved_url, "application/octet-stream");
                if let Some(data_uri) = fetch_asset_as_base64(&client, &resolved_url, &ref_header, &mime, &total).await {
                    Some((raw_path, data_uri))
                } else {
                    None
                }
            }
        })
        .buffer_unordered(MAX_CONCURRENT_DOWNLOADS)
        .filter_map(|x| async move { x })
        .collect()
        .await;

    for (raw_path, data_uri) in fetched_assets {
        processed_css = processed_css
            .replace(&format!("'{}'", raw_path), &format!("'{}'", data_uri))
            .replace(&format!("\"{}\"", raw_path), &format!("\"{}\"", data_uri))
            .replace(&format!("({})", raw_path), &format!("({})", data_uri));
    }

    processed_css
}

/**
 * Traduz erros HTTP e de conexão para mensagens claras e amigáveis em português.
 */
fn format_http_error(status: reqwest::StatusCode) -> String {
    match status.as_u16() {
        401 => "Autenticação necessária (HTTP 401). Esta página requer login.".to_string(),
        403 => "Acesso restrito (HTTP 403 Forbidden). O site bloqueia acessos automatizados ou requer permissões especiais.".to_string(),
        404 => "Página não encontrada (HTTP 404). Verifique se o endereço está correto.".to_string(),
        429 => "Muitas requisições (HTTP 429 Too Many Requests). Aguarde alguns instantes antes de tentar novamente.".to_string(),
        500 => "Erro interno no servidor de destino (HTTP 500).".to_string(),
        502 => "Bad Gateway (HTTP 502). O servidor proxy ou de destino está com problemas.".to_string(),
        503 => "Serviço temporariamente indisponível (HTTP 503). O site pode estar em manutenção ou com proteção ativa.".to_string(),
        504 => "Gateway Timeout (HTTP 504). O servidor de destino demorou para responder.".to_string(),
        code => format!("O servidor retornou o erro HTTP {} ({})", code, status.canonical_reason().unwrap_or("Erro desconhecido")),
    }
}

#[tauri::command]
pub async fn scrap_capture_page(url: String) -> Result<ScrapPayload, String> {
    let clean_url = url.trim();
    if !clean_url.starts_with("http://") && !clean_url.starts_with("https://") {
        return Err("URL inválida. O endereço deve começar com http:// ou https://".to_string());
    }

    let client = create_browser_client()?;

    // 1. Fetch main HTML com cabeçalhos Chrome completos e tratamento exaustivo de erros de rede
    let res = client
        .get(clean_url)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "Tempo limite excedido (30s) ao conectar à página. O servidor demorou para responder.".to_string()
            } else if e.is_connect() {
                "Não foi possível conectar ao servidor de destino. Verifique sua conexão com a internet e a URL.".to_string()
            } else if e.is_decode() {
                "Falha ao decodificar a resposta da página (compressão ou codificação inválida).".to_string()
            } else {
                format!("Erro ao acessar a página: {}", e)
            }
        })?;

    let status = res.status();
    if !status.is_success() {
        return Err(format_http_error(status));
    }

    let final_url = res.url().to_string();
    let raw_html = res.text().await.map_err(|e| format!("Falha ao ler o corpo HTML: {}", e))?;

    let title = extract_title(&raw_html, &final_url);
    let total_downloaded = Arc::new(AtomicUsize::new(raw_html.len()));

    // 2. Favicon
    let favicon_candidates = extract_favicon_urls(&raw_html, &final_url);
    let mut favicon_base64: Option<String> = None;
    for fav_url in favicon_candidates {
        if let Some(b64) = fetch_asset_as_base64(&client, &fav_url, &final_url, "image/x-icon", &total_downloaded).await {
            favicon_base64 = Some(b64);
            break;
        }
    }

    let mut processed_html = raw_html.clone();

    // 3. EXTRAÇÃO & INLINE DE CSS (<link rel="stylesheet" href="...">)
    let link_re = Regex::new(r#"(?is)<link[^>]+rel=["']stylesheet["'][^>]*>"#).unwrap();
    let href_re = Regex::new(r#"(?i)href=["']([^"']+)["']"#).unwrap();
    let mut css_links = Vec::new();

    for cap in link_re.find_iter(&raw_html) {
        let tag_str = cap.as_str();
        if let Some(href_cap) = href_re.captures(tag_str) {
            if let Some(href_val) = href_cap.get(1) {
                if let Some(resolved) = resolve_url(&final_url, href_val.as_str()) {
                    css_links.push((tag_str.to_string(), resolved));
                }
            }
        }
    }

    // Download de stylesheets em paralelo
    let client_clone = client.clone();
    let total_clone = total_downloaded.clone();
    let page_ref = final_url.clone();
    let inlined_css_styles: Vec<(String, String)> = stream::iter(css_links)
        .map(|(full_tag, css_url)| {
            let client = client_clone.clone();
            let total = total_clone.clone();
            let referer = page_ref.clone();
            async move {
                if let Some(raw_css) = fetch_asset_as_text(&client, &css_url, &referer, &total).await {
                    let processed = process_css_content(&client, &raw_css, &css_url, &total).await;
                    let style_tag = format!("<style data-source=\"{}\">\n{}\n</style>", css_url, processed);
                    Some((full_tag, style_tag))
                } else {
                    None
                }
            }
        })
        .buffer_unordered(MAX_CONCURRENT_DOWNLOADS)
        .filter_map(|x| async move { x })
        .collect()
        .await;

    for (full_tag, style_tag) in inlined_css_styles {
        processed_html = processed_html.replace(&full_tag, &style_tag);
    }

    // 4. EXTRAÇÃO & INLINE DE IMAGENS (<img>, <picture>, <source>, style="background: url(...)")
    let img_src_re = Regex::new(r#"(?i)(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']"#).unwrap();
    let mut image_urls = HashSet::new();

    for cap in img_src_re.captures_iter(&processed_html) {
        if let Some(m) = cap.get(1) {
            let src_val = m.as_str();
            if !src_val.starts_with("data:") && !is_tracker_or_ad(src_val) {
                if let Some(resolved) = resolve_url(&final_url, src_val) {
                    image_urls.insert((src_val.to_string(), resolved));
                }
            }
        }
    }

    // Download de todas as imagens em paralelo
    let client_img_clone = client.clone();
    let total_img_clone = total_downloaded.clone();
    let page_ref_img = final_url.clone();
    let inlined_images: HashMap<String, String> = stream::iter(image_urls)
        .map(|(orig_src, resolved_url)| {
            let client = client_img_clone.clone();
            let total = total_img_clone.clone();
            let referer = page_ref_img.clone();
            async move {
                let mime = guess_mime(&resolved_url, "image/png");
                if let Some(data_uri) = fetch_asset_as_base64(&client, &resolved_url, &referer, &mime, &total).await {
                    Some((orig_src, data_uri))
                } else {
                    None
                }
            }
        })
        .buffer_unordered(MAX_CONCURRENT_DOWNLOADS)
        .filter_map(|x| async move { x })
        .collect()
        .await;

    for (orig_src, data_uri) in inlined_images {
        processed_html = processed_html
            .replace(&format!("src=\"{}\"", orig_src), &format!("src=\"{}\"", data_uri))
            .replace(&format!("src='{}'", orig_src), &format!("src='{}'", data_uri))
            .replace(&format!("data-src=\"{}\"", orig_src), &format!("src=\"{}\"", data_uri))
            .replace(&format!("data-original=\"{}\"", orig_src), &format!("src=\"{}\"", data_uri));
    }

    // 5. EXTRAÇÃO & INLINE DE SCRIPTS (<script src="...">)
    let script_re = Regex::new(r#"(?is)<script[^>]+src=["']([^"']+)["'][^>]*>\s*</script>"#).unwrap();
    let mut script_urls = Vec::new();

    for cap in script_re.captures_iter(&processed_html) {
        if let Some(full_match) = cap.get(0) {
            if let Some(src_match) = cap.get(1) {
                let src_val = src_match.as_str();
                if !src_val.starts_with("data:") && !is_tracker_or_ad(src_val) {
                    if let Some(resolved) = resolve_url(&final_url, src_val) {
                        script_urls.push((full_match.as_str().to_string(), resolved));
                    }
                }
            }
        }
    }

    let client_script_clone = client.clone();
    let total_script_clone = total_downloaded.clone();
    let page_ref_script = final_url.clone();
    let inlined_scripts: Vec<(String, String)> = stream::iter(script_urls)
        .map(|(full_tag, script_url)| {
            let client = client_script_clone.clone();
            let total = total_script_clone.clone();
            let referer = page_ref_script.clone();
            async move {
                if let Some(js_code) = fetch_asset_as_text(&client, &script_url, &referer, &total).await {
                    let inline_tag = format!("<script data-source=\"{}\">\n{}\n</script>", script_url, js_code);
                    Some((full_tag, inline_tag))
                } else {
                    None
                }
            }
        })
        .buffer_unordered(MAX_CONCURRENT_DOWNLOADS)
        .filter_map(|x| async move { x })
        .collect()
        .await;

    for (full_tag, inline_tag) in inlined_scripts {
        processed_html = processed_html.replace(&full_tag, &inline_tag);
    }

    // 6. Inserir Meta Viewport, Base tag e CSS normalizador de responsividade
    let security_and_responsive_shield = format!(
        r#"
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <base href="{}" target="_blank">
  <style id="caderno-responsive-normalizer">
    html, body {{
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      overflow-x: auto !important;
      -webkit-text-size-adjust: 100% !important;
    }}
    *, *::before, *::after {{
      box-sizing: inherit !important;
    }}
    img, video, canvas, svg, iframe {{
      max-width: 100% !important;
      height: auto !important;
    }}
    table {{
      max-width: 100% !important;
      overflow-x: auto !important;
      display: block !important;
    }}
  </style>
  <script>
    // Caderno Snapshot Shield - Protege contra frame-busting e redirecionamentos indevidos
    try {{
      window.onbeforeunload = null;
      if (window.top !== window.self) {{
        window.top = window.self;
      }}
    }} catch(e) {{}}
  </script>"#,
        final_url
    );

    if let Some(head_idx) = processed_html.to_lowercase().find("<head>") {
        let insert_pos = head_idx + 6;
        processed_html.insert_str(insert_pos, &security_and_responsive_shield);
    } else {
        processed_html = format!("<head>{}</head>{}", security_and_responsive_shield, processed_html);
    }

    // 7. Salvar snapshot no disco local
    let scrap_id = Uuid::new_v4().to_string();
    let app_dir = crate::get_app_data_dir();
    let scraps_dir = app_dir.join("scraps");
    std::fs::create_dir_all(&scraps_dir).map_err(|e| format!("Falha ao criar pasta de scraps: {}", e))?;

    let relative_path = format!("scraps/{}.html", scrap_id);
    let dest_full_path = app_dir.join(&relative_path);
    std::fs::write(&dest_full_path, &processed_html).map_err(|e| format!("Falha ao salvar snapshot no disco: {}", e))?;

    let final_size = processed_html.len();
    let now = chrono::Utc::now().to_rfc3339();

    Ok(ScrapPayload {
        id: scrap_id,
        url: final_url,
        title,
        favicon: favicon_base64,
        html_content: processed_html,
        file_size: final_size,
        created_at: now,
        local_path: relative_path,
    })
}

#[tauri::command]
pub async fn scrap_delete_local(scrap_id: String) -> Result<bool, String> {
    let clean_id = scrap_id.trim();
    if clean_id.is_empty() {
        return Ok(true);
    }
    let app_dir = crate::get_app_data_dir();
    let html_path = app_dir.join("scraps").join(format!("{}.html", clean_id));
    let enc_path = app_dir.join("scraps").join(format!("{}.enc", clean_id));

    if html_path.exists() {
        let _ = std::fs::remove_file(html_path);
    }
    if enc_path.exists() {
        let _ = std::fs::remove_file(enc_path);
    }
    Ok(true)
}
