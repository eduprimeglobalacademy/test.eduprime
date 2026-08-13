# Feature: Collaborators & blocked students

Two distinct per-test controls, both configured from a test's Settings screen — easy to conflate but they do opposite jobs: one grants access to a test for other *teachers*, the other denies access to specific *students*.

## Collaborators

Lets other teachers **in the same organization** work on a test alongside its original author. Adding one is by email lookup, restricted to people who are already registered educators in the org — you cannot invite an outside email or someone who hasn't registered yet; a non-matching email is rejected with "No educator in your organization has that email." Adding an already-added collaborator is rejected as a duplicate rather than silently no-op'd. Removing a collaborator is immediate, no confirmation step.

## Blocked students (per-test, not org-wide)

A per-test blocklist by student email — blocking someone on one test has no effect on any other test. If the test belongs to a class, the blocklist UI shows the class's roster directly with a one-click Block/Unblock toggle per student (blocked names render struck-through), plus a manual "block by email" field for anyone not on the roster (or for a classless test, where the manual field is the only option). A student blocked this way is prevented from joining/starting that specific test — see [Taking a test](test-taking.md).

Blocking requires the test to already be saved at least once — there's nothing to attach a blocklist entry to before that.

## Why these are separate from a class roster

A class's roster (see [Classes](classes.md)) is "who's generally enrolled in this section" — a positive list. The per-test blocklist is a negative list scoped to one specific assessment. A student can be on a class roster and still be blocked from one particular test in that class (e.g. a makeup exam that shouldn't be retaken), without affecting their standing in the class or their access to any other test.
