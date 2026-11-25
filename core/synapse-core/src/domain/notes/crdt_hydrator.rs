//! Lightweight Yjs v1 binary update parser that recovers `blockquoteToggle` and `toggleBlock`
//! attributes (`title`, `color`, `isOpen`) when legacy Web React saves wrote empty `data-title=""`
//! into `pages.content` while preserving the real attributes inside `pages.crdt_state`.

use std::collections::{BTreeMap, HashMap};

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct HydratedToggleAttrs {
    pub node_name: String,
    pub title: Option<String>,
    pub color: Option<String>,
    pub is_open: Option<bool>,
}

fn decode_base64(input: &str) -> Option<Vec<u8>> {
    let mut out = Vec::with_capacity(input.len() * 3 / 4);
    let mut buf = 0u32;
    let mut bits = 0u8;
    for b in input.bytes() {
        if b.is_ascii_whitespace() {
            continue;
        }
        if b == b'=' {
            break;
        }
        let val = match b {
            b'A'..=b'Z' => b - b'A',
            b'a'..=b'z' => b - b'a' + 26,
            b'0'..=b'9' => b - b'0' + 52,
            b'+' | b'-' => 62,
            b'/' | b'_' => 63,
            _ => return None,
        } as u32;
        buf = (buf << 6) | val;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push(((buf >> bits) & 0xff) as u8);
        }
    }
    Some(out)
}

struct Cursor<'a> {
    data: &'a [u8],
    pos: usize,
}

impl<'a> Cursor<'a> {
    fn new(data: &'a [u8]) -> Self {
        Self { data, pos: 0 }
    }

    fn read_u8(&mut self) -> Option<u8> {
        let b = *self.data.get(self.pos)?;
        self.pos += 1;
        Some(b)
    }

    fn read_bytes(&mut self, len: usize) -> Option<&'a [u8]> {
        let end = self.pos.checked_add(len)?;
        let slice = self.data.get(self.pos..end)?;
        self.pos = end;
        Some(slice)
    }

    fn read_var_uint(&mut self) -> Option<u64> {
        let mut num = 0u64;
        let mut shift = 0u32;
        loop {
            let b = self.read_u8()?;
            num |= ((b & 0x7f) as u64).checked_shl(shift)?;
            if (b & 0x80) == 0 {
                return Some(num);
            }
            shift += 7;
            if shift > 63 {
                return None;
            }
        }
    }

    fn skip_var_int(&mut self) -> Option<()> {
        let first = self.read_u8()?;
        if (first & 0x80) == 0 {
            return Some(());
        }
        loop {
            let b = self.read_u8()?;
            if (b & 0x80) == 0 {
                return Some(());
            }
        }
    }

    fn read_var_string(&mut self) -> Option<String> {
        let len = self.read_var_uint()? as usize;
        let bytes = self.read_bytes(len)?;
        Some(String::from_utf8_lossy(bytes).into_owned())
    }

    fn read_any_scalar(&mut self) -> Option<AnyScalar> {
        let tag = self.read_u8()?;
        match tag {
            127 | 126 => Some(AnyScalar::Other),
            125 => {
                self.skip_var_int()?;
                Some(AnyScalar::Other)
            }
            124 => {
                self.read_bytes(4)?;
                Some(AnyScalar::Other)
            }
            123 | 122 => {
                self.read_bytes(8)?;
                Some(AnyScalar::Other)
            }
            121 => Some(AnyScalar::Bool(false)),
            120 => Some(AnyScalar::Bool(true)),
            119 => Some(AnyScalar::Str(self.read_var_string()?)),
            118 => {
                let count = self.read_var_uint()? as usize;
                for _ in 0..count {
                    let _ = self.read_var_string()?;
                    let _ = self.read_any_scalar()?;
                }
                Some(AnyScalar::Other)
            }
            117 => {
                let count = self.read_var_uint()? as usize;
                for _ in 0..count {
                    let _ = self.read_any_scalar()?;
                }
                Some(AnyScalar::Other)
            }
            116 => {
                let len = self.read_var_uint()? as usize;
                self.read_bytes(len)?;
                Some(AnyScalar::Other)
            }
            _ => None,
        }
    }
}

#[derive(Debug, Clone)]
enum AnyScalar {
    Str(String),
    Bool(bool),
    Other,
}

