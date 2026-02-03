/**
 * Chat UI Module Exports
 */

// Main interface
export { ModernChatInterface } from './ModernChatInterface';

// Types
export type {
  Message,
  FileAttachment,
  Conversation,
  StarterPrompt,
  ChatState,
  ChatContextType,
  MessageBlock,
  SearchMatch,
  NavigationState,
} from './types';

// Components
export {
  ChatMessage,
  TypingIndicator,
  ChatInput,
  WelcomeScreen,
  ScrollToBottomButton,
  ErrorBanner,
  ChatSidebar,
  ContextBanner,
  MessageNavigationPanel,
  NavigationTrigger,
  MessageBlockWrapper,
} from './components';

// Renderers
export { CodeBlock, MarkdownRenderer, FileArtifactCard } from './renderers';

// Hooks
export { useAutoScroll, useKeyboardShortcuts, useMessageNavigation } from './hooks';

// Providers
export { ThemeProvider, useTheme } from './providers';

// Utilities
export {
  groupMessagesIntoBlocks,
  searchBlocks,
  createPreview,
  fuzzyMatch,
} from './utils';
