/**
 * Markdown Renderer Component
 * Renders markdown content using react-markdown for proper parsing
 * Handles code blocks, tables, and all standard markdown
 */

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
  isStreaming = false,
}: MarkdownRendererProps) {
  // Custom components for react-markdown
  const components: Components = useMemo(() => ({
    // Code blocks and inline code
    code({ node, className: codeClassName, children, ...props }) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const language = match ? match[1] : undefined;
      const codeContent = String(children).replace(/\n$/, '');
      
      // Check if it's inline code (no language, short content, no newlines)
      const isInline = !match && !codeContent.includes('\n') && codeContent.length < 100;
      
      if (isInline) {
        return (
          <code 
            className="px-1.5 py-0.5 rounded text-sm font-mono bg-[hsl(var(--code-bg))]"
            {...props}
          >
            {children}
          </code>
        );
      }
      
      return (
        <CodeBlock
          code={codeContent}
          language={language}
          showLineNumbers={true}
        />
      );
    },
    
    // Paragraphs
    p({ children }) {
      return (
        <p className="my-3 first:mt-0 last:mb-0 leading-relaxed">
          {children}
        </p>
      );
    },
    
    // Headers
    h1({ children }) {
      return (
        <h1 className="text-2xl font-semibold mt-6 mb-4 first:mt-0">
          {children}
        </h1>
      );
    },
    h2({ children }) {
      return (
        <h2 className="text-xl font-semibold mt-5 mb-3 first:mt-0">
          {children}
        </h2>
      );
    },
    h3({ children }) {
      return (
        <h3 className="text-lg font-semibold mt-4 mb-2 first:mt-0">
          {children}
        </h3>
      );
    },
    h4({ children }) {
      return (
        <h4 className="text-base font-semibold mt-4 mb-2 first:mt-0">
          {children}
        </h4>
      );
    },
    h5({ children }) {
      return (
        <h5 className="text-sm font-semibold mt-3 mb-2 first:mt-0">
          {children}
        </h5>
      );
    },
    h6({ children }) {
      return (
        <h6 className="text-sm font-medium mt-3 mb-2 first:mt-0">
          {children}
        </h6>
      );
    },
    
    // Lists
    ul({ children }) {
      return (
        <ul className="my-3 pl-6 list-disc space-y-1">
          {children}
        </ul>
      );
    },
    ol({ children }) {
      return (
        <ol className="my-3 pl-6 list-decimal space-y-1">
          {children}
        </ol>
      );
    },
    li({ children }) {
      return <li className="pl-1">{children}</li>;
    },
    
    // Blockquotes
    blockquote({ children }) {
      return (
        <blockquote className="my-4 pl-4 border-l-2 border-border italic text-muted-foreground">
          {children}
        </blockquote>
      );
    },
    
    // Links
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:no-underline"
        >
          {children}
        </a>
      );
    },
    
    // Emphasis
    strong({ children }) {
      return <strong className="font-semibold">{children}</strong>;
    },
    em({ children }) {
      return <em className="italic">{children}</em>;
    },
    del({ children }) {
      return <del className="line-through">{children}</del>;
    },
    
    // Horizontal rule
    hr() {
      return <hr className="my-6 border-border" />;
    },
    
    // Tables (GFM)
    table({ children }) {
      return (
        <div className="my-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }) {
      return <thead>{children}</thead>;
    },
    tbody({ children }) {
      return <tbody>{children}</tbody>;
    },
    tr({ children }) {
      return <tr className="border-b border-border last:border-b-0">{children}</tr>;
    },
    th({ children }) {
      return (
        <th className="px-4 py-2 text-left font-semibold border-b-2 border-border bg-muted/50">
          {children}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className="px-4 py-2 border-b border-border">
          {children}
        </td>
      );
    },
    
    // Images
    img({ src, alt }) {
      return (
        <img
          src={src}
          alt={alt || ''}
          className="rounded-lg my-4 max-w-full"
          loading="lazy"
        />
      );
    },
    
    // Pre wrapper (handled by code component)
    pre({ children }) {
      return <>{children}</>;
    },
  }), []);

  return (
    <div className={cn('prose-chat text-sm', isStreaming && 'streaming-cursor', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
