CREATE POLICY "Users can delete messages in their conversations"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversations
  WHERE conversations.id = chat_messages.conversation_id
  AND conversations.user_id = auth.uid()
));