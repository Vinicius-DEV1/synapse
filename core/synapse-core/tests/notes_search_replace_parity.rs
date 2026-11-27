use serde::Deserialize;
use synapse_core::domain::notes::{apply_search_replace, parse_search_replace_blocks};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Fixture {
    parse_cases: Vec<ParseCase>,
    apply_cases: Vec<ApplyCase>,
}

#[derive(Deserialize)]
struct ParseCase {
    name: String,
    proposal: String,
    blocks: Vec<Block>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApplyCase {
    name: String,
    source: String,
    proposal: String,
    success: bool,
    result: String,
    replaced_count: usize,
    error: Option<String>,
}

#[derive(Deserialize, PartialEq, Debug)]
struct Block {
    search: String,
    replace: String,
}

#[test]
fn shared_react_parity_fixtures_match() {
    let fixture: Fixture =
        serde_json::from_str(include_str!("fixtures/notes_search_replace_parity.json"))
            .expect("shared fixture JSON should be valid");

    for case in fixture.parse_cases {
        let actual = parse_search_replace_blocks(&case.proposal);
        let actual: Vec<Block> = actual
            .into_iter()
            .map(|block| Block {
                search: block.search,
                replace: block.replace,
            })
            .collect();
        assert_eq!(actual, case.blocks, "parse fixture: {}", case.name);
    }

    for case in fixture.apply_cases {
        let blocks = parse_search_replace_blocks(&case.proposal);
        let result = apply_search_replace(&case.source, &blocks);
        assert_eq!(result.success, case.success, "success: {}", case.name);
        assert_eq!(result.result, case.result, "result: {}", case.name);
        assert_eq!(
            result.replaced_count, case.replaced_count,
            "replaced count: {}",
            case.name
        );
        assert_eq!(result.error, case.error, "error: {}", case.name);
    }
}
