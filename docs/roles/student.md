# Role: Student

## Who this is

The only role with **no account, no login, no password** — a student is identified purely by the name/email/phone they type in when joining a specific test (or, for gated tests, by their Google identity). There is no `students` table of standing accounts; a student "exists" in the system only as rows in `test_attempts`/`student_answers` (one per test they've taken) and optionally `class_students` (if they've enrolled in a class roster ahead of time).

## Two ways a student shows up in the system

**1. Cold join, no prior relationship** — the common case. A student gets a 6-character test code from their teacher, goes to `yourschool.eduprime.app/assessment` (or the root domain's `/assessment` — this path works from *any* host, including the platform's root domain, so links shared before an org had its own subdomain keep working), types the code, and proceeds straight to the test.

**2. Pre-enrolled via a class roster link** — a teacher can share a `/enroll?class={id}` link (with an optional QR code, meant for projecting in a physical classroom). Visiting it: sign in with Google → confirm your name/email → you're added to that class's `class_students` roster. This matters later if a test is configured to require Google sign-in (see below) and belongs to that class — the roster becomes the actual enrollment check.

## Taking a test

See [Taking a test](../features/test-taking.md) for the full mechanics (timing modes, sections, navigation rules, submission). In outline: enter the code → (if the test requires Google sign-in) sign in and pass the enrollment/block check → fill in name/email/phone → see the instructions screen (question count, points, time limit, key rules) → take the test → submit → see a results screen (score, grade, question-by-question review) if the teacher enabled showing results, or just a plain "submitted successfully" confirmation if not.

## Rules that constrain a student

- **One attempt per test.** A duplicate-attempt check runs before the test starts (matched on email + phone), blocking a repeat attempt with a clear message.
- **A test only works during its scheduled window and while it's `live`** — outside the start/end time, or before the teacher activates it, or after they close it, students see "not currently active" / "hasn't started yet" / "has ended" instead of the test.
- **A teacher can block a specific student from a specific test** by email — this is per-test, not org-wide (see [Collaborators & blocked students](../features/collaborators-and-blocked-students.md)).
- **If the test requires Google sign-in**, a student who isn't already enrolled in the test's class roster (when it has one) is shown "You're not enrolled in this class" rather than being let through — the class roster becomes a real access gate in that case, not just a convenience.
- **A visible on-screen watermark** (student name + email, tiled and rotated across the page) is present throughout the test-taking and results screens — a lightweight deterrent, not a hard security measure.

## What a student never sees

No dashboard, no history of past tests, no way to review a test they haven't been given the code for. Their entire relationship with the platform is scoped to the single test they're currently taking (or just finished).
