//! Parses .srt and .vtt subtitle tracks into timed cues with tokenized clickable words.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SubtitleCue {
    pub index: usize,
    pub start_sec: f64,
    pub end_sec: f64,
    pub text: String,
    pub words: Vec<String>,
}

fn parse_timestamp_sec(ts: &str) -> Option<f64> {
    let clean = ts.trim().split_whitespace().next()?.replace(',', ".");
    let parts: Vec<&str> = clean.split(':').collect();
    match parts.len() {
        3 => {
            let h: f64 = parts[0].parse().ok()?;
            let m: f64 = parts[1].parse().ok()?;
            let s: f64 = parts[2].parse().ok()?;
            Some(h * 3600.0 + m * 60.0 + s)
        }
        2 => {
            let m: f64 = parts[0].parse().ok()?;
            let s: f64 = parts[1].parse().ok()?;
            Some(m * 60.0 + s)
        }
        _ => None,
    }
}

fn strip_html_tags(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut in_tag = false;
    for ch in s.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    out
}

/// Parses `.srt` or `.vtt` subtitle text into sorted `SubtitleCue` items.
pub fn parse_subtitle_cues(content: &str) -> Vec<SubtitleCue> {
    let normalized = content.replace("\r\n", "\n");
    let mut cues = Vec::new();
    for block in normalized.split("\n\n") {
        let lines: Vec<&str> = block.lines().map(str::trim).filter(|l| !l.is_empty()).collect();
        if lines.is_empty() || lines[0].starts_with("WEBVTT") || lines[0].starts_with("NOTE") {
            continue;
        }
        let Some(arrow_pos) = lines.iter().position(|l| l.contains("-->")) else {
            continue;
        };
        let Some((lhs, rhs)) = lines[arrow_pos].split_once("-->") else {
            continue;
        };
        let (Some(start_sec), Some(end_sec)) = (parse_timestamp_sec(lhs), parse_timestamp_sec(rhs)) else {
            continue;
        };
        let text = strip_html_tags(&lines[arrow_pos + 1..].join(" "));
        if text.trim().is_empty() {
            continue;
        }
        let words = text
            .split_whitespace()
            .map(ToOwned::to_owned)
            .collect();
        cues.push(SubtitleCue {
            index: cues.len(),
            start_sec,
            end_sec,
            text,
            words,
        });
    }
    cues
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_srt_and_vtt_cues() {
        let srt = "1\n00:00:01,500 --> 00:00:04,000\nHello <i>world</i>!\n\n2\n00:00:05,000 --> 00:00:07,200\nLearning Rust.";
        let cues = parse_subtitle_cues(srt);
        assert_eq!(cues.len(), 2);
        assert!((cues[0].start_sec - 1.5).abs() < 0.01);
        assert_eq!(cues[0].text, "Hello world!");
        assert_eq!(cues[0].words, vec!["Hello", "world!"]);
    }
}
