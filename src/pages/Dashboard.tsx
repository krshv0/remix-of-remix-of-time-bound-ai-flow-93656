import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Sparkles, Plus } from "lucide-react";
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
import { ChatInterface } from "@/components/ChatInterface";
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container flex h-14 items-center justify-between px-4 mx-auto">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
              <div className="w-7 h-7 rounded-full border border-foreground flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-light tracking-tight">AI Access Hub</span>
            </div>
            <nav className="hidden md:flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="h-8 px-3">
                Home
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-3 bg-secondary">
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/chat-history')} 
                className="h-8 px-3 hover:bg-primary/10 transition-colors"
              >
                💬 Chat History
              </Button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {allActiveSessions.length > 1 && activeSession && (
              <Select value={activeSession.id} onValueChange={handleSessionSwitch}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {allActiveSessions.map((sess) => (
                    <SelectItem key={sess.id} value={sess.id}>
                      {sess.plan_id} - {sess.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 px-3">
              <LogOut className="w-3 h-3 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">
        {activeSession ? (
          <>
            <div className="flex items-center justify-between">
              <SessionTimer 
                session={activeSession} 
                onExpire={loadActiveSession}
                tokensUsed={tokenStats?.used}
                tokenLimit={tokenStats?.limit}
              />
              <Dialog open={showPlanSelector} onOpenChange={setShowPlanSelector}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Plus className="w-4 h-4 mr-2" />
                    Buy Another Session
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-light">Purchase Additional Session</DialogTitle>
                    <DialogDescription className="text-sm">
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
            <ChatInterface 
              session={activeSession}
              onTokenUpdate={(used, limit) => setTokenStats({ used, limit })}
            />
          </>
        ) : (
          <Card className="border shadow-none">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl font-light">Choose Your Plan</CardTitle>
              <CardDescription className="text-sm">
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
        )}
      </div>
    </div>
  );
}
