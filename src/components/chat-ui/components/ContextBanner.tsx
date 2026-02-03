/**
 * Context Banner Component
 * Displays collapsible system-level notes at the top of the chat
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextBannerProps {
  title?: string;
  content: string;
  type?: 'info' | 'warning' | 'system';
  dismissible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export function ContextBanner({
  title = 'Context',
  content,
  type = 'info',
  dismissible = true,
  defaultCollapsed = true,
  className,
}: ContextBannerProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const typeStyles = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
    system: 'bg-muted border-border text-muted-foreground',
  };

  const iconColor = {
    info: 'text-blue-500',
    warning: 'text-amber-500',
    system: 'text-muted-foreground',
  };

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden transition-all',
        typeStyles[type],
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-2.5',
          'hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
          'text-left'
        )}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          <Info className={cn('w-4 h-4', iconColor[type])} />
          <span className="text-sm font-medium">{title}</span>
        </div>

        {dismissible && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-3 pt-1">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      )}
    </div>
  );
}
