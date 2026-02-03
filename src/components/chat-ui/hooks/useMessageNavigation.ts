/**
 * useMessageNavigation Hook
 * Manages message navigation state, keyboard shortcuts, and scroll-to-block behavior
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Message, MessageBlock } from '../types';
import { groupMessagesIntoBlocks, getVisibleBlockId } from '../utils/messageBlocks';

interface UseMessageNavigationOptions {
  messages: Message[];
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
}

interface UseMessageNavigationReturn {
  // State
  isNavOpen: boolean;
  messageBlocks: MessageBlock[];
  activeBlockId: string | null;
  highlightedBlockId: string | null;
  
  // Actions
  openNav: () => void;
  closeNav: () => void;
  toggleNav: () => void;
  navigateToBlock: (blockId: string) => void;
  clearHighlight: () => void;
}

export function useMessageNavigation({
  messages,
  containerRef,
  enabled = true,
}: UseMessageNavigationOptions): UseMessageNavigationReturn {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  
  // Group messages into blocks
  const messageBlocks = useMemo(() => {
    return groupMessagesIntoBlocks(messages);
  }, [messages]);
  
  // Track visible block on scroll
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    
    const container = containerRef.current;
    let ticking = false;
    
    const updateActiveBlock = () => {
      const visibleId = getVisibleBlockId(messageBlocks, container);
      if (visibleId !== activeBlockId) {
        setActiveBlockId(visibleId);
      }
      ticking = false;
    };
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateActiveBlock);
        ticking = true;
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    updateActiveBlock();
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, containerRef, messageBlocks, activeBlockId]);
  
  // Keyboard shortcut: Cmd/Ctrl + K to open navigation
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to toggle navigation
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsNavOpen(prev => !prev);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
  
  // Navigate to a specific block
  const navigateToBlock = useCallback((blockId: string) => {
    const blockElement = document.getElementById(`message-block-${blockId}`);
    if (!blockElement) return;
    
    // Smooth scroll to the block
    blockElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    
    // Apply highlight animation
    setHighlightedBlockId(blockId);
    
    // Clear previous timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    
    // Remove highlight after animation
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedBlockId(null);
    }, 2000);
  }, []);
  
  // Clear highlight manually if needed
  const clearHighlight = useCallback(() => {
    setHighlightedBlockId(null);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
  }, []);
  
  // Open/close/toggle nav
  const openNav = useCallback(() => setIsNavOpen(true), []);
  const closeNav = useCallback(() => setIsNavOpen(false), []);
  const toggleNav = useCallback(() => setIsNavOpen(prev => !prev), []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    isNavOpen,
    messageBlocks,
    activeBlockId,
    highlightedBlockId,
    openNav,
    closeNav,
    toggleNav,
    navigateToBlock,
    clearHighlight,
  };
}
