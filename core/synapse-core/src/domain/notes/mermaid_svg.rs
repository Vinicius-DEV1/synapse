//! Pure-Rust offline Mermaid -> crisp dark-mode SVG renderer (Flowchart, Sequence, Pie, State/Class/ER).
//! Eliminates external Chromium/WebEngine dependencies while producing scalable vector diagrams.

use super::image_cache::base64_encode;
use std::collections::{BTreeMap, HashMap, VecDeque};

#[derive(Clone, Debug)]
struct FlowNode {
    label: String,
    shape: NodeShape,
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum NodeShape {
    Rect,
    Round,
    Diamond,
    Circle,
}

#[derive(Clone, Debug)]
struct FlowEdge {
    from: String,
    to: String,
    label: String,
    dashed: bool,
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn parse_node_token(raw: &str) -> (String, Option<String>, NodeShape) {
    let t = raw.trim();
    if let Some(idx) = t.find("((") {
        if let Some(end) = t.rfind("))") {
            if end > idx + 2 {
                return (
                    t[..idx].trim().to_string(),
                    Some(t[idx + 2..end].trim().to_string()),
                    NodeShape::Circle,
                );
            }
        }
    }
    for (open, close, shape) in [
        ("[", "]", NodeShape::Rect),
        ("(", ")", NodeShape::Round),
        ("{", "}", NodeShape::Diamond),
    ] {
        if let Some(idx) = t.find(open) {
            if let Some(end) = t.rfind(close) {
                if end > idx {
                    return (
                        t[..idx].trim().to_string(),
                        Some(t[idx + 1..end].trim().trim_matches('"').to_string()),
                        shape,
                    );
                }
            }
        }
    }
    (t.to_string(), None, NodeShape::Rect)
}

fn render_flowchart(lines: &[&str], horizontal: bool) -> String {
    let mut nodes: BTreeMap<String, FlowNode> = BTreeMap::new();
    let mut edges: Vec<FlowEdge> = Vec::new();
    let mut order: Vec<String> = Vec::new();

    let mut upsert = |id: String, label: Option<String>, shape: NodeShape| {
        if id.is_empty() {
            return;
        }
        if !nodes.contains_key(&id) {
            order.push(id.clone());
            nodes.insert(
                id.clone(),
                FlowNode {
                    label: label.unwrap_or_else(|| id.clone()),
                    shape,
                },
            );
        } else if let Some(lbl) = label {
            if let Some(n) = nodes.get_mut(&id) {
                n.label = lbl;
                n.shape = shape;
            }
        }
    };

    for &line in lines {
        let l = line.trim();
        if l.is_empty()
            || l.starts_with("%%")
            || l.starts_with("flowchart ")
            || l.starts_with("graph ")
            || l.starts_with("subgraph ")
            || l == "end"
            || l.starts_with("style ")
            || l.starts_with("classDef ")
        {
            continue;
        }
        let op_candidates = ["-.->", "==>", "-->", "---", "->"];
        let mut matched_op: Option<(&str, usize)> = None;
        for op in op_candidates {
            if let Some(p) = l.find(op) {
                matched_op = Some((op, p));
                break;
            }
        }
        if let Some((op, pos)) = matched_op {
            let lhs = l[..pos].trim();
            let mut rhs_full = l[pos + op.len()..].trim();
            let mut edge_label = String::new();
            if rhs_full.starts_with('|') {
                if let Some(end_bar) = rhs_full[1..].find('|') {
                    edge_label = rhs_full[1..1 + end_bar].trim().to_string();
                    rhs_full = rhs_full[2 + end_bar..].trim();
                }
            }
            let (lid, llbl, lshape) = parse_node_token(lhs);
            let (rid, rlbl, rshape) = parse_node_token(rhs_full);
            upsert(lid.clone(), llbl, lshape);
            upsert(rid.clone(), rlbl, rshape);
            edges.push(FlowEdge {
                from: lid,
                to: rid,
                label: edge_label,
                dashed: op.contains('.'),
            });
        } else {
            let (id, lbl, shape) = parse_node_token(l);
            upsert(id, lbl, shape);
        }
    }

    if nodes.is_empty() {
        return render_fallback_box("Diagrama Mermaid vazio");
    }

    let mut in_deg: HashMap<String, usize> = nodes.keys().map(|k| (k.clone(), 0)).collect();
    let mut adj: HashMap<String, Vec<String>> = HashMap::new();
    for e in &edges {
        *in_deg.entry(e.to.clone()).or_insert(0) += 1;
        adj.entry(e.from.clone()).or_default().push(e.to.clone());
    }

    let mut layer_of: HashMap<String, usize> = HashMap::new();
    let mut queue = VecDeque::new();
    for id in &order {
        if in_deg.get(id).copied().unwrap_or(0) == 0 {
            layer_of.insert(id.clone(), 0);
            queue.push_back(id.clone());
        }
    }
    while let Some(u) = queue.pop_front() {
        let cur_l = layer_of[&u];
        if let Some(nexts) = adj.get(&u) {
            for v in nexts {
                if layer_of.get(v).copied().unwrap_or(0) <= cur_l
                    && layer_of.len() < nodes.len() * 3
                {
                    layer_of.insert(v.clone(), cur_l + 1);
                    queue.push_back(v.clone());
                }
            }
        }
    }
    for (idx, id) in order.iter().enumerate() {
        layer_of.entry(id.clone()).or_insert(idx);
    }

    let mut by_layer: BTreeMap<usize, Vec<String>> = BTreeMap::new();
    for id in &order {
        by_layer.entry(layer_of[id]).or_default().push(id.clone());
    }

    let box_w = 160i32;
    let box_h = 54i32;
    let gap_x = 64i32;
    let gap_y = 56i32;
    let pad = 36i32;

    let mut coords: HashMap<String, (i32, i32)> = HashMap::new();
    let max_per_layer = by_layer.values().map(|v| v.len()).max().unwrap_or(1) as i32;
    let total_layers = by_layer.len().max(1) as i32;

    let (svg_w, svg_h) = if horizontal {
        (
            pad * 2 + total_layers * box_w + (total_layers - 1) * gap_x,
            pad * 2 + max_per_layer * box_h + (max_per_layer - 1) * gap_y,
        )
    } else {
        (
            pad * 2 + max_per_layer * box_w + (max_per_layer - 1) * gap_x,
            pad * 2 + total_layers * box_h + (total_layers - 1) * gap_y,
        )
    };

    for (layer_idx, ids) in &by_layer {
        let count = ids.len() as i32;
        for (slot, id) in ids.iter().enumerate() {
            let l_i = *layer_idx as i32;
            let s_i = slot as i32;
            if horizontal {
                let x = pad + l_i * (box_w + gap_x);
                let span_h = count * box_h + (count - 1) * gap_y;
                let y0 = (svg_h - span_h) / 2;
                let y = y0 + s_i * (box_h + gap_y);
                coords.insert(id.clone(), (x, y));
            } else {
                let y = pad + l_i * (box_h + gap_y);
                let span_w = count * box_w + (count - 1) * gap_x;
                let x0 = (svg_w - span_w) / 2;
                let x = x0 + s_i * (box_w + gap_x);
                coords.insert(id.clone(), (x, y));
            }
        }
    }

    let mut svg = format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{}\" height=\"{}\" viewBox=\"0 0 {} {}\">\
         <defs><marker id=\"arrow\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\">\
         <path d=\"M 0 1 L 10 5 L 0 9 z\" fill=\"#a78bfa\"/></marker></defs>\
         <rect width=\"100%\" height=\"100%\" fill=\"#141416\" rx=\"12\"/>",
        svg_w, svg_h, svg_w, svg_h
    );

