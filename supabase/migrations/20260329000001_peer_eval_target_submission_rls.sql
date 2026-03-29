-- Allow evaluators to read the target submissions they're assigned to evaluate.
-- Without this policy, the NOT NULL FK join in getMyPeerAssignments silently
-- drops all assignment rows because RLS filters out the joined submission.
CREATE POLICY "Evaluators can read assigned target submissions"
    ON public.activity_submissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.peer_evaluation_assignments pea
            WHERE pea.target_submission_id = activity_submissions.id
              AND (
                  pea.evaluator_id = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.module_group_members mgm
                      WHERE mgm.group_id = pea.evaluator_group_id
                        AND mgm.student_id = auth.uid()
                  )
              )
        )
    );
