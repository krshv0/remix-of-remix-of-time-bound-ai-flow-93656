/**
 * Scroll to Bottom Button
 * Appears when user scrolls up in the chat
 */

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
  className?: string;
}

export function ScrollToBottomButton({
  visible,
  onClick,
  className,
}: ScrollToBottomButtonProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute left-1/2 -translate-x-1/2 bottom-4',
        'flex items-center gap-1.5 px-3 py-2 rounded-full',
        'bg-background border shadow-lg',
        'text-sm font-medium',
        'hover:bg-muted transition-colors',
        'scroll-button-enter',
        'z-10',
        className
      )}
      aria-label="Scroll to bottom"
    >
      <ChevronDown className="w-4 h-4" />
      <span className="hidden sm:inline">New messages</span>
    </button>
  );
}
