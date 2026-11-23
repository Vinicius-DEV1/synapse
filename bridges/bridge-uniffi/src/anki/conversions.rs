use super::models::{AnkiCardRecord, AnkiDeckRecord, AnkiSettingsRecord, AnkiStatsRecord};
use synapse_core::domain::anki::{AnkiDeckSettings, Card, GlobalAnkiStats, HierarchicalDeck};

impl From<HierarchicalDeck> for AnkiDeckRecord {
    fn from(value: HierarchicalDeck) -> Self {
        Self {
            id: value.id,
            name: value.name,
            description: value.description,
            color: value.color,
            parent_id: value.parent_id,
            depth: value.depth,
            has_children: value.has_children,
            children_count: value.children_count,
            card_count: value.card_count,
            new_count: value.novos,
            learning_count: value.aprender,
            review_count: value.revisar,
        }
    }
}

impl From<Card> for AnkiCardRecord {
    fn from(value: Card) -> Self {
        Self {
            id: value.id,
            deck_id: value.deck_id,
            front: value.front,
            back: value.back,
            tags: value.tags,
            card_type: value.card_type,
            extra_note: value.extra_note,
            stability: value.stability.unwrap_or_default(),
            difficulty: value.difficulty.unwrap_or_default(),
            reps: value.reps.unwrap_or_default(),
            lapses: value.lapses.unwrap_or_default(),
            learning_steps: value.learning_steps.unwrap_or_default(),
            state: value.state,
            due_date: value.due_date,
            created_at: value.created_at,
        }
    }
}

impl From<AnkiDeckSettings> for AnkiSettingsRecord {
    fn from(value: AnkiDeckSettings) -> Self {
        Self {
            new_limit: value.new_limit,
            review_limit: value.review_limit,
            learning_steps: value.learning_steps,
            relearning_steps: value.relearning_steps,
            fsrs_weights: value.fsrs_weights,
        }
    }
}

impl From<AnkiSettingsRecord> for AnkiDeckSettings {
    fn from(value: AnkiSettingsRecord) -> Self {
        Self {
            new_limit: value.new_limit,
            review_limit: value.review_limit,
            learning_steps: value.learning_steps,
            relearning_steps: value.relearning_steps,
            fsrs_weights: value.fsrs_weights,
        }
    }
}

impl From<GlobalAnkiStats> for AnkiStatsRecord {
    fn from(value: GlobalAnkiStats) -> Self {
        Self {
            total_cards: value.total_cards,
            new_count: value.novos,
            learning_count: value.aprendendo,
            mature_count: value.maduros,
            young_count: value.jovens,
            total_reviews: value.total_reviews,
            again_count: value.errei,
            hard_count: value.dificil,
            good_count: value.bom,
            easy_count: value.facil,
            retention_rate: value.retention_rate,
        }
    }
}
