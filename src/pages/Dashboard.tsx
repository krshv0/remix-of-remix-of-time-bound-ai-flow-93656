import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Sparkles, Moon, Sun, MessageSquare, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { PlanSelector } from "@/components/PlanSelector";
import { useTheme } from "@/components/chat-ui";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActiveSessions = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveSessions(data || []);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
    }
  }, [user?.id]);

  const loadConversations = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('conversations')
        .select(`
          *,
          chat_messages(count),
          user_sessions(model_name, plan_id)
        `)
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const conversationsWithCount = data?.map((conv: any) => ({
        ...conv,
        message_count: conv.chat_messages?.[0]?.count || 0
      })) || [];

      setConversations(conversationsWithCount);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadActiveSessions();
      loadConversations();
    }
  }, [user, loadActiveSessions, loadConversations]);

  const handleStartChat = (sessionId: string) => {
    navigate('/chat', { state: { sessionId } });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
        <div className="flex h-14 items-center justify-between px-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-6">
            <button 
              className="flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0" 
              onClick={() => navigate('/home')}
              type="button"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-medium tracking-tight hidden sm:inline">AI Access Hub</span>
            </button>
            <nav className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="h-8 px-3 text-muted-foreground hover:text-foreground">
                Home
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-3 bg-primary/10 text-foreground">
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/chat-history')} 
                className="h-8 px-3 text-muted-foreground hover:text-foreground"
              >
                History
              </Button>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            
            <span className="text-xs text-muted-foreground hidden lg:inline px-2 py-1 bg-muted rounded-md">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 px-3">
              <LogOut className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Sessions & Purchase */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Manage your sessions and start chatting
              </p>
            </div>

            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Active Sessions</CardTitle>
                  <CardDescription className="text-xs">
                    Click to start chatting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activeSessions.map((sess) => (
                    <Button
                      key={sess.id}
                      variant="outline"
                      className="w-full justify-between h-auto py-3"
                      onClick={() => handleStartChat(sess.id)}
                    >
                      <div className="text-left">
                        <div className="font-medium text-sm capitalize">
                          {sess.model_name.replaceAll(/google\/|gemini-|-/g, ' ')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sess.plan_id} • {sess.hours_purchased}h
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Purchase New Session */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">
                  {activeSessions.length > 0 ? 'Purchase Additional Session' : 'Choose Your Plan'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {activeSessions.length > 0 
                    ? 'Add more time or try a different model' 
                    : 'Select a plan to start your AI session'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlanSelector 
                  onSessionStart={() => {
                    loadActiveSessions();
                    toast({
                      title: "Session Created",
                      description: "Your new session is ready. Click it above to start chatting.",
                    });
                  }} 
                />
              </CardContent>
            </Card>
          </div>

          {/* Recent Conversations */}
          <div className="lg:col-span-2">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">Recent Conversations</CardTitle>
                    <CardDescription className="text-xs">
                      Your latest chat sessions
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/chat-history')}
                    className="h-8"
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      No conversations yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activeSessions.length > 0 
                        ? 'Click on an active session above to start chatting' 
                        : 'Purchase a session to get started'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2 pr-4">
                      {conversations.map((conversation) => (
                        <Card 
                          key={conversation.id}
                          className="group border shadow-none cursor-pointer transition-all hover:border-foreground/50 hover:bg-accent/50"
                          onClick={() => navigate('/chat', { 
                            state: { 
                              sessionId: conversation.session_id,
                              conversationId: conversation.id 
                            } 
                          })}
                        >
                          <CardHeader className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 flex-1 min-w-0">
                                <CardTitle className="text-sm font-medium truncate">
                                  {conversation.title}
                                </CardTitle>
                                <CardDescription className="text-xs space-y-0.5">
                                  <div>
                                    {conversation.message_count} messages • {format(new Date(conversation.updated_at), 'MMM d, yyyy')}
                                  </div>
                                  {conversation.user_sessions && (
                                    <div className="text-primary/80">
                                      {conversation.user_sessions.plan_id} • {conversation.user_sessions.model_name.replace('google/', '')}
                                    </div>
                                  )}
                                </CardDescription>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
