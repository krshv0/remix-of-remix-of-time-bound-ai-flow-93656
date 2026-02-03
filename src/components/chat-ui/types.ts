/**
 * Chat UI Type Definitions
 * Centralized types for the chat interface
 */

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  preview?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  files?: FileAttachment[];
  isStreaming?: boolean;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  preview?: string;
}

export interface StarterPrompt {
  id: string;
  title: string;
  prompt: string;
  icon?: string;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isStreaming: boolean;
  error: string | null;
  conversationId: string | null;
}

export interface ChatContextType {
  state: ChatState;
  sendMessage: (content: string, files?: FileAttachment[]) => Promise<void>;
  regenerateLastResponse: () => Promise<void>;
  cancelGeneration: () => void;
  clearChat: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
}

/**
 * Message Block - Groups a user message with its corresponding AI response
 * This is the atomic unit for navigation and search
 */
export interface MessageBlock {
  id: string;
  index: number; // Sequential 1-based index
  userMessage: Message;
  assistantMessage?: Message;
  timestamp: Date;
  preview: string; // Auto-generated truncated preview of user query
}

/**
 * Search result with match highlights
 */
export interface SearchMatch {
  blockId: string;
  matchedIn: 'user' | 'assistant' | 'both';
  highlightRanges: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

/**
 * Navigation state
 */
export interface NavigationState {
  isOpen: boolean;
  searchQuery: string;
  filteredBlocks: MessageBlock[];
  activeBlockId: string | null;
  highlightedBlockId: string | null;
}
