/**
 * Modern Chat Interface
 * Main chat component that combines all UI elements
 * Benchmarked against Claude, Gemini, and ChatGPT
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAutoScroll } from './hooks/useAutoScroll';
import { useMessageNavigation } from './hooks/useMessageNavigation';
import {
  ChatMessage,
  TypingIndicator,
  ChatInput,
  WelcomeScreen,
  ScrollToBottomButton,
  ErrorBanner,
  MessageNavigationPanel,
  NavigationTrigger,
  MessageBlockWrapper,
} from './components';
import { ChatSidebar } from './components/ChatSidebar';
import { Message, FileAttachment, Conversation } from './types';
import { groupMessagesIntoBlocks } from './utils/messageBlocks';

interface ModernChatInterfaceProps {
  session: any;
  onTokenUpdate?: (tokensUsed: number, tokenLimit: number) => void;
  className?: string;
}

// Generate unique ID
const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Get resolved theme from document
const getResolvedTheme = () => {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
  return 'light';
};

export function ModernChatInterface({
  session,
  onTokenUpdate,
  className,
}: ModernChatInterfaceProps) {
  const { toast } = useToast();
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track theme for sidebar
  const [isDarkMode, setIsDarkMode] = useState(() => getResolvedTheme() === 'dark');

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(getResolvedTheme() === 'dark');
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  // Auto-scroll hook
  const { containerRef, showScrollButton, scrollToBottom } = useAutoScroll(
    [messages, isTyping],
    { threshold: 100 }
  );

  // Message navigation hook
  const {
    isNavOpen,
    messageBlocks,
    activeBlockId,
    highlightedBlockId,
    openNav,
    closeNav,
    navigateToBlock,
  } = useMessageNavigation({
    messages,
    containerRef: containerRef as React.RefObject<HTMLElement>,
    enabled: messages.length > 0,
  });

  // Model display name
  const modelDisplayName = useMemo(() => {
    return session.model_name?.replace(/google\/|gemini-|-/g, ' ').trim() || 'AI Assistant';
  }, [session.model_name]);

  // Load existing conversation on mount
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load existing conversation for this session
        const { data: existing } = await (supabase as any)
          .from('conversations')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          setConversationId(existing.id);
          
          // Load messages
          const { data: existingMessages } = await (supabase as any)
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', existing.id)
            .order('created_at', { ascending: true });

          if (existingMessages?.length > 0) {
            setMessages(
              existingMessages.map((m: any) => ({
                id: m.id || generateId(),
                role: m.role,
                content: m.content,
                timestamp: new Date(m.created_at),
              }))
            );
          }
        }

        // Load all conversations for sidebar
        loadConversations();
      } catch (e) {
        console.error('Failed to load conversation:', e);
      }
    };

    init();
  }, [session.id]);

  // Load conversations for sidebar
  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await (supabase as any)
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (data) {
        setConversations(
          data.map((c: any) => ({
            id: c.id,
            title: c.title || 'New Chat',
            createdAt: new Date(c.created_at),
            updatedAt: new Date(c.updated_at),
            messageCount: 0,
          }))
        );
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  };

  // Create conversation
  const createConversation = async (firstMessage: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check for existing conversation for this session
      const { data: existing } = await (supabase as any)
        .from('conversations')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) return existing.id;

      // Create new conversation
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
      const { data, error } = await (supabase as any)
        .from('conversations')
        .insert({
          user_id: user.id,
          session_id: session.id,
          title,
        })
        .select()
        .single();

      if (error) throw error;
      
      loadConversations();
      return data.id;
    } catch (e) {
      console.error('Failed to create conversation:', e);
      return null;
    }
  };

  // Save message
  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!conversationId) return;

    try {
      await (supabase as any)
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
        });

      // Update conversation timestamp
      await (supabase as any)
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (e) {
      console.error('Failed to save message:', e);
    }
  };

  // Send message
  const handleSend = useCallback(async (content: string, files?: FileAttachment[]) => {
    if (!content.trim() && (!files || files.length === 0)) return;

    setError(null);

    // Create user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
      files,
    };

    // Add to messages immediately
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Create conversation if needed
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      currentConversationId = await createConversation(content);
      if (currentConversationId) {
        setConversationId(currentConversationId);
        toast({
          title: 'Chat started',
          description: 'Your conversation is being saved automatically.',
        });
      }
    }

    // Save user message
    if (currentConversationId) {
      await saveMessage('user', content);
    }

    try {
      // Prepare files for API
      const fileData = files?.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        content: f.content,
      }));

      // Call AI
      const { data, error: apiError } = await supabase.functions.invoke('chat', {
        body: {
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          sessionId: session.id,
          files: fileData,
        },
      });

      if (apiError) throw apiError;

      if (data.error) {
        setError(data.error);
        setIsTyping(false);
        return;
      }

      // Create AI response
      const aiMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Save AI response
      if (currentConversationId) {
        await saveMessage('assistant', aiMessage.content);
      }

      // Update token stats
      if (onTokenUpdate) {
        onTokenUpdate(data.tokensUsed, data.tokenLimit);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsTyping(false);
    }
  }, [messages, conversationId, session.id, onTokenUpdate, toast]);

  // Regenerate last response
  const handleRegenerate = useCallback(async () => {
    const lastUserMessageIndex = messages.findLastIndex((m) => m.role === 'user');
    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = messages[lastUserMessageIndex];
    
    // Remove messages after the last user message
    setMessages((prev) => prev.slice(0, lastUserMessageIndex + 1));
    
    // Resend
    setIsTyping(true);
    setError(null);

    try {
      const { data, error: apiError } = await supabase.functions.invoke('chat', {
        body: {
          messages: messages.slice(0, lastUserMessageIndex + 1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          sessionId: session.id,
        },
      });

      if (apiError) throw apiError;

      if (data.error) {
        setError(data.error);
        return;
      }

      const aiMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (conversationId) {
        await saveMessage('assistant', aiMessage.content);
      }

      if (onTokenUpdate) {
        onTokenUpdate(data.tokensUsed, data.tokenLimit);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate. Please try again.');
    } finally {
      setIsTyping(false);
    }
  }, [messages, session.id, conversationId, onTokenUpdate]);

  // Cancel generation
  const handleCancel = useCallback(() => {
    setIsTyping(false);
    setIsStreaming(false);
  }, []);

  // New chat
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setSidebarOpen(false);
  }, []);

  // Select conversation
  const handleSelectConversation = useCallback(async (id: string) => {
    try {
      const { data: msgs } = await (supabase as any)
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (msgs) {
        setMessages(
          msgs.map((m: any) => ({
            id: m.id || generateId(),
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at),
          }))
        );
      }

      setConversationId(id);
      setError(null);
      setSidebarOpen(false);
    } catch (e) {
      console.error('Failed to load conversation:', e);
    }
  }, []);

  // Delete conversation
  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await (supabase as any).from('conversations').delete().eq('id', id);
      
      if (id === conversationId) {
        handleNewChat();
      }
      
      loadConversations();
      
      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been removed.',
      });
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  }, [conversationId, handleNewChat, toast]);

  // Toggle theme - this triggers the MutationObserver above
  const handleToggleTheme = useCallback(() => {
    document.documentElement.classList.toggle('dark');
  }, []);

  // Prompt click handler
  const handlePromptClick = useCallback((prompt: string) => {
    handleSend(prompt);
  }, [handleSend]);

  const hasMessages = messages.length > 0;
  const lastMessage = messages[messages.length - 1];
  const isLastAssistant = lastMessage?.role === 'assistant';

  return (
    <div className={cn('flex h-full', className)}>
      {/* Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        conversations={conversations}
        activeConversationId={conversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Message Navigation Panel */}
      <MessageNavigationPanel
        isOpen={isNavOpen}
        onClose={closeNav}
        blocks={messageBlocks}
        activeBlockId={activeBlockId}
        onNavigateToBlock={navigateToBlock}
      />

      {/* Main chat area */}
      <div
        className={cn(
          'flex-1 flex flex-col h-full transition-all duration-300',
          sidebarOpen ? 'lg:ml-72' : 'ml-0'
        )}
      >
        {/* Messages container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto relative"
        >
          <div className="max-w-3xl mx-auto">
            {!hasMessages ? (
              <WelcomeScreen onPromptClick={handlePromptClick} />
            ) : (
              <div className="py-4">
                {/* Render message blocks for proper grouping */}
                {messageBlocks.map((block) => (
                  <MessageBlockWrapper
                    key={block.id}
                    block={block}
                    isHighlighted={highlightedBlockId === block.id}
                    showBlockIndex
                  >
                    {/* User message */}
                    <ChatMessage
                      message={block.userMessage}
                      isLast={false}
                    />
                    {/* Assistant response (if exists) */}
                    {block.assistantMessage && (
                      <ChatMessage
                        message={block.assistantMessage}
                        isLast={block === messageBlocks[messageBlocks.length - 1]}
                        onRegenerate={
                          block === messageBlocks[messageBlocks.length - 1]
                            ? handleRegenerate
                            : undefined
                        }
                      />
                    )}
                  </MessageBlockWrapper>
                ))}
                {/* Handle any trailing user message without response yet */}
                {messages.length > 0 && 
                 messages[messages.length - 1].role === 'user' &&
                 !messageBlocks.some(b => b.userMessage.id === messages[messages.length - 1].id) && (
                  <ChatMessage
                    key={messages[messages.length - 1].id}
                    message={messages[messages.length - 1]}
                    isLast
                  />
                )}
                {isTyping && <TypingIndicator />}
              </div>
            )}
          </div>

          {/* Scroll to bottom button */}
          <ScrollToBottomButton
            visible={showScrollButton && !isTyping}
            onClick={scrollToBottom}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="max-w-3xl mx-auto px-4 pb-2">
            <ErrorBanner
              message={error}
              onRetry={handleRegenerate}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Input area */}
        <div className="border-t bg-background/80 backdrop-blur-lg">
          <div className="max-w-3xl mx-auto p-4">
            <div className="flex items-end gap-2">
              {/* Navigation trigger - placed next to input */}
              {hasMessages && (
                <NavigationTrigger
                  onClick={openNav}
                  messageCount={messageBlocks.length}
                  variant="compact"
                />
              )}
              <div className="flex-1">
                <ChatInput
                  onSend={handleSend}
                  onCancel={handleCancel}
                  isLoading={isTyping}
                  placeholder={`Message ${modelDisplayName}...`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
