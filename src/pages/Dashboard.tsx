import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Sparkles, Moon, Sun, MessageSquare, ChevronRight, Image as ImageIcon, RefreshCw, Clock, Zap } from "lucide-react";
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
  const [expiredSessions, setExpiredSessions] = useState<any[]>([]);
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

      const { data: expired } = await (supabase as any)
        .from('user_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'expired')
        .order('created_at', { ascending: false })
        .limit(10);

      setExpiredSessions(expired || []);
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

  const handleStartSession = (session: any) => {
    if (session.session_type === 'image_generation') {
      navigate('/image-gen', { state: { sessionId: session.id } });
    } else {
      navigate('/chat', { state: { sessionId: session.id } });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const hasAnySessions = activeSessions.length > 0 || expiredSessions.length > 0;

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
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
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
      <div className="px-4 py-6 max-w-screen-2xl mx-auto">
        {/* Page Title Row */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1">Manage sessions, view history, and start chatting</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted">
              <Zap className="w-3 h-3 text-green-500" />
              <span>{activeSessions.length} active</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span>{expiredSessions.length} expired</span>
            </div>
          </div>
        </div>

        {/* Top Row: Active + Expired Sessions side-by-side */}
        {hasAnySessions && (
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <Card className="border bg-card">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1.5">
                  {activeSessions.map((sess) => {
                    const isImageGen = sess.session_type === 'image_generation';
                    return (
                      <button
                        key={sess.id}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/60 group border border-transparent hover:border-border"
                        onClick={() => handleStartSession(sess)}
                      >
                        <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                          isImageGen 
                            ? 'bg-gradient-to-br from-blue-500 to-purple-500' 
                            : 'bg-gradient-to-br from-violet-500 to-purple-600'
                        }`}>
                          {isImageGen ? (
                            <ImageIcon className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <MessageSquare className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {isImageGen 
                              ? sess.model_name?.replace('stable-diffusion-', 'SD ')?.replace('-', ' ') || 'Stable Diffusion'
                              : sess.model_name?.replaceAll(/google\/|gemini-|-/g, ' ')
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sess.plan_id?.replace('sd-', 'SD ')} • {sess.hours_purchased}h
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Expired Sessions */}
            {expiredSessions.length > 0 && (
              <Card className="border bg-card">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Expired Sessions</CardTitle>
                  </div>
                  <CardDescription className="text-xs">Click to view or renew</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1.5">
                  {expiredSessions.slice(0, 5).map((sess) => {
                    const isImageGen = sess.session_type === 'image_generation';
                    return (
                      <button
                        key={sess.id}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/60 group opacity-70 hover:opacity-100 border border-transparent hover:border-border"
                        onClick={() => handleStartSession(sess)}
                      >
                        <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                          isImageGen 
                            ? 'bg-gradient-to-br from-blue-500/40 to-purple-500/40' 
                            : 'bg-gradient-to-br from-violet-500/40 to-purple-600/40'
                        }`}>
                          {isImageGen ? (
                            <ImageIcon className="w-3.5 h-3.5 text-white/80" />
                          ) : (
                            <MessageSquare className="w-3.5 h-3.5 text-white/80" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {isImageGen 
                              ? sess.model_name?.replace('stable-diffusion-', 'SD ')?.replace('-', ' ') || 'Stable Diffusion'
                              : sess.model_name?.replaceAll(/google\/|gemini-|-/g, ' ')
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sess.plan_id?.replace('sd-', 'SD ')} • Expired
                          </div>
                        </div>
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Bottom Row: Purchase + Conversations */}
        <div className="grid lg:grid-cols-5 gap-4">
          {/* Purchase New Session */}
          <div className="lg:col-span-2">
            <Card className="border bg-card h-full">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium">
                  {activeSessions.length > 0 ? 'New Session' : 'Get Started'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {activeSessions.length > 0 
                    ? 'Add more time or try a different model' 
                    : 'Select a plan to start your AI session'}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4">
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
          <div className="lg:col-span-3">
            <Card className="border bg-card h-full">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium">Recent Conversations</CardTitle>
                <CardDescription className="text-xs">Your latest chat sessions</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground mb-1">No conversations yet</p>
                    <p className="text-xs text-muted-foreground">
                      {activeSessions.length > 0 
                        ? 'Click an active session to start chatting' 
                        : 'Purchase a session to get started'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[420px]">
                    <div className="space-y-1 pr-3">
                      {conversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent/60 group border border-transparent hover:border-border"
                          onClick={() => navigate('/chat', { 
                            state: { 
                              sessionId: conversation.session_id,
                              conversationId: conversation.id 
                            } 
                          })}
                        >
                          <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-muted">
                            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{conversation.title}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span>{conversation.message_count} msgs</span>
                              <span className="text-muted-foreground/40">•</span>
                              <span>{format(new Date(conversation.updated_at), 'MMM d')}</span>
                              {conversation.user_sessions && (
                                <>
                                  <span className="text-muted-foreground/40">•</span>
                                  <span className="text-primary/70">{conversation.user_sessions.model_name.replace('google/', '')}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </button>
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
