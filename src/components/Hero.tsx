import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      </div>
      
      <div className="container relative z-10 px-4 py-20 mx-auto">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm animate-fade-in hover:scale-105 transition-transform">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span className="text-xs font-normal">Pay-per-hour AI Access</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight animate-fade-up animation-delay-200">
            <span className="inline-block hover:animate-pulse">Premium AI Models</span>
            <span className="block mt-2 bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent">
              By The Hour
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light animate-fade-up animation-delay-400">
            Access cutting-edge AI models like Gemini 2.5 Pro and Flash. 
            No subscriptions, no commitments—just pure flexibility with hourly access.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 animate-fade-up animation-delay-600">
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="h-12 px-8 group hover:shadow-xl hover:shadow-white/20 transition-all duration-300"
            >
              <Zap className="w-4 h-4 mr-2 group-hover:animate-pulse" />
              Get Started Now
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => {
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="h-12 px-8 border-white/30 hover:bg-white hover:text-black transition-all duration-300"
            >
              <Clock className="w-4 h-4 mr-2" />
              View Pricing
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-8 pt-8 text-xs text-muted-foreground animate-fade-up animation-delay-700">
            <div className="flex items-center gap-2 hover:text-foreground transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
              <span>No subscriptions</span>
            </div>
            <div className="flex items-center gap-2 hover:text-foreground transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" style={{ animationDelay: "0.3s" }} />
              <span>Pay as you go</span>
            </div>
            <div className="flex items-center gap-2 hover:text-foreground transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" style={{ animationDelay: "0.6s" }} />
              <span>Instant access</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
