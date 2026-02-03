import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Sparkles, Plus, Moon, Sun } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Session, User } from "@supabase/supabase-js";
import { PlanSelector } from "@/components/PlanSelector";
import { SessionTimer } from "@/components/SessionTimer";
import { ModernChatInterface, useTheme } from "@/components/chat-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [allActiveSessions, setAllActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenStats, setTokenStats] = useState<{ used: number; limit: number } | null>(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
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
      const sessionId = location.state?.sessionId;
      loadActiveSession(sessionId);
      loadAllActiveSessions();
    }
  }, [user, location.state?.sessionId]);

  const loadActiveSession = async (sessionId?: string) => {
    try {
      let query = (supabase as any)
        .from('user_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (sessionId) {
        query = query.eq('id', sessionId).single();
      } else {
        query = query.order('created_at', { ascending: false }).limit(1).single();
      }

      const { data, error } = await query;

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setActiveSession(data);

      // Load token limit for this session
      if (data) {
        const { data: config } = await (supabase as any)
          .from('session_config')
          .select('token_limit_per_hour')
          .eq('plan_id', data.plan_id)
          .eq('model_name', data.model_name)
          .single();

        if (config) {
          setTokenStats({
            used: data.tokens_used || 0,
            limit: config.token_limit_per_hour,
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading session:', error);
    }
  };

  const loadAllActiveSessions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllActiveSessions(data || []);
    } catch (error: any) {
      console.error('Error loading all sessions:', error);
    }
  };

  const handleSessionSwitch = async (sessionId: string) => {
    if (sessionId === activeSession?.id) return;
    
    setTokenStats(null);
    await loadActiveSession(sessionId);
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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
        <div className="flex h-14 items-center justify-between px-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/home')}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-medium tracking-tight hidden sm:inline">AI Access Hub</span>
            </div>
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
            {allActiveSessions.length > 1 && activeSession && (
              <Select value={activeSession.id} onValueChange={handleSessionSwitch}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {allActiveSessions.map((sess) => (
                    <SelectItem key={sess.id} value={sess.id}>
                      {sess.plan_id} - {sess.model_name.replace(/google\//g, '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeSession ? (
          <>
            {/* Session Info Bar */}
            <div className="border-b bg-muted/30 px-4 py-2">
              <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
                <SessionTimer 
                  session={activeSession} 
                  onExpire={loadActiveSession}
                  tokensUsed={tokenStats?.used}
                  tokenLimit={tokenStats?.limit}
                />
                <Dialog open={showPlanSelector} onOpenChange={setShowPlanSelector}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">New Session</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold">Purchase Additional Session</DialogTitle>
                      <DialogDescription className="text-sm text-muted-foreground">
                        Your current session will remain active. Select a plan for your next session.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      <PlanSelector 
                        onSessionStart={() => {
                          loadActiveSession();
                          loadAllActiveSessions();
                          setShowPlanSelector(false);
                          toast({
                            title: "Session Queued",
                            description: "Your new session will be available when the current one expires.",
                          });
                        }} 
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* Chat Interface */}
            <div className="flex-1 overflow-hidden">
              <ModernChatInterface 
                session={activeSession}
                onTokenUpdate={(used, limit) => setTokenStats({ used, limit })}
                className="h-full"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="border shadow-lg max-w-4xl w-full">
              <CardHeader className="space-y-1 text-center pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-semibold">Choose Your Plan</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Select a plan to start your AI session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlanSelector onSessionStart={() => {
                  loadActiveSession();
                  loadAllActiveSessions();
                }} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
