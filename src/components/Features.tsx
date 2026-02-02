import { Brain, Clock, Shield, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Clock,
    title: "Flexible Hourly Access",
    description: "Pay only for the hours you need. No monthly commitments or wasted subscriptions.",
  },
  {
    icon: Brain,
    title: "Multiple AI Models",
    description: "Access GPT-4o, Gemini 1.5 Pro, and more cutting-edge AI models in one platform.",
  },
  {
    icon: Zap,
    title: "Instant Activation",
    description: "Start using AI models immediately after purchase. No waiting, no setup required.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your conversations are encrypted and never used for training. Complete privacy guaranteed.",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-24 px-4 bg-white/[0.02] relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto relative">
        <div className="text-center space-y-4 mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Why Choose AI Access Hub
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The smartest way to access premium AI models without breaking the bank
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group relative transition-all duration-500 hover:scale-105 animate-fade-up border-white/20 bg-white/[0.02] hover:bg-white/5 hover:border-white/40 backdrop-blur-sm" 
              style={{ 
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'backwards'
              }}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <CardHeader className="relative">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4 group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
                  <feature.icon className="w-6 h-6 group-hover:animate-pulse" />
                </div>
                <CardTitle className="group-hover:text-white transition-colors">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
