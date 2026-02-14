/**
 * Chat Message Component
 * Displays individual user or assistant messages with proper styling
 */

import { useState, memo } from 'react';
import { Copy, Check, RefreshCw, User, Sparkles, FileText, FileDown } from 'lucide-react';
import { downloadMarkdown, downloadDocx } from '@/lib/documentExport';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '../renderers/MarkdownRenderer';
import { Message, FileAttachment } from '../types';

interface ChatMessageProps {
  message: Message;
  isLast?: boolean;
  onRegenerate?: () => void;
  onCopy?: (content: string) => void;
  className?: string;
}

// File attachment preview component
function AttachmentPreview({ files }: { files: FileAttachment[] }) {
  if (!files || files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-current/10">
      {files.map((file) => (
        <div
          key={file.id}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50 text-xs"
        >
          <span className="text-muted-foreground">📎</span>
          <span className="truncate max-w-[150px]">{file.name}</span>
          <span className="text-muted-foreground">
            ({Math.round(file.size / 1024)}KB)
          </span>
        </div>
      ))}
    </div>
  );
}

// Typing indicator component
export function TypingIndicator() {
  return (
    <div className="flex items-start gap-4 px-4 py-6 message-enter">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex items-center gap-1 pt-2">
        <div className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
        <div className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
        <div className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
      </div>
    </div>
  );
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isLast = false,
  onRegenerate,
  onCopy,
  className,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      onCopy?.(message.content);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isUser) {
    return (
      <div className={cn('flex justify-end px-4 py-3 message-enter', className)}>
        <div className="flex items-start gap-3 max-w-[85%] md:max-w-[70%]">
          <div
            className={cn(
              'rounded-2xl rounded-tr-md px-4 py-3',
              'bg-primary text-primary-foreground',
              'shadow-sm'
            )}
          >
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            {message.files && <AttachmentPreview files={message.files} />}
          </div>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  if (isAssistant) {
    return (
      <div
        className={cn('flex items-start gap-4 px-4 py-6 message-enter group', className)}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="max-w-none">
            <MarkdownRenderer
              content={message.content}
              isStreaming={message.isStreaming}
            />
          </div>

          {/* Error state */}
          {message.error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
              <span>⚠️ {message.error}</span>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="ml-auto text-xs underline hover:no-underline"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!message.isStreaming && !message.error && (
            <div
              className={cn(
                'flex items-center gap-1 pt-1 transition-opacity duration-200',
                showActions || isLast ? 'opacity-100' : 'opacity-0'
              )}
            >
              <button
                onClick={handleCopy}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                  'text-muted-foreground hover:text-foreground hover:bg-muted',
                  'transition-colors'
                )}
                aria-label="Copy message"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={() => downloadMarkdown(message.content)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                  'text-muted-foreground hover:text-foreground hover:bg-muted',
                  'transition-colors'
                )}
                aria-label="Export as Markdown"
              >
                <FileText className="w-3 h-3" />
                .md
              </button>
              <button
                onClick={() => downloadDocx(message.content)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                  'text-muted-foreground hover:text-foreground hover:bg-muted',
                  'transition-colors'
                )}
                aria-label="Export as DOCX"
              >
                <FileDown className="w-3 h-3" />
                .docx
              </button>
              {onRegenerate && isLast && (
                <button
                  onClick={onRegenerate}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                    'text-muted-foreground hover:text-foreground hover:bg-muted',
                    'transition-colors'
                  )}
                  aria-label="Regenerate response"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // System message
  return (
    <div className={cn('px-4 py-2 message-enter', className)}>
      <div className="max-w-[85%] mx-auto text-center">
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-full px-4 py-2 inline-block">
          {message.content}
        </p>
      </div>
    </div>
  );
});
