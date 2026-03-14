-- Allow decimal scores (e.g. 7.5) in activity_submissions
ALTER TABLE activity_submissions
    DROP CONSTRAINT IF EXISTS activity_submissions_score_check,
    ALTER COLUMN score TYPE NUMERIC(4,1);

ALTER TABLE activity_submissions
    ADD CONSTRAINT activity_submissions_score_check CHECK (score >= 0 AND score <= 10);
