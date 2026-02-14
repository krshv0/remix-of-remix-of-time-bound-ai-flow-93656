/**
 * Image Generation Navigation Panel
 * Searchable sidebar for navigating between generations
 * Mirrors the chat message navigation pattern
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  X, 
  Image as ImageIcon,
  Clock,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenerationBlock } from './types';
import { format } from 'date-fns';

interface ImageGenNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: GenerationBlock[];
  activeBlockId: string | null;
  onNavigateToBlock: (blockId: string) => void;
  className?: string;
}

// Fuzzy search helper
function fuzzyMatch(text: string, query: string): { matches: boolean; ranges: Array<{ start: number; end: number }> } {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];
  
  let lastIndex = 0;
  for (const word of lowerQuery.split(/\s+/)) {
    const index = lowerText.indexOf(word, lastIndex);
    if (index === -1) {
      return { matches: false, ranges: [] };
    }
    ranges.push({ start: index, end: index + word.length });
    lastIndex = index + word.length;
  }
  
  return { matches: true, ranges };
}

// Highlighted text component
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
  
  // Sort ranges by start position
  const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
  
  for (const range of sortedRanges) {
    if (range.start > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, range.start)}</span>);
    }
    parts.push(
      <mark key={`mark-${range.start}`} className="bg-yellow-200 dark:bg-yellow-900 rounded-sm px-0.5">
        {text.slice(range.start, range.end)}
      </mark>
    );
    lastIndex = range.end;
  }
  
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }
  
  return <>{parts}</>;
}

// Navigation item component
function NavigationItem({
  block,
  isActive,
  searchQuery,
  onClick,
}: {
  block: GenerationBlock;
  isActive: boolean;
  searchQuery: string;
  onClick: () => void;
}) {
  const itemRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  const { ranges } = searchQuery 
    ? fuzzyMatch(block.prompt, searchQuery)
    : { ranges: [] };

  return (
    <button
      ref={itemRef}
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-colors',
        'hover:bg-muted focus:bg-muted focus:outline-none',
        isActive && 'bg-primary/10 border border-primary/20'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        {block.images[0] && (
          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
            <img 
              src={block.images[0].url} 
              alt="" 
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0 space-y-1">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              #{block.index}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {format(block.timestamp, 'h:mm a')}
            </span>
          </div>
          
          {/* Prompt Preview */}
          <p className="text-xs leading-relaxed line-clamp-2">
            <HighlightedText text={block.prompt} ranges={ranges} />
          </p>
          
          {/* Image Count */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ImageIcon className="w-2.5 h-2.5" />
            {block.images.length} image{block.images.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </button>
  );
}

export function ImageGenNavigation({
  isOpen,
  onClose,
  blocks,
  activeBlockId,
  onNavigateToBlock,
  className,
}: ImageGenNavigationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Clear search on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter blocks by search
  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return blocks;
    return blocks.filter(block => 
      fuzzyMatch(block.prompt, searchQuery).matches ||
      (block.negativePrompt && fuzzyMatch(block.negativePrompt, searchQuery).matches)
    );
  }, [blocks, searchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-80 bg-background border-r shadow-xl',
        'animate-in slide-in-from-left-full duration-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Generations ({blocks.length})
        </h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-3 space-y-2">
          {filteredBlocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'No matching generations' : 'No generations yet'}
              </p>
            </div>
          ) : (
            filteredBlocks.map((block) => (
              <NavigationItem
                key={block.id}
                block={block}
                isActive={block.id === activeBlockId}
                searchQuery={searchQuery}
                onClick={() => {
                  onNavigateToBlock(block.id);
                  onClose();
                }}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer hint */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-background">
        <p className="text-[10px] text-muted-foreground text-center">
          Press <kbd className="px-1 py-0.5 rounded bg-muted">⌘K</kbd> to toggle
        </p>
      </div>
    </div>
  );
}
