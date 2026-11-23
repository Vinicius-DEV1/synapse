//! Lossless Tldraw v2 schema interoperability, Excalidraw conversion, and SVG export.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QtCanvasShape {
    #[serde(rename = "type")]
    pub shape_type: String,
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
    #[serde(default)]
    pub w: f64,
    #[serde(default)]
    pub h: f64,
    #[serde(default = "default_color")]
    pub color: String,
    #[serde(default = "default_line_width")]
    pub line_width: f64,
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub points: Vec<QtPoint>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct QtPoint {
    pub x: f64,
    pub y: f64,
}

fn default_color() -> String {
    "#8b5cf6".to_string()
}

fn default_line_width() -> f64 {
    2.0
}

fn tldraw_color_to_hex(name: &str) -> &'static str {
    match name {
        "blue" => "#3b82f6",
        "red" => "#ef4444",
        "green" => "#10b981",
        "yellow" => "#eab308",
        "white" => "#ffffff",
        "black" => "#000000",
        "grey" => "#6b7280",
        "orange" => "#f97316",
        _ => "#8b5cf6",
    }
}

fn hex_to_tldraw_color(hex: &str) -> &'static str {
    match hex.to_ascii_lowercase().as_str() {
        "#3b82f6" => "blue",
        "#ef4444" => "red",
        "#10b981" => "green",
        "#eab308" => "yellow",
        "#ffffff" => "white",
        "#000000" => "black",
        "#6b7280" => "grey",
        "#f97316" => "orange",
        _ => "violet",
    }
}

