import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileAttachment } from "@/components/FileAttachment";
import { MessageNavigator } from "@/components/chat/MessageNavigator";
import { useMessageNavigation } from "@/hooks/useMessageNavigation";
import { MessageWithArtifacts } from "@/components/artifacts/MessageWithArtifacts";

interface Message {
  role: "user" | "assistant";
  content: string;
  files?: Array<{
    name: string;
    type: string;
    size: number;
    content: string;
  }>;
}

interface ChatInterfaceProps {
  session: any;
  onTokenUpdate?: (tokensUsed: number, tokenLimit: number) => void;
}

interface Conversation {
  id: string;
  title: string;
}

export const ChatInterface = ({ session, onTokenUpdate }: ChatInterfaceProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    name: string;
    type: string;
    size: number;
    content: string;
  }>>([]);
  const [fileAttachmentKey, setFileAttachmentKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { setMessageRef, scrollToMessage } = useMessageNavigation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load existing conversation and messages for this session on mount
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('Loading conversation for session:', session.id, 'Model:', session.model_name);

        const { data: existing } = await (supabase as any)
          .from('conversations')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('Found existing conversation:', existing);

        if (existing) {
          setConversationId(existing.id);
          const { data: existingMessages } = await (supabase as any)
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', existing.id)
            .order('created_at', { ascending: true });

          console.log('Loaded messages for conversation:', existingMessages?.length);

          if (existingMessages && existingMessages.length > 0) {
            setMessages(existingMessages.map((m: any) => ({ role: m.role, content: m.content })));
          } else {
            setMessages([{ role: 'assistant', content: `Hello! I'm ${session.model_name.replace(/-/g, ' ')}. How can I help you today?` }]);
          }
        } else {
          setConversationId(null);
          setMessages([{ role: 'assistant', content: `Hello! I'm ${session.model_name.replace(/-/g, ' ')}. How can I help you today?` }]);
        }
      } catch (e) {
        console.error('Failed to load existing conversation', e);
        setMessages([{ role: 'assistant', content: `Hello! I'm ${session.model_name.replace(/-/g, ' ')}. How can I help you today?` }]);
      }
    };
    init();
  }, [session.id, session.model_name]);

  const createConversation = async (firstMessage: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      console.log('Creating/finding conversation for session:', session.id);

      // Reuse existing conversation for this session if present
      const { data: existing } = await (supabase as any)
        .from('conversations')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        console.log('Reusing existing conversation:', existing.id);
        return existing.id;
      }

      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
      
      console.log('Creating NEW conversation for session:', session.id);
      const { data, error } = await (supabase as any)
        .from('conversations')
        .insert({
          user_id: user.id,
          session_id: session.id,
          title: title,
        })
        .select()
        .single();

      if (error) throw error;
      console.log('Created conversation:', data.id, 'for session:', session.id);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!conversationId) return;

    try {
      const { error } = await (supabase as any)
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
        });

      if (error) {
        console.error('Error saving message:', error);
        throw error;
      }

      // Bump conversation updated_at for ordering
      await (supabase as any)
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      files: attachedFiles.length > 0 ? attachedFiles : undefined,
    };

    // Create conversation on first message
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      currentConversationId = await createConversation(input);
      if (currentConversationId) {
        setConversationId(currentConversationId);
        toast({
          title: "Chat session started",
          description: "All messages in this session will be saved together. Find them later in Chat History.",
        });
      }
    }

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachedFiles([]);
    setFileAttachmentKey(prev => prev + 1); // Reset file attachment component
    setIsTyping(true);

    // Save user message
    if (currentConversationId) {
      await saveMessage('user', userMessage.content);
    }

    try {
      console.log('Sending files to edge function:', attachedFiles);
      if (attachedFiles.length > 0) {
        console.log('First file details:', {
          name: attachedFiles[0].name,
          type: attachedFiles[0].type,
          contentLength: attachedFiles[0].content?.length,
          contentPreview: attachedFiles[0].content?.substring(0, 200)
        });
      }
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [...messages, userMessage],
          sessionId: session.id,
          files: attachedFiles.length > 0 ? attachedFiles : undefined,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        setIsTyping(false);
        return;
      }

      const aiResponse: Message = {
        role: "assistant",
        content: data.message,
      };

      setMessages((prev) => [...prev, aiResponse]);
      
      // Save AI response
      if (currentConversationId) {
        await saveMessage('assistant', aiResponse.content);
      }
      
      // Update parent component with new token count
      if (onTokenUpdate) {
        onTokenUpdate(data.tokensUsed, data.tokenLimit);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="border shadow-none">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-light">
            <Sparkles className="w-4 h-4" />
            Chat with {session.model_name.replace(/google\/|gemini-|-/g, ' ')}
          </CardTitle>
          <MessageNavigator 
            messages={messages} 
            onMessageClick={scrollToMessage} 
          />
        </div>
        <p className="text-xs text-muted-foreground">
          💾 This entire chat session is automatically saved. View all your sessions in Chat History.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[500px] overflow-y-auto space-y-3 p-4 rounded border border-border">
          {messages.reduce((acc: JSX.Element[], message, index) => {
            // Group user message with following AI response
            if (message.role === "user") {
              const aiResponse = messages[index + 1];
              acc.push(
                <div
                  key={index}
                  ref={(el) => setMessageRef(index, el)}
                  className="space-y-2 transition-all duration-300"
                >
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded px-4 py-3 bg-foreground text-background">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      {message.files && message.files.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-current/20">
                          <p className="text-xs opacity-70 mb-1">Attachments:</p>
                          {message.files.map((file, idx) => (
                            <p key={idx} className="text-xs opacity-80">
                              📎 {file.name} ({Math.round(file.size / 1024)}KB)
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* AI response (if exists) */}
                  {aiResponse && aiResponse.role === "assistant" && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded px-4 py-3 bg-secondary text-foreground border border-border">
                        <MessageWithArtifacts content={aiResponse.content} />
                      </div>
                    </div>
                  )}
                </div>
              );
            } else if (index === 0 || messages[index - 1]?.role !== "user") {
              // Standalone AI message (like greeting)
              acc.push(
                <div
                  key={index}
                  ref={(el) => setMessageRef(index, el)}
                  className="flex justify-start transition-all duration-300"
                >
                  <div className="max-w-[85%] rounded px-4 py-3 bg-secondary text-foreground border border-border">
                    <MessageWithArtifacts content={message.content} />
                  </div>
                </div>
              );
            }
            return acc;
          }, [])}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-secondary border border-border rounded px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="space-y-2">
          <FileAttachment 
            key={fileAttachmentKey}
            onFilesChange={setAttachedFiles}
            disabled={isTyping}
          />
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={isTyping}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="icon"
              className="h-[60px] w-[60px] shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Powered by {session.model_name.replace(/google\//g, '')}
        </p>
      </CardContent>
    </Card>
  );
};
