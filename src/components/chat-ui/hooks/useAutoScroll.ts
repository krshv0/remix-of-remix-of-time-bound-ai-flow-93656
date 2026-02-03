/**
 * Auto-scroll hook for chat messages
 * Handles smart auto-scrolling that pauses when user scrolls up
 */

import { useRef, useCallback, useEffect, useState } from 'react';

interface UseAutoScrollOptions {
  threshold?: number;
  behavior?: ScrollBehavior;
}

export function useAutoScroll(
  dependencies: any[],
  options: UseAutoScrollOptions = {}
) {
  const { threshold = 100, behavior = 'smooth' } = options;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  const checkIfAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= threshold;
  }, [threshold]);

  const scrollToBottom = useCallback((force = false) => {
    const container = containerRef.current;
    if (!container) return;

    // Only auto-scroll if user hasn't scrolled up, or if forced
    if (force || isAtBottom) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: force ? 'smooth' : behavior,
      });
      setShowScrollButton(false);
    }
  }, [isAtBottom, behavior]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    // Mark as user scrolling
    isUserScrolling.current = true;

    // Check position
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);

    // Reset user scrolling flag after a delay
    scrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 150);
  }, [checkIfAtBottom]);

  // Auto-scroll when dependencies change (new messages)
  useEffect(() => {
    if (!isUserScrolling.current) {
      // Small delay to let DOM update
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, dependencies);

  // Setup scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return {
    containerRef,
    isAtBottom,
    showScrollButton,
    scrollToBottom: () => scrollToBottom(true),
  };
}
