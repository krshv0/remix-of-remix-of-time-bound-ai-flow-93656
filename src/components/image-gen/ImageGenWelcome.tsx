/**
 * Image Generation Welcome Screen
 * Displayed when no generations have been made yet
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Sparkles, 
  Mountain, 
  Palette, 
  Camera, 
  Wand2,
  Building,
  Trees
} from 'lucide-react';

interface ImageGenWelcomeProps {
  onPromptClick: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  {
    icon: Mountain,
    title: 'Landscape',
    prompt: 'A majestic mountain range at golden hour, with mist in the valleys and snow-capped peaks glowing orange',
  },
  {
    icon: Palette,
    title: 'Abstract Art',
    prompt: 'Abstract fluid art with deep blues and gold, swirling patterns reminiscent of marble and ocean waves',
  },
  {
    icon: Camera,
    title: 'Portrait',
    prompt: 'Cinematic portrait of a wise elderly person, dramatic lighting, detailed wrinkles, soulful eyes',
  },
  {
    icon: Building,
    title: 'Architecture',
    prompt: 'Futuristic eco-friendly skyscraper covered in vertical gardens, sunset lighting, photorealistic',
  },
  {
    icon: Trees,
    title: 'Fantasy',
    prompt: 'Enchanted forest with bioluminescent mushrooms, magical fireflies, ancient twisted trees, mystical atmosphere',
  },
  {
    icon: Sparkles,
    title: 'Sci-Fi',
    prompt: 'Cyberpunk city street at night, neon signs reflecting on wet pavement, flying vehicles, dense urban atmosphere',
  },
];

export function ImageGenWelcome({ onPromptClick }: ImageGenWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 animate-in fade-in duration-500">
      {/* Hero */}
      <div className="text-center space-y-4 mb-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg">
          <Wand2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Stable Diffusion Studio
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Create stunning images with AI. Describe what you want to see and watch it come to life.
        </p>
      </div>

      {/* Starter Prompts */}
      <div className="w-full max-w-3xl">
        <h2 className="text-sm font-medium text-muted-foreground mb-4 text-center">
          Try a starter prompt
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STARTER_PROMPTS.map((item) => (
            <Card
              key={item.title}
              className="p-4 cursor-pointer transition-all hover:border-foreground/50 hover:shadow-md group"
              onClick={() => onPromptClick(item.prompt)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.prompt}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-12 text-center space-y-2">
        <h3 className="text-sm font-medium">Tips for better results</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Be specific about colors, lighting, and composition</li>
          <li>• Include style references like "photorealistic" or "oil painting"</li>
          <li>• Use the negative prompt to avoid unwanted elements</li>
          <li>• Experiment with different CFG scales for creativity vs accuracy</li>
        </ul>
      </div>
    </div>
  );
}
