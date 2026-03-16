-- Ampliar el check constraint de activity_submissions.status para incluir 'published'
ALTER TABLE activity_submissions
  DROP CONSTRAINT activity_submissions_status_check;

ALTER TABLE activity_submissions
  ADD CONSTRAINT activity_submissions_status_check
    CHECK (status IN ('pending', 'submitted', 'graded', 'published'));
