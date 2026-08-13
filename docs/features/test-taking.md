# Feature: Taking a test (student flow)

## Entry point

`/assessment` (or `/test`) — works on any host, including the platform's root domain, so a shared link keeps working even for a test that predates its org having its own subdomain. A student types the 6-character test code and continues.

## The gate sequence, in order

1. **Test lookup**: must exist, be currently `live`, and be within its scheduled start/end window if one is set. Anything else shows a plain "Assessment Unavailable" message with the specific reason (not started yet / has ended / not currently active / not found).
2. **Google sign-in gate** (only if the test has "require Google sign-in" enabled): the student must sign in with Google before anything else. Once signed in, their email is locked into the details form (read-only, "Verified via Google sign-in") rather than freely typed.
   - **If the test belongs to a class**: the student must also already be on that class's `class_students` roster (see [Classes](classes.md)) — not enrolled shows "You're not enrolled in this class," with an option to try a different Google account.
   - **If the test has no class**: only identity (a verified Google email) is checked — there's no roster to enroll in.
   - **Per-test blocking** (see [Collaborators & blocked students](collaborators-and-blocked-students.md)) is checked here too, independent of class enrollment — a blocked email is rejected even if otherwise enrolled.
3. **Details form**: name, email, phone (email pre-filled/locked if it came from Google) — all required, validated for format.
4. **Duplicate-attempt check**: matched on email + phone against existing attempts for this specific test. Already attempted → blocked with "You have already taken this test. Each student can only take a test once." This check fails open (lets the student through) if the check itself errors, rather than blocking a legitimate student over an infrastructure hiccup.
5. **Instructions screen**: question count, total points, and a timing summary (adapts to whichever timing mode the test uses — see [Sections & timing](sections-and-timing.md)), plus the specific navigation/timing rules that apply, and a chance to go back and correct details before starting.
6. **The test itself.**

## While taking the test

- A tiled, rotated **watermark** of the student's name and email is visible across the whole screen throughout — a lightweight deterrent against screenshotting/sharing, not a hard security control.
- **Question rendering** depends on the question's type — radio buttons, checkboxes, a fixed True/False choice, or a text box. See [Question types](question-types.md).
- **Timing and cross-navigation** depend on whether the test uses sections, and if so each section's own mode and lock setting. See [Sections & timing](sections-and-timing.md) for the full breakdown — from the student's point of view, the header shows whichever timer(s) currently apply, and the sidebar either shows a flat question grid or a section-grouped one with locked sections visibly disabled.
- Progress is tracked live (answered-count, a progress bar) but nothing is actually persisted to the server until final submission — closing the tab mid-test loses progress; nothing is saved question-by-question.

## Submitting

One insert into `test_attempts` (score, time taken, submission timestamp) followed by one `student_answers` row per answered question — unanswered questions simply have no row. Grading happens client-side at the moment of submission (see [Grading & results](grading-and-results.md) for exactly how each question type is scored) and is written alongside the raw answer, not recomputed later.

## After submitting

If the test's "show results" setting is on: a results screen with the score, percentage, letter grade, a correct/incorrect/unanswered breakdown, a downloadable PDF, and a full question-by-question review (what was selected/typed vs. what was correct). If it's off: a plain "Assessment Submitted Successfully" confirmation with no score shown at all — the teacher still sees everything in their Reports regardless of this setting; it only controls what the *student* sees immediately after submitting.
