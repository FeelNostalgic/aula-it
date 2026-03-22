CREATE POLICY "Teachers can read own question banks"
    ON question_banks FOR SELECT
    USING (created_by = auth.uid());

CREATE POLICY "Teachers can insert own question banks"
    ON question_banks FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Teachers can update own question banks"
    ON question_banks FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Teachers can delete own question banks"
    ON question_banks FOR DELETE
    USING (created_by = auth.uid());
