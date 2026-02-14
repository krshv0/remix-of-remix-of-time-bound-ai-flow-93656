import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Zap, Image as ImageIcon, MessageSquare, Film } from "lucide-react";
import { PaymentForm } from "./PaymentForm";

interface PlanSelectorProps {
  onSessionStart: () => void;
}

// Chat (Gemini) Plans
const chatPlans = [
  {
    id: "basic",
    name: "Basic",
    model: "google/gemini-2.5-flash-lite",
    displayModel: "Gemini 2.5 Flash Lite",
    prices: { 1: 10, 2: 18, 3: 24, 4: 30 },
    sessionType: "chat",
  },
  {
    id: "standard",
    name: "Standard",
    model: "google/gemini-2.5-flash",
    displayModel: "Gemini 2.5 Flash",
    prices: { 1: 25, 2: 45, 3: 60, 4: 75 },
    sessionType: "chat",
  },
  {
    id: "pro",
    name: "Pro",
    model: "google/gemini-2.5-pro",
    displayModel: "Gemini 2.5 Pro",
    prices: { 1: 30, 2: 55, 3: 75, 4: 95 },
    sessionType: "chat",
  },
];

// Stable Diffusion Image Generation Plans
const imagePlans = [
  {
    id: "sd-basic",
    name: "Basic",
    model: "stable-diffusion-v1-5",
    displayModel: "Stable Diffusion 1.5",
    prices: { 1: 15, 2: 28, 3: 38, 4: 48 },
    credits: 20,
    sessionType: "image_generation",
  },
  {
    id: "sd-standard",
    name: "Standard",
    model: "stable-diffusion-xl",
    displayModel: "Stable Diffusion XL",
    prices: { 1: 30, 2: 55, 3: 75, 4: 90 },
    credits: 40,
    sessionType: "image_generation",
  },
  {
    id: "sd-pro",
    name: "Pro",
    model: "stable-diffusion-3",
    displayModel: "Stable Diffusion 3",
    prices: { 1: 50, 2: 90, 3: 125, 4: 150 },
    credits: 80,
    sessionType: "image_generation",
  },
];

// Video Generation Plans (pack-based, not hourly)
const videoPlans = [
  {
    id: "video-starter",
    name: "Starter Video Pack",
    model: "tencent/HunyuanVideo",
    displayModel: "HunyuanVideo",
    price: 30,
    videoCount: 1,
    sessionType: "video",
  },
  {
    id: "video-pro",
    name: "Pro Video Pack",
    model: "tencent/HunyuanVideo",
    displayModel: "HunyuanVideo",
    price: 50,
    videoCount: 3,
    sessionType: "video",
  },
  {
    id: "video-unlimited",
    name: "Unlimited Video",
    model: "tencent/HunyuanVideo",
    displayModel: "HunyuanVideo",
    price: 150,
    videoCount: 10,
    sessionType: "video",
  },
];

