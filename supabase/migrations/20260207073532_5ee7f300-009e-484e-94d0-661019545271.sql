-- Add DELETE policy for daily_syncs table to allow users to delete their own personal reflection data
-- This addresses GDPR compliance by allowing users to remove their sensitive personal data

CREATE POLICY "Users can delete their own syncs"
ON public.daily_syncs
FOR DELETE
USING (auth.uid() = user_id);