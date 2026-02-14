/**
 * Chat Input Composer
 * Multi-line input with file attachments, send button, and keyboard shortcuts
 */

import React, { useState, useRef, useCallback, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import { Send, Paperclip, X, StopCircle, Image, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileAttachment } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface ChatInputProps {
  onSend: (message: string, files?: FileAttachment[]) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  maxFiles?: number;
  maxFileSize?: number;
  className?: string;
}

// Generate unique ID
const generateId = () => `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Format file size
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Get file icon
const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  return FileText;
};

export function ChatInput({
  onSend,
  onCancel,
  isLoading = false,
  isDisabled = false,
  placeholder = 'Message...',
  maxFiles = 5,
  maxFileSize = 25 * 1024 * 1024,
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = (message.trim() || files.length > 0) && !isLoading && !isDisabled;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [message]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    if (!canSend) return;

    onSend(message.trim(), files.length > 0 ? files : undefined);
    setMessage('');
    setFiles([]);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, files, canSend, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && isLoading && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
    }
    return fullText.trim() || '[PDF document appears to be empty or contains only images]';
  };

  const extractDocxText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim() || '[Word document appears to be empty]';
  };

  const processFile = async (file: File): Promise<FileAttachment | null> => {
    if (file.size > maxFileSize) {
      console.error(`File ${file.name} exceeds size limit`);
      return null;
    }

    try {
      let content: string;

      if (file.type === 'application/pdf') {
        content = await extractPdfText(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        content = await extractDocxText(file);
      } else if (file.type.startsWith('text/') || file.type === 'application/json') {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });
      } else {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      }

      return {
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        content,
      };
    } catch (err) {
      console.error(`Failed to process file ${file.name}:`, err);
      return null;
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > maxFiles) {
      console.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles = await Promise.all(selectedFiles.map(processFile));
    setFiles((prev) => [...prev, ...newFiles.filter(Boolean) as FileAttachment[]]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length + files.length > maxFiles) {
      console.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles = await Promise.all(droppedFiles.map(processFile));
    setFiles((prev) => [...prev, ...newFiles.filter(Boolean) as FileAttachment[]]);
  };

  return (
    <div
      className={cn(
        'relative',
        isDragging && 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* File attachments */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={file.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm group"
              >
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-0.5 rounded hover:bg-background transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input area */}
      <div
        className={cn(
          'flex items-end gap-2 p-3 rounded-2xl border bg-background',
          'transition-shadow duration-200',
          'focus-within:shadow-[var(--shadow-input-focus)]',
          isDragging && 'border-primary bg-primary/5'
        )}
      >
        {/* Attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,text/*,application/pdf,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,.md,.csv,.pdf,.doc,.docx"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || files.length >= maxFiles}
          className={cn(
            'p-2 rounded-xl transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder={placeholder}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent border-0 outline-none',
            'text-sm leading-relaxed placeholder:text-muted-foreground',
            'min-h-[40px] max-h-[200px] py-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="Message input"
        />

        {/* Send/Stop button */}
        {isLoading ? (
          <button
            onClick={onCancel}
            className={cn(
              'p-2.5 rounded-xl transition-all',
              'bg-destructive/10 text-destructive hover:bg-destructive/20',
              'focus:outline-none focus:ring-2 focus:ring-destructive/50'
            )}
            aria-label="Stop generating"
          >
            <StopCircle className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              'p-2.5 rounded-xl transition-all',
              canSend
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-primary/5 border-2 border-dashed border-primary pointer-events-none">
          <div className="text-primary font-medium">Drop files here</div>
        </div>
      )}

      {/* Helper text */}
      <div className="flex items-center justify-between px-3 pt-2 text-xs text-muted-foreground">
        <span>
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Enter</kbd> to send,{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Shift+Enter</kbd> for new line
        </span>
        {isLoading && (
          <span className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating...
          </span>
        )}
      </div>
    </div>
  );
}
