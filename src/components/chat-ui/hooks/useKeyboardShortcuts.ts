/**
 * Keyboard shortcuts hook for chat interface
 * Handles common shortcuts like Enter to send, Shift+Enter for newline, Escape to cancel
 */

import { useEffect, useCallback, RefObject } from 'react';

interface UseKeyboardShortcutsOptions {
  onSend: () => void;
  onCancel?: () => void;
  onEscape?: () => void;
  inputRef: RefObject<HTMLTextAreaElement>;
  isDisabled?: boolean;
  isGenerating?: boolean;
}

export function useKeyboardShortcuts({
  onSend,
  onCancel,
  onEscape,
  inputRef,
  isDisabled = false,
  isGenerating = false,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInInput = target === inputRef.current;

      // Enter to send (without shift)
      if (event.key === 'Enter' && !event.shiftKey && isInInput) {
        event.preventDefault();
        if (!isDisabled && !isGenerating) {
          onSend();
        }
      }

      // Escape to cancel generation or clear focus
      if (event.key === 'Escape') {
        if (isGenerating && onCancel) {
          event.preventDefault();
          onCancel();
        } else if (onEscape) {
          onEscape();
        }
        // Blur the input when pressing escape
        if (isInInput) {
          inputRef.current?.blur();
        }
      }

      // Cmd/Ctrl + Enter to send even when shift is held or from anywhere
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isDisabled) {
          onSend();
        }
      }

      // Focus input with "/" key when not already focused
      if (event.key === '/' && !isInInput && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    },
    [onSend, onCancel, onEscape, inputRef, isDisabled, isGenerating]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
