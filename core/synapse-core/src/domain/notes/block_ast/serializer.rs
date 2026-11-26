//! Lossless block AST -> canonical TipTap HTML serializer.

use super::helpers::html_escape_attr;
use super::NoteBlock;

/// Serializes edited blocks back to canonical TipTap HTML preserving all data-* attrs.
pub fn serialize_note_blocks(blocks: &[NoteBlock]) -> String {
    let mut out = String::new();
    for block in blocks {
        match block.block_type.as_str() {
            "richText" => {
                if !block.html.trim().is_empty() {
                    out.push_str(&block.html);
                }
            }
            "mermaidBlock" => {
                let code = block.attrs.get("code").cloned().unwrap_or_default();
                out.push_str("<pre><code class=\"language-mermaid\">");
                out.push_str(&html_escape_attr(&code));
                out.push_str("</code></pre>");
            }
            "codeBlock" => {
                let lang = block
                    .attrs
                    .get("language")
                    .or_else(|| block.attrs.get("data-language"))
                    .map(String::as_str)
                    .unwrap_or("plaintext")
                    .trim();
                let safe_lang = if lang.is_empty() { "plaintext" } else { lang };
                let code = block.attrs.get("code").cloned().unwrap_or_default();
                out.push_str(&format!(
                    "<pre><code class=\"language-{}\">{}</code></pre>",
                    html_escape_attr(safe_lang),
                    html_escape_attr(&code)
                ));
            }
            "blockquote" => {
                let color = block
                    .attrs
                    .get("data-color")
                    .or_else(|| block.attrs.get("color"))
                    .map(String::as_str)
                    .unwrap_or("default")
                    .trim();
                if color.is_empty() || color == "default" {
                    out.push_str("<blockquote>");
                } else {
                    let esc = html_escape_attr(color);
                    out.push_str(&format!(
                        "<blockquote data-color=\"{0}\" style=\"background-color: {0}15 !important; border-left-color: {0} !important;\">",
                        esc
                    ));
                }
                out.push_str(&block.inner_html);
                out.push_str("</blockquote>");
            }
            "imageBlock" => {
                out.push_str("<img");
                for (k, v) in &block.attrs {
                    if k == "_tag" {
                        continue;
                    }
                    out.push_str(&format!(" {}=\"{}\"", k, html_escape_attr(v)));
                }
                out.push_str("/>");
            }
            _ => {
                let tag = block
                    .attrs
                    .get("_tag")
                    .map(String::as_str)
                    .filter(|t| !t.is_empty())
                    .unwrap_or_else(|| match block.block_type.as_str() {
                        "focusWidget"
                        | "alarmWidget"
                        | "habitWidget"
                        | "calendarEventWidget"
                        | "mediaWidget" => "span",
                        "encryptedImage" => "encrypted-image",
                        _ => "div",
                    });
                if block.attrs.is_empty() && !block.html.trim().is_empty() {
                    out.push_str(&block.html);
                    continue;
                }
                out.push('<');
                out.push_str(tag);
                for (k, v) in &block.attrs {
                    if k == "_tag" {
                        continue;
                    }
                    out.push_str(&format!(" {}=\"{}\"", k, html_escape_attr(v)));
                }
                out.push('>');
                out.push_str(&block.inner_html);
                out.push_str("</");
                out.push_str(tag);
                out.push('>');
            }
        }
    }
    out
}
