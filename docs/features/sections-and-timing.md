# Feature: Sections & timing

## The three timing shapes, from simplest to most structured

**No sections (the original, still-default shape):** a test has either one whole-test countdown (`duration_minutes`) or independent per-question countdowns (`per_question_timing` — each question gets its own timer, auto-advancing to the next question when it expires, with no going back). These two are mutually exclusive and unrelated to sections. Most tests use this shape and always will — sections are opt-in.

**Sections:** a test can optionally be split into named groups of questions, each with its own timing mode and its own cross-section navigation rule. A test either uses sections or it doesn't — there's no partial state visible to students; see "Backward compatibility" below for exactly what "uses sections" means.

## Per-section timing modes

Set per section, independently of every other section on the same test:

- **Untimed** — no countdown for this section at all. If the *test* also has a whole-test `duration_minutes` set, that outer timer still runs in the background as a hard ceiling on the whole attempt — it's just not scoped to this particular section.
- **Fixed** — one countdown for the whole section, set to a flat number of minutes. Expiry auto-advances to the next section (or submits, if it's the last one).
- **Sum of questions' time** — one countdown for the whole section, computed as the **sum** of that section's individual questions' time-limit-seconds. This is deliberately different from the original per-question-timing mode: it's one running countdown for the whole section's budget, not independent hard-cutoffs per question. A student can spend more or less time on any individual question within the section as long as the section's total budget holds.

The two timers (an active section timer, and the test-level outer timer if the test also has one) can run simultaneously — both are shown in the header when both apply, labeled distinctly (section time vs. overall time).

## Cross-section navigation: free vs. locked

Each section also has its own **"students can jump to other sections freely"** toggle:

- **Free navigation**: while in a freely-navigable section, the student sees a full section picker in the sidebar and can jump to any section at any time, in any order.
- **Locked (sequential)**: no picker is shown for that section; the only way forward is the "Next Section" button (or the section timer expiring), and once left, a locked section cannot be returned to. This mirrors how a real proctored exam behaves — move forward only, no going back once you've left a section.

Within a section (not across sections), back-and-forth navigation between individual questions is still governed by the test's existing whole-test "allow backward navigation" setting — that setting isn't duplicated per-section.

## Assigning questions to sections

From the question editor in authoring, once a test has at least one section defined, each question gets a "Section" dropdown (or "No section"). Reordering questions (the up/down arrows) is independent of section assignment — moving a question up or down in the list doesn't change which section it belongs to; that's controlled purely by the dropdown.

## Backward compatibility — the load-bearing guarantee

A test with **zero** sections behaves in every respect exactly as it did before sections existed — this was verified explicitly, including a real regression caught during development (a test with no sections was briefly, incorrectly, showing "1 section" because every question's section assignment defaults to "none," which an early version of the logic misread as an implicit section). The actual rule: sections only activate for a test when at least one *real, named* section has at least one question assigned to it. A test where sections exist in authoring but nothing's been assigned to any of them yet — or a test that's never touched the Sections panel at all — renders and behaves identically to a plain, flat test.

If a test does have real sections *and* some questions with no section assigned, those unassigned questions are grouped into an implicit trailing "General" section, so nothing authored ever silently disappears from the exam-taking flow.