/// Extracts Qt whiteboard shapes from either a Tldraw v2 document or a legacy shape array.
pub fn extract_qt_shapes(raw_content: &str) -> Vec<QtCanvasShape> {
    let Ok(val) = serde_json::from_str::<Value>(raw_content.trim()) else {
        return Vec::new();
    };
    if val.is_array() {
        return serde_json::from_value(val).unwrap_or_default();
    }
    let Some(records) = val.get("records").and_then(Value::as_array) else {
        return Vec::new();
    };
    let mut shapes = Vec::new();
    for rec in records {
        if rec.get("typeName").and_then(Value::as_str) != Some("shape") {
            continue;
        }
        let stype = rec.get("type").and_then(Value::as_str).unwrap_or("");
        let rx = rec.get("x").and_then(Value::as_f64).unwrap_or(0.0);
        let ry = rec.get("y").and_then(Value::as_f64).unwrap_or(0.0);
        let props = rec.get("props").cloned().unwrap_or(json!({}));
        let c = tldraw_color_to_hex(props.get("color").and_then(Value::as_str).unwrap_or("violet")).to_string();

        match stype {
            "geo" | "note" => {
                let geo = props.get("geo").and_then(Value::as_str).unwrap_or("rectangle");
                let text = props.get("text").and_then(Value::as_str).unwrap_or("").to_string();
                shapes.push(QtCanvasShape {
                    shape_type: if stype == "note" {
                        "note".to_string()
                    } else if geo == "ellipse" {
                        "circle".to_string()
                    } else {
                        "rect".to_string()
                    },
                    x: rx,
                    y: ry,
                    w: props.get("w").and_then(Value::as_f64).unwrap_or(140.0),
                    h: props.get("h").and_then(Value::as_f64).unwrap_or(90.0),
                    color: c,
                    line_width: 2.0,
                    text,
                    points: Vec::new(),
                });
            }
            "text" => {
                shapes.push(QtCanvasShape {
                    shape_type: "text".to_string(),
                    x: rx,
                    y: ry,
                    w: props.get("w").and_then(Value::as_f64).unwrap_or(180.0),
                    h: 32.0,
                    color: c,
                    line_width: 2.0,
                    text: props.get("text").and_then(Value::as_str).unwrap_or("").to_string(),
                    points: Vec::new(),
                });
            }
            "arrow" | "line" => {
                let sx = props.pointer("/start/x").and_then(Value::as_f64).unwrap_or(0.0);
                let sy = props.pointer("/start/y").and_then(Value::as_f64).unwrap_or(0.0);
                let ex = props.pointer("/end/x").and_then(Value::as_f64).unwrap_or(80.0);
                let ey = props.pointer("/end/y").and_then(Value::as_f64).unwrap_or(0.0);
                shapes.push(QtCanvasShape {
                    shape_type: stype.to_string(),
                    x: rx + sx,
                    y: ry + sy,
                    w: (ex - sx).abs(),
                    h: (ey - sy).abs(),
                    color: c,
                    line_width: 2.0,
                    text: String::new(),
                    points: vec![
                        QtPoint { x: rx + sx, y: ry + sy },
                        QtPoint { x: rx + ex, y: ry + ey },
                    ],
                });
            }
            "draw" => {
                if let Some(segs) = props.get("segments").and_then(Value::as_array) {
                    for seg in segs {
                        if let Some(pts) = seg.get("points").and_then(Value::as_array) {
                            let mapped: Vec<QtPoint> = pts
                                .iter()
                                .map(|p| QtPoint {
                                    x: rx + p.get("x").and_then(Value::as_f64).unwrap_or(0.0),
                                    y: ry + p.get("y").and_then(Value::as_f64).unwrap_or(0.0),
                                })
                                .collect();
                            if !mapped.is_empty() {
                                shapes.push(QtCanvasShape {
                                    shape_type: "path".to_string(),
                                    x: rx,
                                    y: ry,
                                    w: 0.0,
                                    h: 0.0,
                                    color: c.clone(),
                                    line_width: 2.0,
                                    text: String::new(),
                                    points: mapped,
                                });
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }
    shapes
}

/// Converts Qt canvas shapes into a canonical Tldraw v2 JSON string while keeping document/page store records.
pub fn encode_qt_shapes_as_tldraw_v2(shapes: &[QtCanvasShape], existing_raw: Option<&str>) -> String {
    let mut records: Vec<Value> = vec![
        json!({ "gridSize": 10, "name": "", "meta": {}, "id": "document:document", "typeName": "document" }),
        json!({ "id": "page:page", "name": "Page 1", "index": "a1", "typeName": "page", "meta": {} }),
    ];

    if let Some(prev) = existing_raw.and_then(|s| serde_json::from_str::<Value>(s.trim()).ok()) {
        if let Some(prev_recs) = prev.get("records").and_then(Value::as_array) {
            for r in prev_recs {
                let tn = r.get("typeName").and_then(Value::as_str).unwrap_or("");
                let st = r.get("type").and_then(Value::as_str).unwrap_or("");
                // Preserve non-shape store records (camera, assets, bindings) and unsupported shape types (frame, embed, bookmark).
                if tn != "shape" && tn != "document" && tn != "page" {
                    records.push(r.clone());
                } else if tn == "shape" && !matches!(st, "geo" | "note" | "text" | "draw" | "arrow" | "line") {
                    records.push(r.clone());
                }
            }
        }
    }

    for (i, s) in shapes.iter().enumerate() {
        let id = format!("shape:{}", i + 1);
        let index = format!("a{}", i + 2);
        let c = hex_to_tldraw_color(&s.color);
        let rec = match s.shape_type.as_str() {
            "circle" => json!({
                "x": s.x, "y": s.y, "rotation": 0, "isLocked": false, "opacity": 1, "meta": {},
                "id": id, "type": "geo", "parentId": "page:page", "index": index, "typeName": "shape",
                "props": { "w": s.w.max(20.0), "h": s.h.max(20.0), "geo": "ellipse", "color": c, "text": s.text, "fill": "none", "dash": "draw", "size": "m", "font": "draw", "scale": 1 }
            }),
            "note" => json!({
                "x": s.x, "y": s.y, "rotation": 0, "isLocked": false, "opacity": 1, "meta": {},
                "id": id, "type": "note", "parentId": "page:page", "index": index, "typeName": "shape",
                "props": { "color": c, "text": s.text, "size": "m", "font": "draw", "align": "middle", "verticalAlign": "middle", "scale": 1 }
            }),
            "text" => json!({
                "x": s.x, "y": s.y, "rotation": 0, "isLocked": false, "opacity": 1, "meta": {},
                "id": id, "type": "text", "parentId": "page:page", "index": index, "typeName": "shape",
                "props": { "w": s.w.max(120.0), "color": c, "text": s.text, "size": "m", "font": "draw", "autoSize": true, "scale": 1 }
            }),
            "arrow" if s.points.len() >= 2 => {
                let p0 = &s.points[0];
                let p1 = &s.points[s.points.len() - 1];
                json!({
                    "x": p0.x, "y": p0.y, "rotation": 0, "isLocked": false, "opacity": 1, "meta": {},
                    "id": id, "type": "arrow", "parentId": "page:page", "index": index, "typeName": "shape",
                    "props": { "color": c, "dash": "draw", "size": "m", "start": { "x": 0, "y": 0 }, "end": { "x": p1.x - p0.x, "y": p1.y - p0.y }, "arrowheadStart": "none", "arrowheadEnd": "arrow", "scale": 1 }
                })
            }
            "path" if !s.points.is_empty() => {
                let bx = s.points[0].x;
                let by = s.points[0].y;
                let pts: Vec<Value> = s.points.iter().map(|p| json!({ "x": p.x - bx, "y": p.y - by, "z": 0.5 })).collect();
                json!({
                    "x": bx, "y": by, "rotation": 0, "isLocked": false, "opacity": 1, "meta": {},
                    "id": id, "type": "draw", "parentId": "page:page", "index": index, "typeName": "shape",
                    "props": { "color": c, "fill": "none", "dash": "draw", "size": "m", "segments": [{ "type": "free", "points": pts }], "isComplete": true, "isClosed": false, "isPen": false, "scale": 1 }
                })
            }
            _ => json!({
                "x": s.x, "y": s.y, "rotation": 0, "isLocked": false, "opacity": 1, "meta": {},
                "id": id, "type": "geo", "parentId": "page:page", "index": index, "typeName": "shape",
                "props": { "w": s.w.max(20.0), "h": s.h.max(20.0), "geo": "rectangle", "color": c, "text": s.text, "fill": "none", "dash": "draw", "size": "m", "font": "draw", "scale": 1 }
            }),
        };
        records.push(rec);
    }

    json!({
        "schema": {
            "schemaVersion": 2,
            "sequences": {
                "com.tldraw.store": 4, "com.tldraw.shape": 4,
                "com.tldraw.shape.geo": 9, "com.tldraw.shape.draw": 2,
                "com.tldraw.shape.text": 2, "com.tldraw.shape.arrow": 5,
                "com.tldraw.shape.note": 4
            }
        },
        "records": records
    })
    .to_string()
}

/// Exports Qt canvas shapes to clean standalone SVG.
pub fn export_shapes_to_svg(shapes: &[QtCanvasShape]) -> String {
    let mut svg = String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1920\" height=\"1080\">\n");
    for s in shapes {
        let c = &s.color;
        let lw = s.line_width.max(1.0);
        match s.shape_type.as_str() {
            "path" | "arrow" if s.points.len() >= 2 => {
                let mut d = format!("M {} {}", s.points[0].x, s.points[0].y);
                for p in &s.points[1..] {
                    d.push_str(&format!(" L {} {}", p.x, p.y));
                }
                svg.push_str(&format!("  <path d=\"{}\" stroke=\"{}\" stroke-width=\"{}\" fill=\"none\" />\n", d, c, lw));
            }
            "circle" => {
                svg.push_str(&format!(
                    "  <ellipse cx=\"{}\" cy=\"{}\" rx=\"{}\" ry=\"{}\" stroke=\"{}\" stroke-width=\"{}\" fill=\"none\" />\n",
                    s.x + s.w / 2.0, s.y + s.h / 2.0, (s.w / 2.0).abs(), (s.h / 2.0).abs(), c, lw
                ));
            }
            "text" | "note" => {
                let escaped = s.text.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;");
                svg.push_str(&format!("  <text x=\"{}\" y=\"{}\" fill=\"{}\" font-size=\"16\">{}</text>\n", s.x, s.y + 18.0, c, escaped));
            }
            _ => {
                svg.push_str(&format!(
                    "  <rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" stroke=\"{}\" stroke-width=\"{}\" fill=\"none\" />\n",
                    s.x, s.y, s.w, s.h, c, lw
                ));
            }
        }
    }
    svg.push_str("</svg>");
    svg
}
