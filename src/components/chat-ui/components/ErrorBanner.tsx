/**
 * Error Banner Component
 * Displays inline error messages with retry option
 */

import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({
  message,
  onRetry,
  onDismiss,
  className,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl',
        'bg-destructive/10 border border-destructive/20',
        'text-sm',
        'animate-fade-in',
        className
      )}
    >
      <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
      <span className="flex-1 text-foreground">{message}</span>
      
      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
              'text-xs font-medium',
              'bg-destructive/10 hover:bg-destructive/20 text-destructive',
              'transition-colors'
            )}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              'p-1.5 rounded-lg',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'transition-colors'
            )}
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
