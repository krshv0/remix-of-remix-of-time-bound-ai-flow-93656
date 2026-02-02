import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
}

// Simple markdown to HTML converter
const parseMarkdown = (text: string): string => {
  let html = text;

  // Escape HTML
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong class="font-semibold">$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/_(.*?)_/g, '<em class="italic">$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-muted rounded text-sm font-mono">$1</code>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1</a>'
  );

  // Lists
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/^\s*(\d+)\.\s+(.*)$/gm, '<li class="ml-4 list-decimal">$2</li>');

  // Wrap consecutive list items
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
    const isOrdered = match.includes('list-decimal');
    const tag = isOrdered ? 'ol' : 'ul';
    return `<${tag} class="my-2 space-y-1">${match}</${tag}>`;
  });

  // Blockquotes
  html = html.replace(
    /^&gt;\s+(.*)$/gm,
    '<blockquote class="pl-4 border-l-2 border-muted-foreground/30 text-muted-foreground italic my-2">$1</blockquote>'
  );

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-4 border-border" />');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p class="my-2">');
  html = `<p class="my-2">${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p class="my-2"><\/p>/g, '');
  html = html.replace(/<p class="my-2">(<h[1-6])/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p class="my-2">(<ul|<ol|<blockquote|<hr)/g, '$1');
  html = html.replace(/(<\/ul>|<\/ol>|<\/blockquote>)<\/p>/g, '$1');

  return html;
};

const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  const html = parseMarkdown(content);

  return (
    <div
      className={cn(
        "p-4 text-sm leading-relaxed prose-sm",
        "prose-headings:text-foreground prose-p:text-foreground",
        "prose-a:text-primary prose-strong:text-foreground"
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownRenderer;