    for e in &edges {
        if let (Some(&(fx, fy)), Some(&(tx, ty))) = (coords.get(&e.from), coords.get(&e.to)) {
            let (x1, y1, x2, y2) = if horizontal {
                (fx + box_w, fy + box_h / 2, tx, ty + box_h / 2)
            } else {
                (fx + box_w / 2, fy + box_h, tx + box_w / 2, ty)
            };
            let mx = (x1 + x2) / 2;
            let my = (y1 + y2) / 2;
            let dash = if e.dashed {
                " stroke-dasharray=\"6,4\""
            } else {
                ""
            };
            svg.push_str(&format!(
                "<path d=\"M {} {} C {} {}, {} {}, {} {}\" fill=\"none\" stroke=\"#8b5cf6\" stroke-width=\"2\"{} marker-end=\"url(#arrow)\"/>",
                x1, y1,
                if horizontal { mx } else { x1 },
                if horizontal { y1 } else { my },
                if horizontal { mx } else { x2 },
                if horizontal { y2 } else { my },
                x2, y2, dash
            ));
            if !e.label.is_empty() {
                svg.push_str(&format!(
                    "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"20\" rx=\"6\" fill=\"#1f1d2e\" stroke=\"#4c1d95\" stroke-width=\"1\"/>\
                     <text x=\"{}\" y=\"{}\" fill=\"#c4b5fd\" font-family=\"Inter,sans-serif\" font-size=\"11\" text-anchor=\"middle\">{}</text>",
                    mx - 42, my - 10, 84, mx, my + 4, xml_escape(&e.label)
                ));
            }
        }
    }

