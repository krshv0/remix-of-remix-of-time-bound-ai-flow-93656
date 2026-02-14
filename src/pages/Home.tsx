import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Sparkles, Clock, Zap, Plus, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";

interface UserSession {
  id: string;
  plan_id: string;
  model_name: string;
  hours_purchased: number;
  price_paid: number;
  tokens_used: number;
  expires_at: string;
  status: string;
  created_at: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setUser(user);
      loadSessions(user.id);
    }
  };

  const loadSessions = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'expired':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const expiredSessions = sessions.filter(s => s.status === 'expired');

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
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full border border-foreground flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-lg font-light tracking-tight">AI Access Hub</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 px-3">
              <LogOut className="w-3 h-3 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
            <p className="text-muted-foreground">
              Select a session to continue or purchase a new one
            </p>
          </div>

          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Active Sessions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {activeSessions.map((session) => (
                  <Card 
                    key={session.id}
                    className="border shadow-none hover:border-foreground/50 transition-all cursor-pointer group"
                    onClick={() => navigate('/dashboard', { state: { sessionId: session.id } })}
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-medium capitalize">
                            {session.plan_id} Plan
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {session.model_name.replace(/google\//g, '')}
                          </CardDescription>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}>
                          Active
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{session.hours_purchased}h purchased</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Zap className="w-4 h-4" />
                          <span>{session.tokens_used || 0} tokens</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Expires: {format(new Date(session.expires_at), 'MMM d, h:mm a')}
                      </div>
                      <Button className="w-full h-10 group-hover:bg-foreground/90">
                        Enter Session
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Purchase New Session */}
          <Card className="border shadow-none bg-secondary/30">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Need a new session?</CardTitle>
              <CardDescription>
                Purchase a new AI session to get started or continue your work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="w-full h-11"
              >
                <Plus className="w-4 h-4 mr-2" />
                Purchase New Session
              </Button>
            </CardContent>
          </Card>

          {/* Quick Links */}

          {/* Expired Sessions */}
          {expiredSessions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-muted-foreground">Past Sessions</h2>
              <div className="space-y-2">
                {expiredSessions.slice(0, 3).map((session) => (
                  <Card key={session.id} className="border shadow-none bg-secondary/20">
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-normal capitalize">
                            {session.plan_id} - {session.hours_purchased}h
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Ended {format(new Date(session.expires_at), 'MMM d, yyyy')}
                          </CardDescription>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(session.status)}`}>
                          Expired
                        </span>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