#[derive(Debug, Clone)]
struct ParsedItem {
    id: (u64, u64),
    len: u64,
    origin: Option<(u64, u64)>,
    right_origin: Option<(u64, u64)>,
    parent_id: Option<(u64, u64)>,
    parent_sub: Option<String>,
    xml_name: Option<String>,
    any_val: Option<AnyScalar>,
    deleted: bool,
}

/// Extracts non-deleted `blockquoteToggle` and `toggleBlock` attributes from a Yjs Base64 state.
pub fn extract_toggles_from_crdt(crdt_base64: &str) -> Vec<HydratedToggleAttrs> {
    decode_base64(crdt_base64)
        .and_then(|bytes| parse_toggles_from_bytes(&bytes))
        .unwrap_or_default()
}

fn parse_toggles_from_bytes(bytes: &[u8]) -> Option<Vec<HydratedToggleAttrs>> {
    if bytes.len() < 4 {
        return None;
    }
    let mut cur = Cursor::new(bytes);
    let num_clients = cur.read_var_uint()?;

    let mut items = Vec::<ParsedItem>::new();
    for _ in 0..num_clients {
        let num_structs = cur.read_var_uint()?;
        let client = cur.read_var_uint()?;
        let mut clock = cur.read_var_uint()?;

        for _ in 0..num_structs {
            let info = cur.read_u8()?;
            let content_ref = info & 0x1f;
            if content_ref == 0 || content_ref == 10 {
                let len = cur.read_var_uint()?;
                clock += len;
                continue;
            }
            let origin = if (info & 0x80) != 0 {
                Some((cur.read_var_uint()?, cur.read_var_uint()?))
            } else {
                None
            };
            let right_origin = if (info & 0x40) != 0 {
                Some((cur.read_var_uint()?, cur.read_var_uint()?))
            } else {
                None
            };
            let cant_copy_parent = (info & (0x80 | 0x40)) == 0;
            let mut parent_id = None;
            let mut parent_sub = None;
            if cant_copy_parent {
                let parent_info = cur.read_u8()?;
                if parent_info == 1 {
                    let _root_name = cur.read_var_string()?;
                } else {
                    parent_id = Some((cur.read_var_uint()?, cur.read_var_uint()?));
                }
                if (info & 0x20) != 0 {
                    parent_sub = Some(cur.read_var_string()?);
                }
            }

            let mut len = 1u64;
            let mut xml_name = None;
            let mut any_val = None;
            let mut deleted = false;

            match content_ref {
                1 => {
                    len = cur.read_var_uint()?;
                    deleted = true;
                }
                2 => {
                    len = cur.read_var_uint()?;
                    for _ in 0..len {
                        let _ = cur.read_var_string()?;
                    }
                }
                3 => {
                    let blen = cur.read_var_uint()? as usize;
                    cur.read_bytes(blen)?;
                }
                4 => {
                    let s = cur.read_var_string()?;
                    len = (s.encode_utf16().count() as u64).max(1);
                }
                5 => {
                    let _ = cur.read_var_string()?;
                }
                6 => {
                    let _ = cur.read_var_string()?;
                    let _ = cur.read_var_string()?;
                }
                7 => {
                    let type_ref = cur.read_var_uint()?;
                    if type_ref == 3 || type_ref == 4 {
                        xml_name = Some(cur.read_var_string()?);
                    }
                }
                8 => {
                    len = cur.read_var_uint()?;
                    for _ in 0..len {
                        any_val = Some(cur.read_any_scalar()?);
                    }
                }
                9 => {
                    let _ = cur.read_var_string()?;
                    let _ = cur.read_any_scalar()?;
                }
                _ => return None,
            }

            items.push(ParsedItem {
                id: (client, clock),
                len,
                origin,
                right_origin,
                parent_id,
                parent_sub,
                xml_name,
                any_val,
                deleted,
            });
            clock += len;
        }
    }

    // Apply DeleteSet if present at end of update
    if let Some(ds_clients) = cur.read_var_uint() {
        let mut del_ranges = HashMap::<u64, Vec<(u64, u64)>>::new();
        for _ in 0..ds_clients {
            let (Some(client), Some(n_ranges)) = (cur.read_var_uint(), cur.read_var_uint()) else {
                break;
            };
            let entry = del_ranges.entry(client).or_default();
            for _ in 0..n_ranges {
                let (Some(c_start), Some(c_len)) = (cur.read_var_uint(), cur.read_var_uint()) else {
                    break;
                };
                entry.push((c_start, c_start + c_len));
            }
        }
        for item in &mut items {
            if let Some(ranges) = del_ranges.get(&item.id.0) {
                let end = item.id.1 + item.len;
                if ranges.iter().any(|&(rs, re)| item.id.1 < re && end > rs) {
                    item.deleted = true;
                }
            }
        }
    }

    // Resolve inherited parent_id + parent_sub from origin / right_origin
    let mut id_map = HashMap::<(u64, u64), usize>::with_capacity(items.len());
    for (idx, item) in items.iter().enumerate() {
        id_map.insert(item.id, idx);
        if item.len > 1 {
            id_map.insert((item.id.0, item.id.1 + item.len - 1), idx);
        }
    }
    for _pass in 0..8 {
        let mut changed = false;
        for i in 0..items.len() {
            if items[i].parent_id.is_none() && items[i].parent_sub.is_none() {
                let neighbor = items[i].origin.or(items[i].right_origin);
                if let Some(nid) = neighbor {
                    if let Some(&nidx) = id_map.get(&nid) {
                        let np = items[nidx].parent_id;
                        let nsub = items[nidx].parent_sub.clone();
                        if np.is_some() || nsub.is_some() {
                            items[i].parent_id = np;
                            items[i].parent_sub = nsub;
                            changed = true;
                        }
                    }
                }
            }
        }
        if !changed {
            break;
        }
    }

    let mut attr_map = BTreeMap::<(u64, u64), HydratedToggleAttrs>::new();
    let mut order = Vec::<(u64, u64)>::new();
    for item in &items {
        if item.deleted {
            continue;
        }
        if let Some(ref name) = item.xml_name {
            if name == "blockquoteToggle" || name == "toggleBlock" {
                order.push(item.id);
                attr_map.insert(
                    item.id,
                    HydratedToggleAttrs {
                        node_name: name.clone(),
                        ..Default::default()
                    },
                );
            }
        }
    }
    for item in &items {
        if item.deleted {
            continue;
        }
        let (Some(pid), Some(ref sub), Some(ref val)) =
            (item.parent_id, &item.parent_sub, &item.any_val)
        else {
            continue;
        };
        let Some(target) = attr_map.get_mut(&pid) else {
            continue;
        };
        match (sub.as_str(), val) {
            ("title", AnyScalar::Str(s)) => target.title = Some(s.clone()),
            ("color", AnyScalar::Str(s)) => target.color = Some(s.clone()),
            ("isOpen", AnyScalar::Bool(b)) => target.is_open = Some(*b),
            _ => {}
        }
    }

    Some(
        order
            .into_iter()
            .filter_map(|id| attr_map.remove(&id))
            .collect(),
    )
}

