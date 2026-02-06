import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Sparkles, MessageSquare, Trash2, ArrowLeft, ChevronRight, User, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationSearch } from "@/components/chat/ConversationSearch";

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
  conversation_id: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  session_id: string;
  user_sessions?: {
    model_name: string;
    plan_id: string;
  };
}

interface MessageGroup {
  userMessage?: Message;
  aiMessage?: Message;
  isStandaloneAI: boolean;
}

export default function ChatHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Map<string, Message[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    loadConversations();
    loadAllMessages();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setUserEmail(user.email || "");
    }
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('conversations')
        .select(`
          *,
          chat_messages(count),
          user_sessions(model_name, plan_id)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const conversationsWithCount = data?.map((conv: any) => ({
        ...conv,
        message_count: conv.chat_messages?.[0]?.count || 0
      })) || [];

      setConversations(conversationsWithCount);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllMessages = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group messages by conversation_id
      const messagesMap = new Map<string, Message[]>();
      for (const msg of data || []) {
        const existing = messagesMap.get(msg.conversation_id) || [];
        existing.push(msg);
        messagesMap.set(msg.conversation_id, existing);
      }

      setAllMessages(messagesMap);
    } catch (error: any) {
      console.error('Failed to load all messages for search:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  // Group messages into user+AI pairs for cleaner display
  const messageGroups = useMemo<MessageGroup[]>(() => {
    const groups: MessageGroup[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (msg.role === "user") {
        const aiResponse = messages[i + 1];
        groups.push({
          userMessage: msg,
          aiMessage: aiResponse?.role === "assistant" ? aiResponse : undefined,
          isStandaloneAI: false,
        });
        if (aiResponse?.role === "assistant") i++; // Skip the AI message
      } else if (i === 0 || messages[i - 1]?.role !== "user") {
        // Standalone AI message (like greeting)
        groups.push({
          aiMessage: msg,
          isStandaloneAI: true,
        });
      }
    }
    
    return groups;
  }, [messages]);

  const handleConversationClick = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setHighlightedMessageId(null);
    await loadMessages(conversation.id);
  };

  const handleResumeChat = (conversation: Conversation) => {
    // Navigate to chat page with both session ID and conversation ID
    navigate('/chat', { 
      state: { 
        sessionId: conversation.session_id,
        conversationId: conversation.id 
      } 
    });
  };

  const handleMessageSelect = async (conversationId: string, messageId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      await handleConversationClick(conversation);
      setHighlightedMessageId(messageId);
      
      // Scroll to message after render with longer delay to ensure messages are loaded
      setTimeout(() => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // If direct ID not found, try to find the message in a group
          const allMessageElements = document.querySelectorAll('[id^="message-"]');
          allMessageElements.forEach((el) => {
            const groupElement = el as HTMLElement;
            // Check if this group contains the highlighted message
            if (groupElement.querySelector(`[data-message-id="${messageId}"]`)) {
              groupElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          });
        }
      }, 300);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await (supabase as any)
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Conversation deleted successfully",
      });

      if (selectedConversation?.id === id) {
        setSelectedConversation(null);
        setMessages([]);
      }

      loadConversations();
      loadAllMessages();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container flex h-14 items-center justify-between px-4 mx-auto">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/home')}>
              <div className="w-7 h-7 rounded-full border border-foreground flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-light tracking-tight">AI Access Hub</span>
            </div>
            <nav className="hidden md:flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="h-8 px-3">
                Home
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="h-8 px-3">
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-3 bg-secondary">
                Chat History
              </Button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground hidden sm:inline">{userEmail}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 px-3">
              <LogOut className="w-3 h-3 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Chat History</h1>
              <p className="text-sm text-muted-foreground">
                Search and browse your conversations
              </p>
            </div>

            {/* Search Component */}
            <ConversationSearch
              conversations={conversations}
              allMessages={allMessages}
              onConversationSelect={handleConversationClick}
              onMessageSelect={handleMessageSelect}
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse">Loading...</div>
              </div>
            ) : conversations.length === 0 ? (
              <Card className="border shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2 text-center">
                    No chat sessions yet
                  </p>
                  <p className="text-xs text-muted-foreground mb-4 text-center px-4">
                    Start a conversation in Dashboard
                  </p>
                  <Button onClick={() => navigate('/dashboard')} size="sm">
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2 pr-4">
                  {conversations.map((conversation) => (
                    <Card 
                      key={conversation.id}
                      className={`group border shadow-none cursor-pointer transition-all hover:border-foreground/50 ${
                        selectedConversation?.id === conversation.id ? 'border-foreground bg-secondary' : ''
                      }`}
                      onClick={() => handleConversationClick(conversation)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <CardTitle className="text-sm font-medium truncate">{conversation.title}</CardTitle>
                            <CardDescription className="text-xs space-y-0.5">
                              <div>{conversation.message_count} messages • {format(new Date(conversation.updated_at), 'MMM d, yyyy')}</div>
                              {conversation.user_sessions && (
                                <div className="text-primary/80">
                                  {conversation.user_sessions.plan_id} • {conversation.user_sessions.model_name.replace('google/', '')}
                                </div>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResumeChat(conversation);
                              }}
                              className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Resume chat"
                            >
                              <MessageSquare className="w-3.5 h-3.5 mr-1" />
                              <span className="text-xs">Resume</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDelete(conversation.id, e)}
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Conversation Details - Grouped Message View */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <Card className="border shadow-none h-[calc(100vh-180px)]">
                <CardHeader className="border-b py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedConversation(null)}
                        className="lg:hidden"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <div>
                        <CardTitle className="text-lg font-light">{selectedConversation.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {format(new Date(selectedConversation.created_at), 'MMM d, yyyy • h:mm a')} • {messages.length} messages
                        </CardDescription>
                      </div>
                    </div>
                    {selectedConversation.user_sessions && (
                      <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                        {selectedConversation.user_sessions.model_name.replace('google/', '')}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-pulse">Loading messages...</div>
                      </div>
                    ) : (
                      <div className="p-4 space-y-4">
                        {messageGroups.map((group, idx) => {
                          const messageId = group.userMessage?.id || group.aiMessage?.id;
                          const isHighlighted = highlightedMessageId === group.userMessage?.id || 
                                                highlightedMessageId === group.aiMessage?.id;
                          
                          return (
                            <div
                              key={idx}
                              id={`message-${messageId}`}
                              className={`rounded-xl border transition-all duration-500 ${
                                isHighlighted 
                                  ? 'ring-2 ring-primary bg-primary/5' 
                                  : 'bg-card hover:bg-accent/30'
                              }`}
                            >
                              {/* User Message */}
                              {group.userMessage && !group.isStandaloneAI && (
                                <div className="p-4 border-b" data-message-id={group.userMessage.id}>
                                  <div className="flex items-start gap-3">
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
                                      <User className="h-4 w-4 text-background" />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-medium text-foreground">You</p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {format(new Date(group.userMessage.created_at), 'h:mm a')}
                                        </p>
                                      </div>
                                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                                        {group.userMessage.content}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* AI Response */}
                              {group.aiMessage && (
                                <div className={`p-4 ${group.isStandaloneAI ? '' : 'bg-muted/30'}`} data-message-id={group.aiMessage.id}>
                                  <div className="flex items-start gap-3">
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <Sparkles className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-medium text-primary">AI Assistant</p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {format(new Date(group.aiMessage.created_at), 'h:mm a')}
                                        </p>
                                      </div>
                                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                                        {group.aiMessage.content}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card className="border shadow-none h-[calc(100vh-180px)]">
                <CardContent className="flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium mb-2">Select a conversation</p>
                  <p className="text-sm text-muted-foreground text-center px-4 mb-4">
                    Choose from the list or use search to find specific messages
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <kbd className="px-2 py-1 bg-muted rounded border">⌘F</kbd>
                    <span>to search</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}