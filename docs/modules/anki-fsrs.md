# 🧠 Synapse Anki & Cognitive Spaced Repetition (FSRS) — Technical Specification

The **Synapse Spaced Repetition Engine** provides an advanced active recall study environment powered by the modern **Free Spaced Repetition Scheduler (FSRS)** algorithm (`ts-fsrs` v5) and contextual **Google Gemini AI** flashcard synthesis.

---

## 1. Architectural Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                     SYNAPSE SPACED REPETITION ENGINE                   │
├────────────────────────────────────────────────────────────────────────┤
│  COGNITIVE SCHEDULING (FSRS v5)                                        │
│  Difficulty (D)  •  Stability (S)  •  Retrievability (R)               │
├────────────────────────────────────────────────────────────────────────┤
│  STUDY WORKFLOWS                                                       │
│  Deck Management  •  Review Session (1-4 Keys)  •  Retention Analytics │
├────────────────────────────────────────────────────────────────────────┤
│  AI SYNTHESIS (GEMINI API)                                             │
│  Note-to-Card Distillation  •  Video Transcript Parsing  •  Cloze Cards│
├────────────────────────────────────────────────────────────────────────┤
│  PERSISTENCE & SECURITY                                                │
│  SQLite (`anki_cards`)  •  IndexedDB  •  AES-256-GCM (`anki_key`)       │
└────────────────────────────────────────────────────────────────────────┘
```

- **Source Code Locations**:
  - UI Presentation: `src/components/anki/`
  - FSRS Scheduling Core: `src/services/fsrs.ts`
  - Rust Tauri Backend: `src-tauri/src/anki_fsrs.rs`, `src-tauri/src/cmd_anki.rs`

---

## 2. FSRS vs. Legacy SM-2: The Cognitive Advantage

Traditional spaced repetition software (such as classic Anki) relies on the **SM-2 algorithm** developed in 1987. SM-2 uses a simplistic "Ease Factor" heuristic that often causes "Ease Hell" (uncontrollable card review accumulation).

Synapse implements **FSRS (Free Spaced Repetition Scheduler)** based on the modern **Three-Component Model of Memory (DSR)**:

| Metric | Legacy SM-2 (1987) | Synapse FSRS (Modern) | Advantage |
| :----- | :----------------- | :-------------------- | :-------- |
| **Cognitive Modeling** | Fixed Ease Factor multipliers | 3-factor dynamic system ($D, S, R$) | Accurately models real human memory decay. |
| **Target Retention** | Rigid and unconfigurable | Dynamically configurable (e.g. 90% retention target) | Optimizes daily review load without under- or over-studying. |
| **Review Fatigue** | Prone to "Ease Hell" card backlogs | ~20–30% fewer daily reviews for identical recall rates | Eliminates burnout during intensive exam preparation. |
| **First Review Interval** | Hardcoded (1 day, 6 days) | Dynamically computed from initial difficulty rating | Tailored interval based on card complexity. |

---

## 3. The DSR Mathematical Model

FSRS models memory using three interdependent variables:

1. **Difficulty ($D \in [1, 10]$)**: Represents how inherently challenging an item is to memorize.
2. **Stability ($S > 0$)**: The time (in days) required for the probability of recall to decrease from 100% to 90%.
3. **Retrievability ($R \in [0, 1]$)**: The current probability that the user will successfully recall the card today:

$$R(t, S) = \left( 1 + \text{FACTOR} \times \frac{t}{S} \right)^{\text{DECAY}}$$

Where $t$ is the elapsed time in days since the last review.

### Review Rating Responses:
During an active review session, users grade their recall using four intuitive responses:
- **`[1] Again`**: Complete failure to recall; triggers immediate relearning cycle.
- **`[2] Hard`**: Successful recall with significant effort; stabilizes memory with conservative interval growth.
- **`[3] Good`**: Successful recall with normal cognitive effort; optimal interval progression.
- **`[4] Easy`**: Immediate, effortless recall; accelerates stability growth and extends review interval.

---

## 4. AI-Powered Flashcard Synthesis (Google Gemini)

Synapse bridges passive reading with active recall through automated AI flashcard generation:

1. **Note-to-Deck Distillation**: Select any section or page in **Synapse Notes** to generate high-yield Question-Answer flashcards and Cloze deletion cards.
2. **Video & Lecture Extraction**: Transcribe and analyze foreign-language dialogue or technical lectures in the **Culture Studio**, automatically generating vocabulary flashcards with embedded sentence context.
3. **Linguistic Schema Validation**: AI outputs conform strictly to typed JSON schemas, validating card prompts, answers, and tags before adding them to the user's study queue.

---

## 5. Deck Organization & Performance Heatmaps

- **Hierarchical Deck Tagging**: Filter and review cards by subject, priority, or project tag.
- **Retention Analytics**: Visual heatmaps display review density and projected memory stability over 30, 60, and 90-day horizons.
- **Zero-Knowledge Encryption**: Flashcard prompts, answers, and review histories are encrypted at rest using the dedicated `anki_key`.
