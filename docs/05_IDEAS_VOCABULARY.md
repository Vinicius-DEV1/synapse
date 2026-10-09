# 📋 RFC-001: Contextual Vocabulary Extraction & Spaced Repetition Pipeline

- **Status**: Proposed / In Review
- **Document Version**: 1.0.0
- **Target Modules**: `src/components/library/`, `src/components/anki/`, `src/services/gemini/`
- **Core Dependencies**: Google Gemini 2.0 Flash, FSRS-4.5 Engine, EpubJS / PDF.js

---

## 1. Executive Summary & Problem Statement

Language learners and researchers reading foreign literature in digital formats (EPUB, PDF) frequently look up unknown words and idioms using the built-in AI Dictionary. However, when learners exit the reading modal or finish a chapter, the extracted definitions and vocabulary insights are currently discarded.

**Objective**: Provide a seamless, zero-friction pipeline that enables users to capture looked-up words, AI-generated phonetic transcriptions, definitions, and **their exact sentence context** directly into Caderno's Spaced Repetition (Anki) engine with a single click.

---

## 2. User Experience & Design Ergonomics

```
[ User selects word in EPUB / PDF ]
                 │
                 ▼
     ┌────────────────────────┐
     │  AI Dictionary Modal   │
     │  - IPA Pronunciation   │
     │  - Contextual Sense    │
     │  - Collocations        │
     └───────────┬────────────┘
                 │
                 ▼ Click [ ⭐ Save to Vocabulary Deck ]
     ┌────────────────────────┐
     │  Instant Visual Toast  │ ──► Background FSRS Card Generation
     │  "Saved to Deck"       │ ──► Non-disruptive, reading flow preserved
     └────────────────────────┘
```

1. **Zero Flow Interruption**: Users must never be forced to navigate away from the current page or switch to the Anki deck screen during active reading.
2. **Context Preservation**: The flashcard front contains not just the isolated word, but the sentence in which it appeared, with the target word highlighted.

---

## 3. Architecture Comparison & Trade-Off Analysis

| Architectural Approach | Pros | Cons | Recommendation |
| :--------------------- | :--- | :--- | :------------- |
| **Option A: Dedicated Vocabulary Deck (FSRS)** | Direct integration with daily study reviews; optimal long-term memory retention. | Requires users to periodically review their Anki deck. | **Recommended Core** |
| **Option B: Append to Daily Notes** | Freeform markdown editing; simple append to a "Vocabulary Note". | Lacks spaced repetition scheduling; leads to passive list accumulation. | Secondary Export |
| **Option C: In-Book Interactive Highlight** | Reading context is permanently anchored inside the book via CFI pointers. | Review is localized to the book; inactive once the book is completed. | **Recommended Companion** |

### Decision: The Unified Hybrid Pattern
We adopt **Option A as the primary engine** backed by **Option C as the contextual anchor**:
- The word is added to the user's active Anki study schedule via the FSRS engine.
- An in-book highlight is created in the EPUB/PDF reader, storing the CFI/position so that clicking the highlighted word while reading displays the cached AI definition instantly without re-querying the API.

---

## 4. Proposed Data Model & Schema

### 4.1. TypeScript Contract Interface
```typescript
export interface VocabularyCard {
  readonly id: string;
  readonly word: string;
  readonly language: string;
  readonly phoneticIpa: string;
  readonly definition: string;
  readonly contextualSentence: string;
  readonly collocations: string[];
  readonly bookId: string;
  readonly bookTitle: string;
  readonly locationCfi: string; // EPUB CFI or PDF page index
  readonly fsrsState: {
    stability: number;
    difficulty: number;
    dueDate: number;
    reps: number;
    lapses: number;
    state: 'new' | 'learning' | 'review' | 'relearning';
  };
  readonly createdAt: number;
  readonly updatedAt: number;
}
```

### 4.2. SQLite & IndexedDB Storage Schema
```sql
CREATE TABLE IF NOT EXISTS vocabulary_cards (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    language TEXT NOT NULL,
    phonetic_ipa TEXT,
    definition TEXT NOT NULL,
    contextual_sentence TEXT NOT NULL,
    collocations_json TEXT,
    book_id TEXT NOT NULL,
    book_title TEXT NOT NULL,
    location_cfi TEXT NOT NULL,
    fsrs_stability REAL NOT NULL DEFAULT 0.0,
    fsrs_difficulty REAL NOT NULL DEFAULT 0.0,
    fsrs_due_date INTEGER NOT NULL,
    fsrs_reps INTEGER NOT NULL DEFAULT 0,
    fsrs_lapses INTEGER NOT NULL DEFAULT 0,
    fsrs_state TEXT NOT NULL DEFAULT 'new',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vocab_due ON vocabulary_cards(fsrs_due_date);
CREATE INDEX IF NOT EXISTS idx_vocab_book ON vocabulary_cards(book_id);
```

---

## 5. AI Linguistic Extraction Pipeline

When the user queries the dictionary, the backend or client dispatches a structured prompt to **Google Gemini 2.0 Flash**:

```json
{
  "prompt": "Extract linguistic data for the target word based on the provided context.",
  "parameters": {
    "target_word": "ephemeral",
    "sentence_context": "The beauty of cherry blossoms is ephemeral, lasting only a few days."
  },
  "response_format": "JSON",
  "expected_schema": {
    "word": "ephemeral",
    "phonetic_ipa": "/ɪˈfem.ər.əl/",
    "part_of_speech": "adjective",
    "definition": "Lasting for only a very short time; fleeting.",
    "collocations": ["ephemeral beauty", "ephemeral nature", "ephemeral pleasure"]
  }
}
```

---

## 6. Spaced Repetition (FSRS-4.5) Integration

Upon saving, the vocabulary card is automatically scheduled into the user's review queue:

$$\text{Initial Interval} = I(S, R_{\text{desired}})$$

- Initial stability ($S_0$) and difficulty ($D_0$) are computed from default parameters.
- Review intervals dynamically adapt based on user recall ratings (Again, Hard, Good, Easy) during subsequent review sessions.

---

## 7. Security & Cryptographic Boundaries

- **Zero Plaintext Leakage**: Vocabulary card fields (definitions, sentences, notes) are encrypted using the user's active `anki_key` or `files_key` prior to persistent storage.
- **Offline Resilience**: Saved cards persist locally in SQLite / IndexedDB and synchronize asynchronously across devices using conflict-free state resolution.
