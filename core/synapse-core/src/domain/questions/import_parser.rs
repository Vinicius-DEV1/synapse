//! Quiz batch importer: parses structured JSON or Markdown/text quiz blocks into canonical questions.

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ParsedImportQuestion {
    pub question: String,
    pub options: Vec<String>,
    pub correct_index: i32,
    pub question_type: String,
    pub expected_answer: String,
    pub explanation: String,
    pub tags: Vec<String>,
}

fn strip_option_prefix(s: &str) -> String {
    let trimmed = s.trim();
    let bytes = trimmed.as_bytes();
    if bytes.len() >= 3
        && bytes[0].is_ascii_alphanumeric()
        && (bytes[1] == b')' || bytes[1] == b'.')
        && bytes[2] == b' '
    {
        return trimmed[3..].trim().to_string();
    }
    trimmed.to_string()
}

fn parse_correct_index(val: Option<&Value>, options: &[String]) -> i32 {
    let Some(v) = val else {
        return 0;
    };
    if let Some(n) = v.as_i64() {
        let idx = if !options.is_empty() && n as usize == options.len() {
            n - 1
        } else {
            n.max(0)
        };
        return idx.clamp(0, (options.len().saturating_sub(1)) as i64) as i32;
    }
    if let Some(s) = v.as_str() {
        let t = s.trim();
        if let Ok(n) = t.parse::<i64>() {
            let idx = if !options.is_empty() && n as usize == options.len() {
                n - 1
            } else {
                n.max(0)
            };
            return idx.clamp(0, (options.len().saturating_sub(1)) as i64) as i32;
        }
        let upper = t.to_ascii_uppercase();
        let letter_opt = upper
            .strip_prefix("OPÇÃO ")
            .or_else(|| upper.strip_prefix("OPCAO "))
            .or_else(|| upper.strip_prefix("ALTERNATIVA "))
            .or_else(|| upper.strip_prefix("GABARITO:"))
            .or_else(|| upper.strip_prefix("GABARITO "))
            .unwrap_or(&upper)
            .trim()
            .chars()
            .next();
        if let Some(ch @ 'A'..='E') = letter_opt {
            let rest_ok = t.len() == 1 || t.contains(')') || t.contains('.') || t.contains(' ');
            if rest_ok {
                let idx = (ch as i32) - ('A' as i32);
                if (idx as usize) < options.len().max(5) {
                    return idx.min(options.len().saturating_sub(1) as i32);
                }
            }
        }
        if let Some(found) = options.iter().position(|o| o.eq_ignore_ascii_case(t)) {
            return found as i32;
        }
    }
    0
}

fn parse_json_value(val: &Value) -> Option<Vec<ParsedImportQuestion>> {
    let items: &[Value] = if let Some(arr) = val.as_array() {
        arr
    } else if let Some(arr) = val.get("questions").and_then(Value::as_array) {
        arr
    } else if val.is_object() {
        std::slice::from_ref(val)
    } else {
        return None;
    };

    let mut out = Vec::new();
    for item in items {
        let Some(obj) = item.as_object() else {
            continue;
        };
        let q_text = ["question", "enunciado", "pergunta", "texto", "statement", "titulo"]
            .iter()
            .find_map(|k| obj.get(*k).and_then(Value::as_str))
            .unwrap_or("")
            .trim()
            .to_string();
        if q_text.is_empty() {
            continue;
        }

        let raw_type = obj
            .get("type")
            .or_else(|| obj.get("tipo"))
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_ascii_lowercase();
        let is_open = raw_type.contains("open")
            || raw_type.contains("aberta")
            || raw_type.contains("discursiva")
            || raw_type.contains("dissertativa");

        let mut options = Vec::new();
        let raw_opts = obj
            .get("options")
            .or_else(|| obj.get("alternativas"))
            .or_else(|| obj.get("opcoes"))
            .or_else(|| obj.get("alternatives"));
        if let Some(arr) = raw_opts.and_then(Value::as_array) {
            for o in arr {
                let s = o
                    .as_str()
                    .or_else(|| o.get("text").and_then(Value::as_str))
                    .or_else(|| o.get("texto").and_then(Value::as_str))
                    .unwrap_or("");
                let clean = strip_option_prefix(s);
                if !clean.is_empty() {
                    options.push(clean);
                }
            }
        }
        if !is_open && options.len() < 2 {
            options = vec!["".into(), "".into(), "".into(), "".into()];
        }

        let correct_val = obj
            .get("correct_option")
            .or_else(|| obj.get("correct_index"))
            .or_else(|| obj.get("correctIndex"))
            .or_else(|| obj.get("resposta_correta"))
            .or_else(|| obj.get("gabarito"))
            .or_else(|| obj.get("answer"));
        let correct_index = parse_correct_index(correct_val, &options);

        let tags = match obj.get("tags").or_else(|| obj.get("topicos")) {
            Some(Value::Array(arr)) => arr
                .iter()
                .filter_map(Value::as_str)
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect(),
            Some(Value::String(s)) => s
                .split(',')
                .map(|p| p.trim().to_string())
                .filter(|p| !p.is_empty())
                .collect(),
            _ => Vec::new(),
        };

        let expected_answer = ["expected_answer", "expectedAnswer", "resposta_esperada", "gabarito"]
            .iter()
            .find_map(|k| obj.get(*k).and_then(Value::as_str))
            .unwrap_or("")
            .trim()
            .to_string();
        let explanation = ["explanation", "explicacao", "justificativa", "comentario"]
            .iter()
            .find_map(|k| obj.get(*k).and_then(Value::as_str))
            .unwrap_or("")
            .trim()
            .to_string();

        out.push(ParsedImportQuestion {
            question: q_text,
            options,
            correct_index,
            question_type: if is_open { "open" } else { "multiple_choice" }.to_string(),
            expected_answer,
            explanation,
            tags,
        });
    }
    Some(out)
}

