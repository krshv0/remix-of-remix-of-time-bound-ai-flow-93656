/**
 * Welcome Screen Component
 * Displays when chat is empty with suggested prompts
 */

import { Sparkles, Lightbulb, Code, FileText, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StarterPrompt } from '../types';

interface WelcomeScreenProps {
  title?: string;
  subtitle?: string;
  starterPrompts?: StarterPrompt[];
  onPromptClick?: (prompt: string) => void;
  className?: string;
}

const DEFAULT_PROMPTS: StarterPrompt[] = [
  {
    id: '1',
    title: 'Explain a concept',
    prompt: 'Explain how async/await works in JavaScript with examples',
    icon: 'lightbulb',
  },
  {
    id: '2',
    title: 'Write some code',
    prompt: 'Write a React component that implements infinite scroll',
    icon: 'code',
  },
  {
    id: '3',
    title: 'Summarize text',
    prompt: 'Summarize the key points from this article...',
    icon: 'file',
  },
  {
    id: '4',
    title: 'Help me brainstorm',
    prompt: 'Help me brainstorm ideas for a mobile app that helps people...',
    icon: 'message',
  },
];

const ICONS: Record<string, typeof Lightbulb> = {
  lightbulb: Lightbulb,
  code: Code,
  file: FileText,
  message: MessageSquare,
};

export function WelcomeScreen({
  title = 'How can I help you today?',
  subtitle = 'Ask me anything or try one of these suggestions',
  starterPrompts = DEFAULT_PROMPTS,
  onPromptClick,
  className,
}: WelcomeScreenProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-4 py-12',
        'animate-fade-in',
        className
      )}
    >
      {/* Logo/Icon */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
        <Sparkles className="w-8 h-8 text-white" />
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-semibold mb-2">{title}</h1>
      <p className="text-muted-foreground mb-8 max-w-md">{subtitle}</p>

      {/* Starter prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {starterPrompts.map((prompt) => {
          const Icon = ICONS[prompt.icon || 'message'] || MessageSquare;
          return (
            <button
              key={prompt.id}
              onClick={() => onPromptClick?.(prompt.prompt)}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl text-left',
                'bg-muted/50 hover:bg-muted border border-transparent hover:border-border',
                'transition-all duration-200 group'
              )}
            >
              <div className="p-2 rounded-lg bg-background group-hover:bg-primary/10 transition-colors">
                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm mb-0.5">{prompt.title}</div>
                <div className="text-xs text-muted-foreground truncate">{prompt.prompt}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
