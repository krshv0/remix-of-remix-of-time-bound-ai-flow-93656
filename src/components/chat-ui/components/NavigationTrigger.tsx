/**
 * Navigation Trigger Button
 * A prominent button that opens the message navigation panel
 */

import React from 'react';
import { Compass, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationTriggerProps {
  onClick: () => void;
  messageCount: number;
  className?: string;
  variant?: 'default' | 'compact';
}

export function NavigationTrigger({
  onClick,
  messageCount,
  className,
  variant = 'default',
}: NavigationTriggerProps) {
  // Don't show if no messages
  if (messageCount === 0) return null;

  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-full',
          'bg-primary/10 text-primary',
          'hover:bg-primary/20 hover:scale-105',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'transition-all duration-200',
          className
        )}
        aria-label={`Open message navigation. ${messageCount} messages.`}
        title="Jump to message (⌘K)"
      >
        <Compass className="w-4 h-4" />
      </button>
    );
  }
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl',
        'bg-primary/10 border border-primary/20',
        'text-sm text-primary font-medium',
        'hover:bg-primary/15 hover:border-primary/30 hover:shadow-md',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'transition-all duration-200 shadow-sm',
        'group',
        className
      )}
      aria-label={`Open message navigation. ${messageCount} messages.`}
      title="Jump to message (⌘K)"
    >
      <Compass className="w-4 h-4" />
      <span>Navigate</span>
      <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-xs">
        {messageCount}
      </span>
      <kbd className={cn(
        'hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md',
        'bg-background/80 text-[10px] font-mono text-muted-foreground',
        'border border-border/50'
      )}>
        <Command className="w-2.5 h-2.5" />K
      </kbd>
    </button>
  );
}