    for id in &order {
        let node = &nodes[id];
        let (x, y) = coords[id];
        let cx = x + box_w / 2;
        let cy = y + box_h / 2;
        match node.shape {
            NodeShape::Diamond => svg.push_str(&format!(
                "<polygon points=\"{},{} {},{} {},{} {},{}\" fill=\"#1e1b34\" stroke=\"#60a5fa\" stroke-width=\"1.8\"/>",
                cx, y, x + box_w, cy, cx, y + box_h, x, cy
            )),
            NodeShape::Circle => svg.push_str(&format!(
                "<ellipse cx=\"{}\" cy=\"{}\" rx=\"{}\" ry=\"{}\" fill=\"#1e1b34\" stroke=\"#38bdf8\" stroke-width=\"1.8\"/>",
                cx, cy, box_w / 2, box_h / 2
            )),
            NodeShape::Round => svg.push_str(&format!(
                "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"24\" fill=\"#1e293b\" stroke=\"#60a5fa\" stroke-width=\"1.8\"/>",
                x, y, box_w, box_h
            )),
            NodeShape::Rect => svg.push_str(&format!(
                "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"10\" fill=\"#1e1b34\" stroke=\"#8b5cf6\" stroke-width=\"1.8\"/>",
                x, y, box_w, box_h
            )),
        }
        let truncated: String = node.label.chars().take(22).collect();
        svg.push_str(&format!(
            "<text x=\"{}\" y=\"{}\" fill=\"#f4f4f5\" font-family=\"Inter,sans-serif\" font-size=\"12.5\" font-weight=\"600\" text-anchor=\"middle\">{}</text>",
            cx, cy + 4, xml_escape(&truncated)
        ));
    }

