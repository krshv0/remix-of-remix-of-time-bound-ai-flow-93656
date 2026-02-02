import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PricingTier {
  name: string;
  model: string;
  description: string;
  prices: {
    oneHour: number;
    twoHours: number;
    extraHour: number;
  };
  features: string[];
  popular?: boolean;
}

interface PricingCardProps {
  tier: PricingTier;
}

export const PricingCard = ({ tier }: PricingCardProps) => {
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);

  return (
    <>
    <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Your Selection</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>You've selected the <span className="font-semibold text-foreground">{tier.name}</span> plan with {tier.model}.</p>
            <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Starting price:</span>
                <span className="font-semibold">₹{tier.prices.oneHour}/hour</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>2 hours:</span>
                <span className="font-semibold">₹{tier.prices.twoHours}</span>
              </div>
            </div>
            <p className="text-sm">Continue to sign up and start your session?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => navigate('/auth')}>
            Continue to Sign Up
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Card 
      className={`relative group transition-all duration-500 border backdrop-blur-sm h-full ${
        tier.popular 
          ? 'border-white bg-white/5 shadow-xl shadow-white/10 hover:shadow-2xl hover:shadow-white/20 scale-105' 
          : 'border-white/20 bg-white/[0.02] hover:bg-white/5 hover:border-white/40 hover:scale-105'
      }`}
    >
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="px-4 py-1 text-xs font-medium rounded-full bg-white text-black animate-pulse">
            Most Popular
          </span>
        </div>
      )}
      
      {/* Gradient glow effect */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <CardHeader className="text-center space-y-3 relative">
        <CardTitle className="text-2xl font-bold tracking-tight">{tier.name}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">{tier.model}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-8 relative">
        <div className="space-y-3 text-center">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold tracking-tight">₹{tier.prices.oneHour}</span>
            <span className="text-sm text-muted-foreground font-medium">/hour</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t border-white/10">
            <p>₹{tier.prices.twoHours} for 2 hours</p>
            <p>₹{tier.prices.extraHour} per extra hour</p>
          </div>
        </div>
        
        <div className="space-y-3 pt-4">
          {tier.features.map((feature, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 group/feature"
              style={{
                animation: 'fade-in 0.3s ease-out',
                animationDelay: `${index * 0.05}s`,
                animationFillMode: 'backwards'
              }}
            >
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover/feature:bg-white/20 transition-colors">
                <Check className="w-3 h-3" />
              </div>
              <span className="text-sm leading-relaxed">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="relative">
        <Button 
          variant={tier.popular ? "default" : "outline"}
          className={`w-full h-11 text-sm font-medium transition-all duration-300 ${
            tier.popular 
              ? 'bg-white text-black hover:bg-white/90 shadow-lg hover:shadow-xl' 
              : 'border-white/30 hover:bg-white hover:text-black'
          }`}
          onClick={() => setShowConfirmation(true)}
        >
          Get Started
        </Button>
      </CardFooter>
    </Card>
    </>
  );
};
