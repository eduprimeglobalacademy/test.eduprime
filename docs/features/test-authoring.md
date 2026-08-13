# Feature: Test authoring

## Creating a new test — 3-step wizard

Before a test exists at all (`TestAuthoring`, no `testId` yet), a teacher goes through 3 steps, with a progress indicator at the top:

1. **Basic Info** — title (required), description, duration in minutes (blank = no whole-test time limit), start/end time (blank = no scheduling window), class (optional, with an inline "create new class" shortcut), and a **"Public exam"** checkbox for tests with no enrolled class and an unknown number of outside participants (see [Public exams](public-exams.md) — this checkbox changes the rest of the flow meaningfully).
2. **Behavior** — show results to students after submission, allow backward navigation, per-question timing (a whole-test-level toggle, distinct from and mutually exclusive with using [sections](sections-and-timing.md)), and require-Google-sign-in-before-entry (with an explanation that differs depending on whether a class is selected — see [Taking a test](test-taking.md)).
3. **Grading** — the A/B/C/D percentage boundaries and passing-grade minimum. See [Grading & results](grading-and-results.md) for exactly how (and, in one case, whether) these are actually used downstream.

Clicking "Create Assessment" on the last step is the point the test row actually gets created (as `draft`, or `pending_approval` if the public-exam checkbox was ticked) — this is also the point the org's active-test plan limit is checked, both client-side (for an accurate message) and enforced again at the database layer regardless.

## Editing an existing test

Once a test exists, authoring becomes a two-column layout: a collapsible "Basic Info" card on the left (same fields as step 1, now editable any time with its own Save button) plus a shortcut into the fuller Test Settings screen (behavior/grading/collaborators/danger-zone — see role docs), and the question list on the right, which is the bulk of what a teacher spends time on.

## Building the question list

Above the question list: **From Bank** (pull in previously-saved questions — see [Question bank](question-bank.md)), **Bulk Import** (paste plain text, see below), and **Template** (download a starter text file showing the exact format).

Each question, once added, is a collapsible row. Collapsed, it shows: up/down move arrows, position number, question text (or "New Question" in italics if still blank), a badge for its question type (only shown when it isn't the default single-select) and its assigned section (only shown once the test has sections), point value, and an expand toggle. Expanded, it shows the full editor: question text, points, time limit in seconds, question type selector, section selector (only present once the test has at least one section), and a type-specific answer editor — see [Question types](question-types.md) for exactly how single-select/multi-select/true-false/short-answer each render and validate differently here.

**Reordering** is simple up/down arrow buttons per question (no drag-and-drop) — clicking swaps a question with its immediate neighbor in the list. This is also literally how save order works: whatever position a question sits in when "Save All Questions" is clicked becomes its `question_order`, full stop.

**Bulk import** parses a specific plain-text grammar: `"1. Question text"` followed by `"A. Option"` lines, `*` (or being the first/`A.` option) marking the correct answer. An optional `Type: multi_select|true_false|short_answer` line right after the question line switches that question's type; short-answer questions use `= acceptable answer` lines instead of lettered options, one per line, any number of them. The downloadable Template file documents this exact grammar with worked examples of all four types.

Saving a question **to the bank** (from its expanded editor) makes it reusable by any teacher in the org going forward — see [Question bank](question-bank.md).

## Saving

"Save All Questions" validates every question first (text required; every question needs at least 2 options, or at least 1 acceptable answer for short-answer; every question needs at least one option marked correct) and only then writes the whole set — new questions are inserted, existing ones have their options fully replaced (delete-then-reinsert, not a diff) with a `question_type` and `section_id` on every row.

## Sections (optional)

A "Sections" panel sits directly above the question list, letting a teacher optionally split the test into named, independently-timed groups with their own cross-section navigation rules — entirely optional, and invisible to students on a test that never uses it. See [Sections & timing](sections-and-timing.md) for the full mechanics, including the exact backward-compatibility guarantee for tests that don't use sections.

## Preview and Reports

Two full-screen views, reached from buttons in the authoring header (Preview only shown once a test is `live`): **Preview** is a read-only walkthrough with correct answers revealed, nothing graded or saved — a teacher-facing sanity check, not a student simulation. **Reports** is the results dashboard — see [Reports & analytics](reports-and-analytics.md).
