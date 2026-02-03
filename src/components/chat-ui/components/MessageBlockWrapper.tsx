/**
 * Message Block Wrapper
 * Groups user message + assistant response into a single navigable unit
 * Handles highlight animation when jumped to
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { MessageBlock } from '../types';

interface MessageBlockWrapperProps {
  block: MessageBlock;
  isHighlighted: boolean;
  children: React.ReactNode;
  showBlockIndex?: boolean;
  className?: string;
}

export const MessageBlockWrapper = memo(function MessageBlockWrapper({
  block,
  isHighlighted,
  children,
  showBlockIndex = false,
  className,
}: MessageBlockWrapperProps) {
  return (
    <div
      id={`message-block-${block.id}`}
      data-block-index={block.index}
      className={cn(
        'relative transition-all duration-300',
        isHighlighted && 'message-block-highlight rounded-lg',
        'group/block',
        className
      )}
    >
      {/* Subtle block index indicator (shows on hover) */}
      {showBlockIndex && (
        <div 
          className={cn(
            'absolute -left-8 top-3 opacity-0 transition-opacity duration-200',
            'group-hover/block:opacity-100',
            'text-[10px] font-mono text-muted-foreground/50',
            'select-none pointer-events-none'
          )}
          aria-hidden="true"
        >
          #{block.index}
        </div>
      )}
      
      {children}
    </div>
  );
});
