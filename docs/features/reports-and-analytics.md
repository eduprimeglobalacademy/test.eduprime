# Feature: Reports & analytics

Three distinct views, at three different scopes — easy to conflate but each answers a different question.

## Test Reports (one test, full detail) — the teacher's main results screen

A full-screen view (reached from a test's card or from within authoring), scoped to a single test's submitted attempts only (in-progress/unsubmitted attempts never appear here). Six stat tiles (Total Attempts, Average/Highest/Lowest Score %, Pass Rate, Average Time), two charts (a grade-distribution pie using the fixed 90/80/70/60% buckets, and a score-distribution bar chart in fixed 20-point ranges), and a full per-student results table (name, email, score, percentage, letter grade — this one *does* use the test's own configured grading boundaries, unlike the Pass Rate stat next to it — time taken, submission time, and a star toggle to flag that student to the teacher's Focus list). CSV export mirrors the table.

**Note the inconsistency worth knowing**: the Pass Rate stat on this screen uses a hardcoded 60% cutoff, while the per-student Grade column in the table below it uses the test's actual configured A–D boundaries. Two different thresholds, same screen — see [Grading & results](grading-and-results.md).

### The student-capacity view lock

If the org's plan caps students-per-test, and this test has more submissions than that cap allows (and the org isn't on metered student billing, and this isn't a public exam — both of those make the limit not apply at all), only the **earliest-submitted N** attempts (first-submitted, first-unlocked — not most-recent) are visible in full; the rest show as a greyed row with just the student's name and a lock icon, and are excluded from CSV export. A banner above the table states how many results are locked and links to Billing to buy more capacity. This is purely a **viewing** restriction — every student's submission is always fully recorded regardless of plan; nobody is ever blocked from completing or submitting an exam because of this limit. See [Plan limits](plan-limits.md).

## Educator Analytics (org admin's view — every teacher, aggregate only)

The org admin's own "Analytics" screen: a sortable table across *every teacher in the org*, showing each one's test counts (draft/live/closed breakdown), total attempts, average score, and last activity — plus a "tests per educator" bar chart and org-wide average score. This is deliberately shallow (no per-student, no per-question detail) — it's a management overview of educator activity, not a substitute for any individual test's Reports.

## Teacher's Analytics (a teacher's own cross-test rollup)

Different again from both of the above: scoped to **one teacher's own tests only** (never another teacher's, unless they're a collaborator on a specific test), across every class, excluding drafts. Shows total submissions, average score, pass rate (same hardcoded 60% cutoff as Test Reports), assessments-graded count, an average-score-by-class chart (only shown once more than one class is represented), and a "lowest performing assessments" list (bottom 5 by average %, highlighted if under 60%) — framed as "worth a second look," a nudge toward tests that might need revising. This view has no capacity/billing gating applied to it at all — it's purely informational and always shows everything.

## Which one to use

- Investigating one specific test's results, need per-student detail or CSV export → **Test Reports**.
- An org admin checking how active/effective their teachers are → **Educator Analytics**.
- A teacher getting a bird's-eye view of their own tests to spot ones worth revisiting → **their own Analytics**.
