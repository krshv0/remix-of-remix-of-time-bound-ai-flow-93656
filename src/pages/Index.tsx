import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { PricingSection } from "@/components/PricingSection";
import { Features } from "@/components/Features";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <PricingSection />
      <Features />
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2024 AI Access Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
