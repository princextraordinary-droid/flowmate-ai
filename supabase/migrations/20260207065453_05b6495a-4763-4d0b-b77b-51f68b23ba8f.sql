-- Add DELETE policy for profiles table to allow users to delete their own profile data
-- This addresses GDPR right-to-erasure requirements and data privacy principles

CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);