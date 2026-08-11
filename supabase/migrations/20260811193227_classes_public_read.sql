/*
  # Allow anonymous read of classes, for the enrollment page

  ClassEnrollment (`/enroll?class=<id>`) looks up the class by id BEFORE
  the student has signed in with Google — at that point they're on the
  `anon` role, and `classes` only had policies for `teachers`/`admin`
  ownership, so this lookup always returned zero rows under RLS
  (a silent empty result, not an error), which read as "link not found"
  even for a perfectly valid link. Same shape as the existing anon
  policy on `tests` (`TO anon USING (status = 'live')`) — classes carry
  nothing sensitive (name/course/grade/term), so no extra condition is
  needed beyond "you have the id."
*/

CREATE POLICY "public_read_classes"
  ON classes FOR SELECT
  TO anon, authenticated
  USING (true);