export const PlanSelector = ({ onSessionStart }: PlanSelectorProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sessionMode, setSessionMode] = useState<'chat' | 'image' | 'video'>('chat');
  const [selectedPlan, setSelectedPlan] = useState("standard");
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const plans = sessionMode === 'chat' ? chatPlans : sessionMode === 'image' ? imagePlans : [];

  const handleModeChange = (mode: 'chat' | 'image' | 'video') => {
    setSessionMode(mode);
    if (mode === 'chat') setSelectedPlan('standard');
    else if (mode === 'image') setSelectedPlan('sd-standard');
    else setSelectedPlan('video-pro');
  };

  const getPrice = () => {
    if (sessionMode === 'video') {
      const vp = videoPlans.find(p => p.id === selectedPlan);
      return vp?.price || 0;
    }
    const plan = plans.find(p => p.id === selectedPlan);
    return plan?.prices[hours as keyof typeof plan.prices] || 0;
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (sessionMode === 'video') {
        const vPlan = videoPlans.find(p => p.id === selectedPlan);
        if (!vPlan) throw new Error("Plan not found");

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24h expiry for video packs

        const { data: sessionData, error } = await (supabase as any)
          .from('user_sessions')
          .insert({
            user_id: user.id,
            plan_id: vPlan.id,
            model_name: vPlan.model,
            hours_purchased: 24,
            price_paid: vPlan.price,
            expires_at: expiresAt.toISOString(),
            status: 'active',
            session_type: 'video',
            videos_remaining: vPlan.videoCount,
            videos_generated: 0,
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Payment Successful!",
          description: `Your ${vPlan.name} is now active with ${vPlan.videoCount} videos.`,
        });

        onSessionStart();
        navigate('/video-gen', { state: { sessionId: sessionData.id } });
        return;
      }

      // Chat / Image sessions
      const plan = plans.find(p => p.id === selectedPlan);
      if (!plan) throw new Error("Plan not found");

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + hours);

      const { data: sessionData, error } = await (supabase as any)
        .from('user_sessions')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          model_name: plan.model,
          hours_purchased: hours,
          price_paid: plan.prices[hours as keyof typeof plan.prices],
          expires_at: expiresAt.toISOString(),
          status: 'active',
          session_type: plan.sessionType,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Payment Successful!",
        description: `Your ${hours} hour ${plan.name} session is now active.`,
      });

      onSessionStart();

      if (plan.sessionType === 'image_generation') {
        navigate('/image-gen', { state: { sessionId: sessionData.id } });
      } else {
        navigate('/chat', { state: { sessionId: sessionData.id } });
      }
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

  const price = getPrice();

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
      {/* Session Type Tabs */}
      <Tabs value={sessionMode} onValueChange={(v) => handleModeChange(v as 'chat' | 'image' | 'video')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Image
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Film className="w-4 h-4" />
            Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <p className="text-xs text-muted-foreground mb-4">Chat with advanced AI models powered by Google Gemini</p>
        </TabsContent>
        <TabsContent value="image" className="mt-4">
          <p className="text-xs text-muted-foreground mb-4">Generate stunning images with Stable Diffusion AI</p>
        </TabsContent>
        <TabsContent value="video" className="mt-4">
          <p className="text-xs text-muted-foreground mb-4">Generate AI videos with HunyuanVideo</p>
        </TabsContent>
      </Tabs>

      {/* Video Plans (pack-based) */}
      {sessionMode === 'video' ? (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            {videoPlans.map((plan) => (
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
                  <div className="text-2xl font-light">₹{plan.price}</div>
                  <div className="text-xs text-muted-foreground">{plan.videoCount} video{plan.videoCount > 1 ? 's' : ''}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="p-4 rounded border border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pack:</span>
              <span>{videoPlans.find(p => p.id === selectedPlan)?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Videos:</span>
              <span>{videoPlans.find(p => p.id === selectedPlan)?.videoCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valid for:</span>
              <span>24 hours</span>
            </div>
            <div className="flex justify-between font-normal text-base pt-2 border-t border-border">
              <span>Total:</span>
              <span>₹{price}</span>
            </div>
          </div>

          <Button className="w-full h-11" onClick={() => setShowPayment(true)} disabled={loading}>
            <Film className="w-4 h-4 mr-2" />
            Continue to Payment
          </Button>
        </>
      ) : (
        <>
          {/* Chat / Image Plan Cards */}
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
                  {'credits' in plan && (
                    <div className="text-xs text-primary mt-1">
                      {(plan as any).credits} images/hour
                    </div>
                  )}
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
                <span className="font-normal">{plans.find(p => p.id === selectedPlan)?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-normal">{plans.find(p => p.id === selectedPlan)?.displayModel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-normal">{hours} hour{hours > 1 ? 's' : ''}</span>
              </div>
              {sessionMode === 'image' && plans.find(p => p.id === selectedPlan) && 'credits' in (plans.find(p => p.id === selectedPlan) as any) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Image Credits:</span>
                  <span className="font-normal">{(plans.find(p => p.id === selectedPlan) as any).credits * hours}</span>
                </div>
              )}
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
              {sessionMode === 'image' ? (
                <ImageIcon className="w-4 h-4 mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Continue to Payment
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
