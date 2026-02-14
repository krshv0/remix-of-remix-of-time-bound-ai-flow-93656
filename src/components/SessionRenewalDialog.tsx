/**
 * Session Renewal Dialog
 * Shown when a user tries to access an expired session.
 * Allows them to renew it, preserving conversation/generation history.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Clock, Zap, Image as ImageIcon } from 'lucide-react';
import { PaymentForm } from './PaymentForm';

// Pricing maps (mirroring PlanSelector)
const PLAN_PRICES: Record<string, Record<number, number>> = {
  'basic': { 1: 10, 2: 18, 3: 24, 4: 30 },
  'standard': { 1: 25, 2: 45, 3: 60, 4: 75 },
  'pro': { 1: 30, 2: 55, 3: 75, 4: 95 },
  'sd-basic': { 1: 15, 2: 28, 3: 38, 4: 48 },
  'sd-standard': { 1: 30, 2: 55, 3: 75, 4: 90 },
  'sd-pro': { 1: 50, 2: 90, 3: 125, 4: 150 },
};

interface SessionRenewalDialogProps {
  open: boolean;
  onClose: () => void;
  expiredSession: any;
  onRenewed: (session: any) => void;
}

export function SessionRenewalDialog({
  open,
  onClose,
  expiredSession,
  onRenewed,
}: SessionRenewalDialogProps) {
  const { toast } = useToast();
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  if (!expiredSession) return null;

  const planId = expiredSession.plan_id;
  const prices = PLAN_PRICES[planId] || { 1: 25, 2: 45, 3: 60, 4: 75 };
  const price = prices[hours] || prices[1];
  const isImageGen = expiredSession.session_type === 'image_generation';

  const modelDisplayName = isImageGen
    ? expiredSession.model_name?.replace('stable-diffusion-', 'SD ')?.replace('-', ' ')?.toUpperCase()
    : expiredSession.model_name?.replace('google/', '')?.replaceAll('-', ' ');

  const handleRenew = async () => {
    setLoading(true);
    try {
      // Simulate payment
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Reactivate the session with new expiry and reset credits
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + hours);

      const { data, error } = await (supabase as any)
        .from('user_sessions')
        .update({
          status: 'active',
          expires_at: expiresAt.toISOString(),
          hours_purchased: hours,
          price_paid: price,
          images_generated: 0,
          tokens_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', expiredSession.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Session Renewed!',
        description: `Your ${hours} hour session is now active. All your previous work is preserved.`,
      });

      onRenewed(data);
    } catch (error: any) {
      toast({
        title: 'Renewal Failed',
        description: error.message || 'Failed to renew session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (showPayment) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Renew your {isImageGen ? 'image generation' : 'chat'} session
            </DialogDescription>
          </DialogHeader>
          <PaymentForm
            amount={price}
            onSubmit={handleRenew}
            onCancel={() => setShowPayment(false)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Renew Expired Session
          </DialogTitle>
          <DialogDescription>
            This session has expired. Renew it to continue where you left off — all your {isImageGen ? 'generated images' : 'conversations'} will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Session Info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2">
              {isImageGen ? (
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Zap className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{modelDisplayName}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Plan: {planId?.replace('sd-', 'SD ')?.replace(/^\w/, (c: string) => c.toUpperCase())}
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="text-sm font-normal mb-2 block">Renewal Duration</label>
            <Select value={hours.toString()} onValueChange={(v) => setHours(parseInt(v))}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="2">2 hours</SelectItem>
                <SelectItem value="3">3 hours</SelectItem>
                <SelectItem value="4">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Summary */}
          <div className="p-3 rounded-lg border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration:</span>
              <span>{hours} hour{hours > 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-2 border-t">
              <span>Total:</span>
              <span>₹{price}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Go to Dashboard
            </Button>
            <Button className="flex-1" onClick={() => setShowPayment(true)}>
              <Clock className="w-4 h-4 mr-2" />
              Renew Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}