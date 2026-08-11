/*
  # Remove class-level student blocking

  Two separate blocking mechanisms (class_students.blocked, and the
  test_blocked_students table added right after it) were confusing —
  the actual ask was always per-test blocking, configurable during test
  creation. class_students.blocked was never fully replaced, just left
  sitting alongside it. Dropping it: test_blocked_students is now the
  only blocking mechanism, and it already works on classless tests too,
  so nothing is lost by removing the class-level version.
*/

ALTER TABLE class_students DROP COLUMN IF EXISTS blocked;
