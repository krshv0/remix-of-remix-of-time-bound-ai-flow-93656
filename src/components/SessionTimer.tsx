import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SessionTimerProps {
  session: any;
  onExpire: () => void;
  tokensUsed?: number;
  tokenLimit?: number;
}

export const SessionTimer = ({ session, onExpire, tokensUsed, tokenLimit }: SessionTimerProps) => {
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(session.expires_at).getTime();
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

      // Show warning at 5 minutes remaining
      if (hours === 0 && minutes === 5 && seconds === 0) {
        toast({
          title: "Session Expiring Soon",
          description: "Your session will expire in 5 minutes. Consider extending your time.",
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session, toast]);

  const handleExpiration = async () => {
    try {
      await (supabase as any)
        .from('user_sessions')
        .update({ status: 'expired' })
        .eq('id', session.id);

      toast({
        title: "Session Expired",
        description: "Your session has ended. Please start a new session to continue.",
        variant: "destructive",
      });

      onExpire();
    } catch (error: any) {
      console.error('Error updating session:', error);
    }
  };

  const handleExtend = () => {
    toast({
      title: "Extend Session",
      description: "Session extension feature coming soon!",
    });
  };

  return (
    <Card className="border shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg font-light">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active Session
          </span>
          <Button variant="outline" size="sm" onClick={handleExtend} className="h-8">
            <RefreshCw className="w-3 h-3 mr-2" />
            Extend
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Model</p>
            <p className="font-normal text-sm capitalize">{session.model_name.replace(/google\/|gemini-|-/g, ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="font-normal text-sm capitalize">{session.plan_id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time Remaining</p>
            <p className="font-normal text-sm">{timeRemaining}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hours Purchased</p>
            <p className="font-normal text-sm">{session.hours_purchased}h</p>
          </div>
        </div>

        {tokenLimit && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Token Usage</span>
              <span className="font-normal">
                {(tokensUsed || 0).toLocaleString()} / {tokenLimit.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className="bg-foreground h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(((tokensUsed || 0) / tokenLimit) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {tokenLimit - (tokensUsed || 0) > 0 
                ? `${(tokenLimit - (tokensUsed || 0)).toLocaleString()} tokens remaining` 
                : 'Token limit reached'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