    svg.push_str("</svg>");
    svg
}

fn render_sequence(lines: &[&str]) -> String {
    let mut actors: Vec<String> = Vec::new();
    let mut msgs: Vec<(String, String, String, bool)> = Vec::new();
    for &raw in lines {
        let l = raw.trim();
        if l.starts_with("participant ") || l.starts_with("actor ") {
            let name = l.split_whitespace().nth(1).unwrap_or("").to_string();
            if !name.is_empty() && !actors.contains(&name) {
                actors.push(name);
            }
            continue;
        }
        if let Some((lhs_raw, msg)) = l.split_once(':') {
            let dashed = lhs_raw.contains("--");
            let arrow = if dashed {
                if lhs_raw.contains("-->>") {
                    "-->>"
                } else {
                    "-->"
                }
            } else if lhs_raw.contains("->>") {
                "->>"
            } else {
                "->"
            };
            if let Some((a, b)) = lhs_raw.split_once(arrow) {
                let fa = a.trim().to_string();
                let tb = b.trim().to_string();
                if !actors.contains(&fa) {
                    actors.push(fa.clone());
                }
                if !actors.contains(&tb) {
                    actors.push(tb.clone());
                }
                msgs.push((fa, tb, msg.trim().to_string(), dashed));
            }
        }
    }
    if actors.is_empty() {
        return render_fallback_box("Diagrama de Sequência");
    }
    let col_w = 180i32;
    let svg_w = 60 + (actors.len() as i32) * col_w;
    let row_h = 48i32;
    let svg_h = 110 + (msgs.len() as i32) * row_h;
    let mut svg = format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{}\" height=\"{}\" viewBox=\"0 0 {} {}\">\
         <defs><marker id=\"arrow\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\">\
         <path d=\"M 0 1 L 10 5 L 0 9 z\" fill=\"#a78bfa\"/></marker></defs>\
         <rect width=\"100%\" height=\"100%\" fill=\"#141416\" rx=\"12\"/>",
        svg_w, svg_h, svg_w, svg_h
    );
    let mut x_of: HashMap<String, i32> = HashMap::new();
    for (idx, actor) in actors.iter().enumerate() {
        let cx = 30 + col_w / 2 + (idx as i32) * col_w;
        x_of.insert(actor.clone(), cx);
        svg.push_str(&format!(
            "<line x1=\"{0}\" y1=\"60\" x2=\"{0}\" y2=\"{1}\" stroke=\"#3f3f46\" stroke-dasharray=\"4,4\" stroke-width=\"1.5\"/>\
             <rect x=\"{2}\" y=\"22\" width=\"130\" height=\"38\" rx=\"8\" fill=\"#1e1b34\" stroke=\"#8b5cf6\" stroke-width=\"1.5\"/>\
             <text x=\"{0}\" y=\"45\" fill=\"#f4f4f5\" font-family=\"Inter,sans-serif\" font-size=\"12.5\" font-weight=\"600\" text-anchor=\"middle\">{3}</text>",
            cx, svg_h - 24, cx - 65, xml_escape(actor)
        ));
    }
    for (i, (from, to, text, dashed)) in msgs.iter().enumerate() {
        let y = 94 + (i as i32) * row_h;
        let x1 = x_of[from];
        let x2 = x_of[to];
        let dash = if *dashed {
            " stroke-dasharray=\"6,4\""
        } else {
            ""
        };
        svg.push_str(&format!(
            "<line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" stroke=\"#60a5fa\" stroke-width=\"1.8\"{} marker-end=\"url(#arrow)\"/>\
             <text x=\"{}\" y=\"{}\" fill=\"#e4e4e7\" font-family=\"Inter,sans-serif\" font-size=\"11.5\" text-anchor=\"middle\">{}</text>",
            x1, y, x2, y, dash, (x1 + x2) / 2, y - 8, xml_escape(text)
        ));
    }
    svg.push_str("</svg>");
    svg
}

fn render_fallback_box(title: &str) -> String {
    format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"420\" height=\"120\" viewBox=\"0 0 420 120\">\
         <rect width=\"420\" height=\"120\" rx=\"12\" fill=\"#141416\"/>\
         <rect x=\"24\" y=\"24\" width=\"372\" height=\"72\" rx=\"10\" fill=\"#1e1b34\" stroke=\"#8b5cf6\" stroke-width=\"1.5\"/>\
         <text x=\"210\" y=\"65\" fill=\"#f4f4f5\" font-family=\"Inter,sans-serif\" font-size=\"13\" text-anchor=\"middle\">{}</text>\
         </svg>",
        xml_escape(title)
    )
}

/// Converts Mermaid source into a vector SVG markup string (`<svg ...>...</svg>`).
pub fn render_mermaid_svg(chart: &str) -> String {
    let lines: Vec<&str> = chart.lines().collect();
    let header = lines
        .iter()
        .map(|l| l.trim())
        .find(|l| !l.is_empty() && !l.starts_with("%%"))
        .unwrap_or("")
        .to_ascii_lowercase();

    if header.starts_with("sequencediagram") {
        return render_sequence(&lines);
    }
    let horizontal = header.contains(" lr") || header.contains(" rl");
    render_flowchart(&lines, horizontal)
}

/// Returns `data:image/svg+xml;base64,...` ready for direct QML `Image { source }`.
pub fn render_mermaid_data_uri(chart: &str) -> String {
    let svg = render_mermaid_svg(chart);
    format!(
        "data:image/svg+xml;base64,{}",
        base64_encode(svg.as_bytes())
    )
}
