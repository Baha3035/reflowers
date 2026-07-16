
-- Allow admins/moderators to update reports (e.g., close/resolve)
CREATE POLICY "Admins and moderators can update reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'moderator'))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'moderator'));

-- Allow reviewers to edit or delete their own reviews
CREATE POLICY "Reviewers can update own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = reviewer_id)
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can delete own reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (auth.uid() = reviewer_id);
