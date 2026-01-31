CREATE POLICY "Users can delete their own logs"
ON public.logs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);