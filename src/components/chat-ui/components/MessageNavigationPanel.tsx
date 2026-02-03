/**
 * Message Navigation Panel
 * A floating, searchable table of contents for navigating message blocks
 * Accessible via Cmd+K or navigation trigger
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, ChevronRight, MessageSquare, Clock, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageBlock, SearchMatch } from '../types';
import { searchBlocks, createPreview } from '../utils/messageBlocks';

interface MessageNavigationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: MessageBlock[];
  activeBlockId: string | null;
  onNavigateToBlock: (blockId: string) => void;
  className?: string;
}

/**
 * Highlighted text component for search matches
 */
function HighlightedText({ 
  text, 
  ranges 
}: { 
  text: string; 
  ranges: Array<{ start: number; end: number }>;
}) {
  if (ranges.length === 0) {
    return <>{text}</>;
  }
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  for (const range of ranges) {
    // Text before highlight
    if (range.start > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex, range.start)}
        </span>
      );
    }
    // Highlighted portion
    parts.push(
      <mark 
        key={`mark-${range.start}`}
        className="bg-warning/30 text-foreground rounded-sm px-0.5"
      >
        {text.slice(range.start, range.end)}
      </mark>
    );
    lastIndex = range.end;
  }
  
  // Remaining text after last highlight
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>
    );
  }
  
  return <>{parts}</>;
}

/**
 * Individual navigation item
 */
function NavigationItem({
  block,
  isActive,
  match,
  searchQuery,
  onClick,
  onKeyDown,
}: {
  block: MessageBlock;
  isActive: boolean;
  match?: SearchMatch;
  searchQuery: string;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const itemRef = useRef<HTMLButtonElement>(null);
  
  // Auto-scroll active item into view within the panel
  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isActive]);
  
  // Get preview with potential highlighting
  const userPreview = createPreview(block.userMessage.content, 50);
  const aiPreview = block.assistantMessage 
    ? createPreview(block.assistantMessage.content, 60)
    : null;
  const highlightRanges = match?.highlightRanges.filter(r => 
    r.start < 50 && r.end <= userPreview.length
  ) ?? [];
  
  // Format relative time
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <button
      ref={itemRef}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        'w-full text-left px-3 py-3 rounded-lg transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'group flex items-start gap-3',
        isActive 
          ? 'bg-accent text-accent-foreground' 
          : 'hover:bg-muted/50'
      )}
      role="option"
      aria-selected={isActive}
    >
      {/* Index indicator */}
      <span className={cn(
        'flex items-center justify-center w-6 h-6 rounded-md text-xs font-medium shrink-0 mt-0.5',
        isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted text-muted-foreground'
      )}>
        {block.index}
      </span>
      
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* User query */}
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider shrink-0 mt-0.5">You</span>
          <p className="text-sm font-medium leading-tight line-clamp-2">
            {searchQuery ? (
              <HighlightedText text={userPreview} ranges={highlightRanges} />
            ) : (
              userPreview
            )}
          </p>
        </div>
        
        {/* AI response preview */}
        {aiPreview && (
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider shrink-0 mt-0.5">AI</span>
            <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
              {aiPreview}
            </p>
          </div>
        )}
        
        {/* Metadata row */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 pt-0.5">
          <Clock className="w-3 h-3" />
          <span>{formatTime(block.timestamp)}</span>
          {match && (
            <>
              <span className="text-border">•</span>
              <span className="text-warning">
                {match.matchedIn === 'both' ? 'matched in both' 
                  : match.matchedIn === 'user' ? 'in question'
                  : 'in response'}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Arrow indicator */}
      <ChevronRight className={cn(
        'w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform',
        'opacity-0 group-hover:opacity-100 group-focus:opacity-100',
        isActive && 'opacity-100'
      )} />
    </button>
  );
}

/**
 * Empty state when no results found
 */
function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Search className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">
        No messages found
      </p>
      <p className="text-xs text-muted-foreground max-w-[200px]">
        {query 
          ? `No messages match "${query}". Try different keywords.`
          : 'Start a conversation to see messages here.'}
      </p>
    </div>
  );
}

export function MessageNavigationPanel({
  isOpen,
  onClose,
  blocks,
  activeBlockId,
  onNavigateToBlock,
  className,
}: MessageNavigationPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Filter blocks based on search
  const { filteredBlocks, matches } = useMemo(() => {
    const result = searchBlocks(blocks, searchQuery);
    return {
      filteredBlocks: result.blocks,
      matches: result.matches,
    };
  }, [blocks, searchQuery]);
  
  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredBlocks.length]);
  
  // Focus search input when panel opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow animation
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);
  
  // Find index of active block
  useEffect(() => {
    if (activeBlockId) {
      const index = filteredBlocks.findIndex(b => b.id === activeBlockId);
      if (index !== -1) {
        setSelectedIndex(index);
      }
    }
  }, [activeBlockId, filteredBlocks]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredBlocks.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredBlocks[selectedIndex]) {
          onNavigateToBlock(filteredBlocks[selectedIndex].id);
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredBlocks, selectedIndex, onNavigateToBlock, onClose]);
  
  // Handle item click
  const handleItemClick = useCallback((blockId: string) => {
    onNavigateToBlock(blockId);
    onClose();
  }, [onNavigateToBlock, onClose]);
  
  // Handle item keyboard (for individual item focus)
  const handleItemKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const block = filteredBlocks[index];
      if (block) {
        onNavigateToBlock(block.id);
        onClose();
      }
    }
  }, [filteredBlocks, onNavigateToBlock, onClose]);
  
  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 nav-panel-backdrop"
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Message navigation"
        aria-modal="true"
        onKeyDown={handleKeyDown}
        className={cn(
          'fixed z-50 nav-panel-enter',
          // Desktop: centered modal
          'top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg',
          // Mobile: bottom sheet
          'max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:translate-x-0',
          'max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-2xl',
          'bg-card border border-border rounded-xl shadow-lg overflow-hidden',
          'flex flex-col max-h-[70vh] max-sm:max-h-[85vh]',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              className={cn(
                'w-full pl-10 pr-4 py-2 text-sm',
                'bg-muted/50 rounded-lg border-0',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
              aria-label="Search messages"
            />
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg text-muted-foreground',
              'hover:bg-muted hover:text-foreground',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'transition-colors'
            )}
            aria-label="Close navigation panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Keyboard hints */}
        <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground border-b border-border/50 bg-muted/30 shrink-0">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↵</kbd>
            jump
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">esc</kbd>
            close
          </span>
        </div>
        
        {/* Results list */}
        <div 
          className="flex-1 overflow-y-auto p-2"
          role="listbox"
          aria-label="Message list"
        >
          {filteredBlocks.length === 0 ? (
            <EmptyState query={searchQuery} />
          ) : (
            <div className="space-y-1">
              {filteredBlocks.map((block, index) => (
                <NavigationItem
                  key={block.id}
                  block={block}
                  isActive={selectedIndex === index}
                  match={matches.get(block.id)}
                  searchQuery={searchQuery}
                  onClick={() => handleItemClick(block.id)}
                  onKeyDown={(e) => handleItemKeyDown(e, index)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Footer with count */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 text-xs text-muted-foreground shrink-0 bg-muted/20">
          <span>
            {searchQuery 
              ? `${filteredBlocks.length} of ${blocks.length} messages`
              : `${blocks.length} message${blocks.length !== 1 ? 's' : ''}`}
          </span>
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            Jump to message
          </span>
        </div>
      </div>
    </>
  );
}