fn escape_attr(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn upsert_data_attr(tag: &str, attr_name: &str, value: &str) -> String {
    let escaped = escape_attr(value);
    let pat_dq = format!("{}=\"", attr_name);
    if let Some(pos) = tag.find(&pat_dq) {
        let val_start = pos + pat_dq.len();
        if let Some(end_rel) = tag[val_start..].find('"') {
            let mut out = String::with_capacity(tag.len() + escaped.len());
            out.push_str(&tag[..val_start]);
            out.push_str(&escaped);
            out.push_str(&tag[val_start + end_rel..]);
            return out;
        }
    }
    let close_pos = tag.rfind('>').unwrap_or(tag.len());
    let mut out = String::with_capacity(tag.len() + attr_name.len() + escaped.len() + 4);
    out.push_str(&tag[..close_pos]);
    out.push(' ');
    out.push_str(attr_name);
    out.push_str("=\"");
    out.push_str(&escaped);
    out.push('"');
    out.push_str(&tag[close_pos..]);
    out
}

/// Hydrates missing/empty `data-title`, `data-color`, and `data-is-open` on toggle divs from Yjs CRDT.
pub fn hydrate_html_from_crdt(html: &str, crdt_base64: &str) -> String {
    if crdt_base64.len() <= 8
        || (!html.contains("blockquote-toggle") && !html.contains("toggle-block"))
    {
        return html.to_string();
    }
    let toggles = extract_toggles_from_crdt(crdt_base64);
    if toggles.is_empty() {
        return html.to_string();
    }

    let mut out = String::with_capacity(html.len() + 128);
    let mut pos = 0usize;
    let mut toggle_idx = 0usize;

    while let Some(rel_div) = html[pos..].find("<div") {
        let div_start = pos + rel_div;
        out.push_str(&html[pos..div_start]);
        let Some(rel_gt) = html[div_start..].find('>') else {
            out.push_str(&html[div_start..]);
            return out;
        };
        let div_end = div_start + rel_gt + 1;
        let mut tag = html[div_start..div_end].to_string();

        let is_bqt = tag.contains("blockquote-toggle");
        let is_tb = !is_bqt && tag.contains("toggle-block");
        if (is_bqt || is_tb) && toggle_idx < toggles.len() {
            let hydrated = &toggles[toggle_idx];
            toggle_idx += 1;
            let has_non_empty_title = tag
                .find("data-title=\"")
                .and_then(|p| {
                    let after = &tag[p + 12..];
                    after.find('"').map(|e| !after[..e].is_empty())
                })
                .unwrap_or(false);
            if !has_non_empty_title {
                if let Some(ref t) = hydrated.title {
                    if !t.is_empty() {
                        tag = upsert_data_attr(&tag, "data-title", t);
                    }
                }
            }
            if is_bqt {
                let has_custom_color = tag
                    .find("data-color=\"")
                    .and_then(|p| {
                        let after = &tag[p + 12..];
                        after
                            .find('"')
                            .map(|e| !after[..e].is_empty() && &after[..e] != "default")
                    })
                    .unwrap_or(false);
                if !has_custom_color {
                    if let Some(ref c) = hydrated.color {
                        if !c.is_empty() {
                            tag = upsert_data_attr(&tag, "data-color", c);
                        }
                    }
                }
            }
            if let Some(open) = hydrated.is_open {
                if tag.contains("data-is-open=\"undefined\"") || !tag.contains("data-is-open=\"") {
                    tag = upsert_data_attr(&tag, "data-is-open", if open { "true" } else { "false" });
                }
            }
        }
        out.push_str(&tag);
        pos = div_end;
    }
    out.push_str(&html[pos..]);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hydrates_multi_edited_and_deleted_yjs_toggles() {
        let b64 = "ARHepsOoCQAHAQdkZWZhdWx0AwlwYXJhZ3JhcGgHAN6mw6gJAAYEAN6mw6gJAQVJbnRyb4fepsOoCQADEGJsb2NrcXVvdGVUb2dnbGWH3qbDqAkHAwt0b2dnbGVCbG9ja4fepsOoCQgDEGJsb2NrcXVvdGVUb2dnbGUoAN6mw6gJBwV0aXRsZQF3G1ByaW1laXJvIOKAlCBBdGVuw6fDo28g8J+agCgA3qbDqAkHBWNvbG9yAXcHI2VmNDQ0NCgA3qbDqAkHBmlzT3BlbgF4KADepsOoCQgFdGl0bGUBdw9MaXN0YSBSZWNvbGhpZGEoAN6mw6gJCAZpc09wZW4BeSEA3qbDqAkJBXRpdGxlAajepsOoCQ8BdxZUZXJjZWlybyBDYWxsb3V0IEZpbmFsKADepsOoCQkFY29sb3IBdwcjM2I4MmY2KADepsOoCQkGaXNPcGVuAXjB3qbDqAkA3qbDqAkHAQABAd6mw6gJAg8BEwI=";
        let broken_html = "<p>Intro</p><div data-title=\"\" data-color=\"default\" data-is-open=\"undefined\" class=\"blockquote-toggle\"><p>Body 1</p></div><div data-title=\"\" class=\"toggle-block\"><p>Body 2</p></div><div data-title=\"\" data-color=\"default\" class=\"blockquote-toggle\"><p>Body 3</p></div>";
        let fixed = hydrate_html_from_crdt(broken_html, b64);
        assert!(fixed.contains("data-title=\"Primeiro — Atenção 🚀\""));
        assert!(fixed.contains("data-color=\"#ef4444\""));
        assert!(fixed.contains("data-title=\"Lista Recolhida\""));
        assert!(fixed.contains("data-is-open=\"false\""));
        assert!(fixed.contains("data-title=\"Terceiro Callout Final\""));
        assert!(fixed.contains("data-color=\"#3b82f6\""));
        assert!(!fixed.contains("DELETADO"));
    }
}
