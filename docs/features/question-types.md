# Feature: Question types

Every question has a type (`question_type`), defaulting to `single_select` — the platform's original and still most common shape. Three additional types exist: `multi_select`, `true_false`, and `short_answer`. A test can freely mix types across its questions.

## Single Select (the default, unchanged)

The original MCQ shape: 2–6 options, exactly one marked correct, radio-button selection. Nothing about this type changed when the other three were added — a pre-existing test with only single-select questions behaves identically to before.

## Multi Select

Same option-list shape as single-select, but any number of options can be marked correct, and students select via checkboxes (any number, not mutually exclusive). **Grading is exact-set-match**: a student's answer is correct only if the set of options they selected is *exactly* the set marked correct — selecting some-but-not-all correct options, or any incorrect option alongside correct ones, scores as wrong. There is no partial credit today.

## True / False

A thin convenience wrapper over single-select's existing two-option shape, not a distinct data model — under the hood it's just a single-select question fixed to exactly two options, pre-labeled "True" and "False" (not editable), with the correct one chosen via the same radio-style control minus the ability to add/remove options.

## Short Answer

A free-text response instead of any option list. The question's `question_options` rows are repurposed as **acceptable answers** rather than multiple-choice options — a teacher lists one or more strings that would count as correct (e.g. "Paris" and "paris" as two separate acceptable-answer entries, though this specific example is redundant given the matching rule below). **Matching is trimmed and case-insensitive**: a student's typed answer is correct if it equals *any* acceptable answer after trimming whitespace and lowercasing both sides — no partial-credit/fuzzy matching, no numeric-tolerance handling for numeric answers (a numeric short-answer question just needs every acceptable numeric representation listed as its own acceptable-answer string, e.g. both "3.5" and "3.50" if either should count).

## Where this shows up

- **Authoring**: a "Question Type" dropdown per question in the question editor; switching types reshapes the answer editor beneath it (radio list ↔ checkbox list ↔ fixed True/False ↔ plain text + acceptable-answers list). Bulk-import text supports an optional `Type:` marker line per question, and short-answer questions use `=` lines instead of lettered options. See [Test authoring](test-authoring.md).
- **Taking the test**: the question body renders differently per type — radio buttons, checkboxes, a fixed two-option True/False choice, or a plain textarea. See [Taking a test](test-taking.md).
- **Results review**: a submitted short-answer question shows exactly what the student typed, and — only when it was marked wrong — the full list of acceptable answers, so a student (or teacher) can see what would have counted. A multi-select question's review shows every option with "your answer" / "correct" badges, same visual language as single-select, just allowing multiple of each badge to appear at once. See [Grading & results](grading-and-results.md).

## Backward compatibility

Every pre-existing question in the system defaulted to `single_select` when this feature shipped, and every code path that handles question types explicitly falls through to the original single-select behavior when a question's type is (or defaults to) `single_select` — a test authored before this feature existed behaves identically today, with no migration or re-save required.
