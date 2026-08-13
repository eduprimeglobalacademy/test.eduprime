# Feature: Question bank

## What it is

A reusable library of saved questions, **shared across every teacher in the same organization** — not private to whoever saved it. Any teacher can browse and reuse any bank question any other teacher in their org has saved.

Deliberately a separate set of tables from a test's own `questions`/`question_options` rather than "a question with no test attached." Adding a bank question to a test **copies** it into that test's own question rows at that moment — editing the test's copy afterward never changes the shared bank source, and editing (or deleting) the bank source later never retroactively changes a test that already shipped to students.

## Saving a question to the bank

From any question's expanded editor during authoring, "Save to Bank" — requires question text and at least 2 options to be filled in first. The question's type carries through to the bank copy, so a saved multi-select or short-answer question stays that type when reused later.

## Using the bank

The "From Bank" button in authoring opens a picker: a search box (matches question text), a checkbox-style multi-select list of every saved question in the org (question text, option count, point value per row), and a per-item delete-from-bank button. Selecting one or more and clicking "Add N to test" copies them straight into the current test's question list, ready to edit further or save as-is.

## What it isn't

There's no tagging, categorization, or per-teacher-only visibility — it's a flat, org-wide, searchable list. There's also no editing a bank item directly from the picker; editing happens by pulling it into a test, changing it there, and (optionally) saving that changed version back to the bank as effectively a new entry.
