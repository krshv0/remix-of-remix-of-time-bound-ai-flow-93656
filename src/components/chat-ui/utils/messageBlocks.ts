/**
 * Message Block Utilities
 * Functions for grouping messages into navigable blocks
 */

import { Message, MessageBlock, SearchMatch } from '../types';

/**
 * Generate a unique block ID
 */
const generateBlockId = (index: number, userMessageId: string) => 
  `block-${index}-${userMessageId}`;

/**
 * Create a truncated preview of the user's query
 * Max 80 characters, clean truncation at word boundary
 */
export function createPreview(content: string, maxLength = 80): string {
  const cleaned = content.trim().replace(/\s+/g, ' ');
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  // Find last space before maxLength to truncate at word boundary
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.5) {
    return truncated.slice(0, lastSpace) + '…';
  }
  
  return truncated + '…';
}

/**
 * Group messages into message blocks
 * Each user message + its following assistant response = one block
 */
export function groupMessagesIntoBlocks(messages: Message[]): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  let blockIndex = 1;
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    // Skip system messages
    if (message.role === 'system') continue;
    
    // Start a new block on user message
    if (message.role === 'user') {
      const assistantMessage = messages[i + 1]?.role === 'assistant' 
        ? messages[i + 1] 
        : undefined;
      
      blocks.push({
        id: generateBlockId(blockIndex, message.id),
        index: blockIndex,
        userMessage: message,
        assistantMessage,
        timestamp: message.timestamp,
        preview: createPreview(message.content),
      });
      
      blockIndex++;
      
      // Skip the assistant message in next iteration if we consumed it
      if (assistantMessage) {
        i++;
      }
    }
  }
  
  return blocks;
}

/**
 * Fuzzy search - simple implementation that handles:
 * - Case insensitivity
 * - Partial matches
 * - Multiple words (all must be present)
 */
export function fuzzyMatch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  
  const normalizedText = text.toLowerCase();
  const queryWords = query.toLowerCase().trim().split(/\s+/);
  
  // All query words must be found in the text
  return queryWords.every(word => normalizedText.includes(word));
}

/**
 * Find highlight ranges for search matches
 */
export function findHighlightRanges(
  text: string, 
  query: string
): Array<{ start: number; end: number; text: string }> {
  if (!query.trim()) return [];
  
  const ranges: Array<{ start: number; end: number; text: string }> = [];
  const normalizedText = text.toLowerCase();
  const queryWords = query.toLowerCase().trim().split(/\s+/);
  
  for (const word of queryWords) {
    let startIndex = 0;
    while (true) {
      const index = normalizedText.indexOf(word, startIndex);
      if (index === -1) break;
      
      ranges.push({
        start: index,
        end: index + word.length,
        text: text.slice(index, index + word.length),
      });
      
      startIndex = index + 1;
    }
  }
  
  // Sort by start position and merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start);
  
  const merged: typeof ranges = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
      last.text = text.slice(last.start, last.end);
    } else {
      merged.push({ ...range });
    }
  }
  
  return merged;
}

/**
 * Search message blocks and return matches with highlight info
 */
export function searchBlocks(
  blocks: MessageBlock[], 
  query: string
): { blocks: MessageBlock[]; matches: Map<string, SearchMatch> } {
  if (!query.trim()) {
    return { blocks, matches: new Map() };
  }
  
  const matches = new Map<string, SearchMatch>();
  const filteredBlocks: MessageBlock[] = [];
  
  for (const block of blocks) {
    const userMatch = fuzzyMatch(block.userMessage.content, query);
    const assistantMatch = block.assistantMessage 
      ? fuzzyMatch(block.assistantMessage.content, query)
      : false;
    
    if (userMatch || assistantMatch) {
      filteredBlocks.push(block);
      
      // Determine where the match occurred and get highlight ranges
      const userRanges = userMatch 
        ? findHighlightRanges(block.userMessage.content, query)
        : [];
      const assistantRanges = assistantMatch && block.assistantMessage
        ? findHighlightRanges(block.assistantMessage.content, query)
        : [];
      
      matches.set(block.id, {
        blockId: block.id,
        matchedIn: userMatch && assistantMatch ? 'both' 
          : userMatch ? 'user' 
          : 'assistant',
        highlightRanges: [...userRanges],
      });
    }
  }
  
  return { blocks: filteredBlocks, matches };
}

/**
 * Get the currently visible block based on scroll position
 */
export function getVisibleBlockId(
  blocks: MessageBlock[],
  containerElement: HTMLElement | null
): string | null {
  if (!containerElement || blocks.length === 0) return null;
  
  const containerRect = containerElement.getBoundingClientRect();
  const viewportMiddle = containerRect.top + containerRect.height / 3;
  
  for (const block of blocks) {
    const blockElement = document.getElementById(`message-block-${block.id}`);
    if (blockElement) {
      const rect = blockElement.getBoundingClientRect();
      if (rect.top <= viewportMiddle && rect.bottom > containerRect.top) {
        return block.id;
      }
    }
  }
  
  // Default to first block if none visible
  return blocks[0]?.id ?? null;
}
