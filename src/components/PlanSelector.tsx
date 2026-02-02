import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Zap } from "lucide-react";
import { PaymentForm } from "./PaymentForm";

interface PlanSelectorProps {
  onSessionStart: () => void;
}

const plans = [
  {
    id: "basic",
    name: "Basic",
    model: "google/gemini-2.5-flash-lite",
    displayModel: "Gemini 2.5 Flash Lite",
    prices: { 1: 10, 2: 18, 3: 24, 4: 30 },
  },
  {
    id: "standard",
    name: "Standard",
    model: "google/gemini-2.5-flash",
    displayModel: "Gemini 2.5 Flash",
    prices: { 1: 25, 2: 45, 3: 60, 4: 75 },
  },
  {
    id: "pro",
    name: "Pro",
    model: "google/gemini-2.5-pro",
    displayModel: "Gemini 2.5 Pro",
    prices: { 1: 30, 2: 55, 3: 75, 4: 95 },
  },
];

export const PlanSelector = ({ onSessionStart }: PlanSelectorProps) => {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState("standard");
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const plan = plans.find(p => p.id === selectedPlan);
      if (!plan) throw new Error("Plan not found");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Create session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + hours);

      const { error } = await (supabase as any).from('user_sessions').insert({
        user_id: user.id,
        plan_id: plan.id,
        model_name: plan.model,
        hours_purchased: hours,
        price_paid: plan.prices[hours as keyof typeof plan.prices],
        expires_at: expiresAt.toISOString(),
        status: 'active',
      });

      if (error) throw error;

      toast({
        title: "Payment Successful!",
        description: `Your ${hours} hour ${plan.name} session is now active.`,
      });

      onSessionStart();
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

  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const price = selectedPlanData?.prices[hours as keyof typeof selectedPlanData.prices] || 0;

  if (showPayment) {
    return (
      <PaymentForm
        amount={price}
        onSubmit={handlePayment}
        onCancel={() => setShowPayment(false)}
        loading={loading}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`cursor-pointer transition-all border ${
              selectedPlan === plan.id ? 'border-foreground bg-secondary' : 'border-border hover:border-foreground/50'
            }`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg font-light">{plan.name}</CardTitle>
              <CardDescription className="text-xs">{plan.displayModel}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light">₹{plan.prices[1]}</div>
              <div className="text-xs text-muted-foreground">per hour</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-normal mb-2 block">Duration</label>
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

        <div className="p-4 rounded border border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Plan:</span>
            <span className="font-normal">{selectedPlanData?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-normal">{hours} hour{hours > 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between font-normal text-base pt-2 border-t border-border">
            <span>Total:</span>
            <span>₹{price}</span>
          </div>
        </div>

        <Button 
          className="w-full h-11" 
          onClick={() => setShowPayment(true)}
          disabled={loading}
        >
          <Zap className="w-4 h-4 mr-2" />
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};
