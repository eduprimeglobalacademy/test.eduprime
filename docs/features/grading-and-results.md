# Feature: Grading & results

## Grading happens once, at submission

There's no separate "grading" step or teacher review queue — every question is scored automatically the instant a student submits, and that score is what's stored and shown forever after (not recomputed later if, say, a teacher edits the test afterward).

## Per-question-type scoring rules

See [Question types](question-types.md) for full detail; summarized here:

- **Single select / True-False**: correct if the selected option is the one flagged correct.
- **Multi select**: correct only if the *exact set* of selected options matches the *exact set* of correct options — no partial credit for getting some-but-not-all right.
- **Short answer**: correct if the trimmed, lowercased typed answer matches any one of the question's acceptable answers, trimmed and lowercased the same way.

An unanswered question is simply wrong (0 points) — there's no "unanswered" state that's treated differently from "answered incorrectly" in the score itself, though the results review does visually distinguish the two (see below).

## Letter grades

Computed from the test's own configured A/B/C/D percentage boundaries (set on the Grading step of authoring / Test Settings) — defaulting to 90/80/70/60 if never configured. Below the D boundary is F.

**The "passing grade minimum" field is currently not used anywhere a pass/fail rate is computed.** It's captured and saved alongside the letter-grade boundaries, but both the per-test Reports pass-rate stat and the teacher's cross-test Analytics pass-rate stat use a fixed 60% cutoff regardless of what's configured here. Only the A–D letter grade shown per student respects the configured boundaries.

## The student's results screen

Shown immediately after submission, only if the test's "show results" setting is on (see [Taking a test](test-taking.md) for what happens when it's off): score/max-score, percentage, letter grade, a correct/incorrect/unanswered count breakdown, a downloadable PDF summary, and — the detailed part — a full per-question review. Each question shows differently depending on its type: option-based questions (single/multi/true-false) show every option with "your answer" and/or "correct" badges (both can appear on the same option, or neither); short-answer shows exactly what the student typed and, only if it was wrong, the full list of what would have counted as correct.

## What the teacher sees

The teacher's view of results is the Reports screen, not this student-facing page — see [Reports & analytics](reports-and-analytics.md) for the aggregate stats, charts, and per-student table, including how the per-test student-capacity limit can lock some individual results from view (never from being recorded) on lower plans.
