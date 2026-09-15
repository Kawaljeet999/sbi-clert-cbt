## Corpus mix normalized to one 20-minute section

Empirical composition of the canonical VERIFIED bank, normalized to one official-sized section. This is not an official SBI shift quota.
### Quant
- Miscellaneous: **2.0 / section**
- Arithmetic: **16.4 / section**
- DI: **5.9 / section**
- Number Series: **1.8 / section**
- Quadratic Equation: **2.9 / section**
- Simplification / Approximation: **6.1 / section**

### Reasoning
- Puzzles & Seating: **22.8 / section**
- Syllogism: **6.2 / section**
- Miscellaneous: **0.6 / section**
- Alphanumeric / Series: **0.1 / section**
- Coding-Decoding: **0.2 / section**
- Blood Relation: **2.7 / section**
- Direction & Distance: **2.5 / section**

### English
- Grammar / Usage: **6.3 / section**
- Reading Comprehension: **10.6 / section**
- Vocabulary: **0.2 / section**
- Para Jumble / Rearrangement: **5.7 / section**
- Word Swap / Usage: **0.8 / section**
- Error Detection: **2.9 / section**
- Fillers: **3.3 / section**
- Phrase/Sentence Replacement: **0.2 / section**

## CBT paper construction rule
The implementation uses the uploaded 20-minute blueprint: English 30, Quant 35, Reasoning 35; +1 correct, -0.25 wrong, 0 unattempted, with independent 20-minute section timers.

For random practice, the generator uses configurable topic quotas. It does **not** claim the topic ranges are official; they are the supplied practice-design ranges. A generated paper is rejected if a requested topic quota cannot be filled from VERIFIED questions.

## Important exclusions / quarantine
- Question-only PDFs without an authoritative source answer are not promoted into the live CBT bank.
- Mains and trend-analysis documents are excluded from the Prelims bank.
- Image/table-dependent questions are retained only when their extracted representation is sufficient; otherwise they remain quarantined for visual/manual review.
- Duplicate questions are canonicalized with all source provenance retained.
- Conflicting later-source answers do not overwrite the first/earliest canonical source answer.

## Source-of-truth rule
The CBT reads only `question-bank/verified_questions.json`. It never computes answers from question text, never parses PDFs, and never calls an API at test time.