# Feature: Public exams & approval

## What a "public exam" is

A test with no enrolled class and an unknown, potentially large number of outside participants — the running example throughout the product is a hiring or onboarding exam, where "students" are candidates who were never part of any class roster. Marked via a checkbox ("Public exam — hiring, onboarding, no enrolled class") on the first step of test authoring.

Checking it changes the authoring flow in one concrete way: the class picker disappears entirely (a public exam is never associated with a class — `class_id` is forced null), and the test is created with status `pending_approval` instead of the usual `draft`.

## The approval gate

A `pending_approval` test cannot be activated by the teacher who created it — no status-action button is even shown on it in the test list; instead a static "Awaiting admin approval" pill appears. The org admin's **Approvals** screen lists every test in this state (teacher name + submitted timestamp, oldest first) with Approve/Reject buttons. Approving moves it straight to `live` (skipping `draft` entirely — a public exam goes from awaiting-approval directly to being joinable) and stamps who approved it and when. Rejecting moves it to `closed` — not deleted, just ended.

This is the **only** point where an org admin's approval is required for a regular test's lifecycle — a normal (non-public) test never touches this gate at all and goes straight to `draft`, fully under the teacher's own control.

## Why it exists

The scenario driving this: an unknown, potentially uncapped number of outside participants is a materially different risk/cost profile than a class's known roster, so a public exam gets a human sign-off step before it can start collecting real submissions — a lightweight check against a teacher accidentally (or maliciously) standing up an open, unbounded exam without anyone at the org being aware.

## Interaction with student capacity limits

A public exam is explicitly **exempt** from the per-test student-capacity limit that otherwise gates how many results a teacher can see on their plan (see [Plan limits](plan-limits.md)) — since "unknown number of outside participants" is the whole premise of this test type, capping how many of their results are visible would defeat the purpose. Every submission to a public exam is always fully visible in Reports, regardless of plan.
