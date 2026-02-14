/**
 * Image Generation Session Page
 * Dedicated page for Stable Diffusion image generation sessions
 * Mirrors Chat.tsx architecture for feature parity
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles, Moon, Sun, ChevronLeft, ChevronRight, Clock, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { useTheme } from "@/components/chat-ui";
import { ImageGenInterface } from "@/components/image-gen";
import { SessionRenewalDialog } from "@/components/SessionRenewalDialog";
import { cn } from "@/lib/utils";

export default function ImageGenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statsSidebarOpen, setStatsSidebarOpen] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [expiredSession, setExpiredSession] = useState<any>(null);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [generationStats, setGenerationStats] = useState<{
    imagesUsed: number;
    imagesLimit: number;
  } | null>(null);

  const handleExpiration = useCallback(async () => {
    try {
      await (supabase as any)
        .from('user_sessions')
        .update({ status: 'expired' })
        .eq('id', activeSession.id);

      toast({
        title: "Session Expired",
        description: "Your image generation session has ended. Please start a new session.",
        variant: "destructive",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error updating session:', error);
    }
  }, [activeSession, navigate, toast]);

  const loadActiveSession = useCallback(async (sessionId?: string) => {
    try {
      let query = (supabase as any)
        .from('user_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .eq('session_type', 'image_generation');

      if (sessionId) {
        query = query.eq('id', sessionId).single();
      } else {
        query = query.order('created_at', { ascending: false }).limit(1).single();
      }

      const { data, error } = await query;

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // If a specific session ID was requested, check if it's expired
        if (sessionId) {
          const { data: expiredData } = await (supabase as any)
            .from('user_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', user?.id)
            .eq('status', 'expired')
            .eq('session_type', 'image_generation')
            .maybeSingle();

          if (expiredData) {
            setExpiredSession(expiredData);
            setShowRenewalDialog(true);
            return;
          }
        }

        toast({
          title: "No Active Session",
          description: "Please purchase an image generation session from the dashboard.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      // Load config for this session
      const { data: config } = await (supabase as any)
        .from('session_config')
        .select('image_credits_per_hour')
        .eq('plan_id', data.plan_id)
        .maybeSingle();

      const sessionWithConfig = {
        ...data,
        image_credits_per_hour: config?.image_credits_per_hour || 20,
      };

      setActiveSession(sessionWithConfig);
      setGenerationStats({
        imagesUsed: data.images_generated || 0,
        imagesLimit: config?.image_credits_per_hour || 20,
      });
    } catch (error: any) {
      console.error('Error loading session:', error);
      toast({
        title: "Error",
        description: "Failed to load session",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  }, [user?.id, toast, navigate]);

  const refreshStats = useCallback(async () => {
    if (!activeSession) return;

    try {
      const { data } = await (supabase as any)
        .from('user_sessions')
        .select('images_generated')
        .eq('id', activeSession.id)
        .single();

      if (data) {
        setGenerationStats(prev => prev ? {
          ...prev,
          imagesUsed: data.images_generated || 0,
        } : null);
        setActiveSession((prev: any) => prev ? {
          ...prev,
          images_generated: data.images_generated || 0,
        } : null);
      }
    } catch (e) {
      console.error('Failed to refresh stats:', e);
    }
  }, [activeSession]);

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
      const sessionId = location.state?.sessionId;
      loadActiveSession(sessionId);
    }
  }, [user, location.state?.sessionId, loadActiveSession]);

  // Timer effect
  useEffect(() => {
    if (!activeSession) return;

    const updateTimer = () => {
      const now = Date.now();
      const expiresAt = new Date(activeSession.expires_at).getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        handleExpiration();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);

      if (hours === 0 && minutes === 5 && seconds === 0) {
        toast({
          title: "Session Expiring Soon",
          description: "Your session will expire in 5 minutes.",
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeSession, toast, handleExpiration]);

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

  const handleSessionRenewed = useCallback(async (renewedSession: any) => {
    setShowRenewalDialog(false);
    setExpiredSession(null);
    // Reload the now-active session
    await loadActiveSession(renewedSession.id);
  }, [loadActiveSession]);

  if (loading || (!activeSession && !showRenewalDialog)) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Show renewal dialog if session is expired
  if (showRenewalDialog && expiredSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <SessionRenewalDialog
          open={showRenewalDialog}
          onClose={() => {
            setShowRenewalDialog(false);
            navigate('/dashboard');
          }}
          expiredSession={expiredSession}
          onRenewed={handleSessionRenewed}
        />
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const modelDisplayName = activeSession.model_name
    ?.replace('stable-diffusion-', 'SD ')
    ?.replace('-', ' ')
    ?.toUpperCase() || 'Stable Diffusion';

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
        <div className="flex h-14 items-center justify-between px-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-6">
            <button 
              className="flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0" 
              onClick={() => navigate('/home')}
              type="button"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
                <ImageIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-medium tracking-tight hidden sm:inline">AI Image Studio</span>
            </button>
            <nav className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="h-8 px-3 text-muted-foreground hover:text-foreground">
                Home
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="h-8 px-3 text-muted-foreground hover:text-foreground">
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-3 bg-primary/10 text-foreground"
              >
                Image Studio
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* Image Gen Interface */}
        <div className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          statsSidebarOpen ? "mr-80" : "mr-0"
        )}>
          <ImageGenInterface 
            session={activeSession}
            onCreditsUpdate={refreshStats}
            className="h-full"
          />
        </div>

        {/* Stats Sidebar */}
        <div className={cn(
          "absolute right-0 top-0 bottom-0 w-80 border-l bg-background transition-transform duration-300 ease-in-out",
          statsSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="h-full flex flex-col p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Session Stats
              </h3>
            </div>

            {/* Session Details */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="font-medium text-sm">{modelDisplayName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="font-medium text-sm capitalize">{activeSession.plan_id?.replace('sd-', 'SD ')}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Time Remaining</p>
                  <p className="font-medium text-sm">{timeRemaining}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hours Purchased</p>
                  <p className="font-medium text-sm">{activeSession.hours_purchased}h</p>
                </div>
              </div>

              {generationStats && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-xs text-muted-foreground">Image Credits</span>
                    <span className="font-medium text-xs">
                      {generationStats.imagesUsed} / {generationStats.imagesLimit}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.min((generationStats.imagesUsed / (generationStats.imagesLimit || 1)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {generationStats.imagesLimit - generationStats.imagesUsed} credits remaining
                  </p>
                </div>
              )}

              {/* Generation Info */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-xs font-medium">Quick Tips</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Press ⌘K to browse generations</li>
                  <li>• Click images to view full size</li>
                  <li>• Use negative prompts for better results</li>
                </ul>
              </div>
            </div>

            <div className="flex-1" />

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "absolute top-4 z-10 h-8 w-8 rounded-full shadow-lg transition-all duration-300",
            statsSidebarOpen ? "right-[21rem]" : "right-4"
          )}
          onClick={() => setStatsSidebarOpen(!statsSidebarOpen)}
        >
          {statsSidebarOpen ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
