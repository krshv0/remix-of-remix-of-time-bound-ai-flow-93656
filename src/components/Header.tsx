import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-14 items-center justify-between px-4 mx-auto">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-7 h-7 rounded-full border border-foreground flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-lg font-light tracking-tight">AI Access Hub</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <a href="#pricing" className="text-sm hover:opacity-70 transition-opacity">
            Pricing
          </a>
          <a href="#features" className="text-sm hover:opacity-70 transition-opacity">
            Features
          </a>
          <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="h-8 px-3">
            Sign In
          </Button>
          <Button size="sm" onClick={() => navigate('/auth')} className="h-8 px-3">
            Get Started
          </Button>
        </nav>
        
        <Button size="sm" className="md:hidden h-8 px-3" onClick={() => navigate('/auth')}>
          Sign In
        </Button>
      </div>
    </header>
  );
};
