# Feature: Classes

## What a class is

A lightweight organizational container for a teacher's tests — "Section A", with free-text `course_name`, `grade_level`, and `academic_term` (kept as plain text, not normalized lookup tables, since nothing today needs to report across the whole org by grade or term). Scoped to one teacher within one org. A test's `class_id` is nullable — plenty of tests are one-off assessments that never belong to any class.

There is no standalone "class management" area outside the flow below — everything routes through the Classes grid → a class's detail page → that class's settings.

## Creating a class

From the Classes screen, "New Class" toggles an inline creation form (not a modal): section name (required), course, grade level, term. Submitting immediately navigates into the newly created class. Classes can also be created inline from the class picker inside test authoring, so a teacher never has to leave the authoring flow just to make a new section.

## The Classes grid

One card per class: its label (`course_name — name`, or bare `name` if no course is set — this `classLabel()` formatting is used everywhere a class is shown across the whole teacher UI, for consistency), grade/term badges, an assessment-count/draft-count/live-count summary, and — if the class currently has a live test — a copyable join-code chip right on the card (test title + code, click to copy). A shortlist of the first 6 classes also lives directly in the dashboard sidebar for one-click access without opening the full grid.

## Inside a class

The class detail page reuses the same test-list component as "All Assessments," just pre-filtered to this class's tests, with its own 4 stat tiles (Draft/Live/Completed/Total) scoped to the class. "Create Assessment" from here pre-associates the new test with this class.

## Class Settings — two distinct areas

**Properties**: edit the name/course/grade/term. **Deleting a class is only offered when it has zero tests** — if it has any, the delete action is hidden entirely and replaced with a note to delete the class's assessments first. This is a hard block, not a warning.

**Roster** — the class's enrolled-student list, a genuinely separate concept from a *test's* blocklist (see [Collaborators & blocked students](collaborators-and-blocked-students.md)):
- Add a student directly by email (+ optional name).
- **Enrollment link** (`/enroll?class={id}`) — students self-enroll by signing in with Google, no teacher action needed per-student. A **QR code** version of the same link can be displayed full-screen, meant for projecting in a physical classroom for students to scan on their phones.
- The roster table supports search (once it's non-trivially sized), removing a student, and starring a student to add them to the teacher's [Focus list](../roles/teacher.md).

Adding a student (by email, whether typed in directly or via the self-enroll link) is an **upsert** keyed on `(class_id, student_email)` — re-adding an already-enrolled email just no-ops/updates rather than erroring or duplicating.

## Why the roster matters beyond organization

A class's roster becomes a real access-control mechanism the moment a test belonging to that class has "require Google sign-in" enabled — at that point, enrollment in the roster is what determines whether a student can get into the test at all, not just a convenience list. See [Taking a test](test-taking.md).