fn parse_markdown_blocks(raw: &str) -> Vec<ParsedImportQuestion> {
    let mut results = Vec::new();
    let mut cur_q = String::new();
    let mut cur_opts: Vec<String> = Vec::new();
    let mut cur_ans: Option<i32> = None;
    let mut cur_exp = String::new();
    let mut cur_tags: Vec<String> = Vec::new();

    let flush = |q: &mut String,
                 opts: &mut Vec<String>,
                 ans: &mut Option<i32>,
                 exp: &mut String,
                 tags: &mut Vec<String>,
                 out: &mut Vec<ParsedImportQuestion>| {
        let qt = q.trim().to_string();
        if !qt.is_empty() {
            let is_open = opts.len() < 2;
            out.push(ParsedImportQuestion {
                question: qt,
                options: if is_open { Vec::new() } else { opts.clone() },
                correct_index: ans.unwrap_or(0).clamp(0, opts.len().saturating_sub(1) as i32),
                question_type: if is_open { "open" } else { "multiple_choice" }.to_string(),
                expected_answer: if is_open { exp.trim().to_string() } else { String::new() },
                explanation: exp.trim().to_string(),
                tags: tags.clone(),
            });
        }
        q.clear();
        opts.clear();
        *ans = None;
        exp.clear();
        tags.clear();
    };

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if !cur_q.is_empty() && (!cur_opts.is_empty() || !cur_exp.is_empty()) {
                flush(&mut cur_q, &mut cur_opts, &mut cur_ans, &mut cur_exp, &mut cur_tags, &mut results);
            }
            continue;
        }
        let upper = trimmed.to_ascii_uppercase();
        if upper.starts_with("GABARITO:") || upper.starts_with("RESPOSTA:") || upper.starts_with("ANSWER:") {
            let after = trimmed.split_once(':').map(|x| x.1.trim()).unwrap_or("");
            if let Some(ch @ 'A'..='E') = after.to_ascii_uppercase().chars().next() {
                cur_ans = Some((ch as i32) - ('A' as i32));
            }
            continue;
        }
        if upper.starts_with("EXPLICAÇÃO:") || upper.starts_with("EXPLICACAO:") || upper.starts_with("JUSTIFICATIVA:") {
            let after = trimmed.split_once(':').map(|x| x.1.trim()).unwrap_or("");
            cur_exp.push_str(after);
            continue;
        }
        if upper.starts_with("TAGS:") {
            let after = trimmed.split_once(':').map(|x| x.1).unwrap_or("");
            cur_tags = after
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            continue;
        }
        let b = trimmed.as_bytes();
        if b.len() >= 3 && matches!(b[0], b'A'..=b'E' | b'a'..=b'e') && (b[1] == b')' || b[1] == b'.') && b[2] == b' ' {
            let mut opt_text = trimmed[3..].trim().to_string();
            if let Some(stripped) = opt_text.strip_suffix('*').or_else(|| opt_text.strip_suffix("[correta]")) {
                cur_ans = Some(cur_opts.len() as i32);
                opt_text = stripped.trim().to_string();
            }
            cur_opts.push(opt_text);
            continue;
        }
        if cur_q.is_empty() {
            let q_clean = trimmed
                .trim_start_matches(|c: char| c.is_ascii_digit() || c == '.' || c == ')' || c == ' ')
                .trim();
            cur_q = if q_clean.is_empty() { trimmed.to_string() } else { q_clean.to_string() };
        } else if cur_opts.is_empty() {
            cur_q.push('\n');
            cur_q.push_str(trimmed);
        }
    }
    flush(&mut cur_q, &mut cur_opts, &mut cur_ans, &mut cur_exp, &mut cur_tags, &mut results);
    results
}

/// Parses JSON arrays/objects or structured Markdown quiz text into canonical questions.
pub fn parse_import_questions(raw_text: &str) -> Vec<ParsedImportQuestion> {
    let cleaned = raw_text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    if let Ok(val) = serde_json::from_str::<Value>(cleaned) {
        if let Some(parsed) = parse_json_value(&val) {
            if !parsed.is_empty() {
                return parsed;
            }
        }
    }
    parse_markdown_blocks(cleaned)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_structured_markdown_questions() {
        let input = "1. Qual linguagem alimenta o core?\nA) Python\nB) Rust*\nC) Ruby\nExplicação: Zero-cost abstractions.\nTags: core, rust";
        let qs = parse_import_questions(input);
        assert_eq!(qs.len(), 1);
        assert_eq!(qs[0].options, vec!["Python", "Rust", "Ruby"]);
        assert_eq!(qs[0].correct_index, 1);
        assert_eq!(qs[0].tags, vec!["core", "rust"]);
    }

    #[test]
    fn parses_json_question_array() {
        let input = r#"[{"question": "2+2?", "options": ["3", "4"], "correct_index": 1}]"#;
        let qs = parse_import_questions(input);
        assert_eq!(qs.len(), 1);
        assert_eq!(qs[0].correct_index, 1);
    }
}
