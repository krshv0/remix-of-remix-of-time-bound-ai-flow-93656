/**
 * Code Block Component
 * Renders syntax-highlighted code with copy functionality
 * Uses react-syntax-highlighter for proper formatting
 */

import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { Check, Copy, Code, Eye, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  maxHeight?: number;
  className?: string;
  inline?: boolean;
}

// Language display names
const LANGUAGE_NAMES: Record<string, string> = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  python: 'Python',
  py: 'Python',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  jsx: 'JSX',
  tsx: 'TSX',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  sql: 'SQL',
  markdown: 'Markdown',
  md: 'Markdown',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  rust: 'Rust',
  rs: 'Rust',
  go: 'Go',
  ruby: 'Ruby',
  rb: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  kt: 'Kotlin',
  plaintext: 'Plain Text',
  text: 'Plain Text',
  csharp: 'C#',
  cs: 'C#',
  scala: 'Scala',
  r: 'R',
  perl: 'Perl',
  lua: 'Lua',
  haskell: 'Haskell',
  elixir: 'Elixir',
  clojure: 'Clojure',
  dart: 'Dart',
  dockerfile: 'Dockerfile',
  graphql: 'GraphQL',
  toml: 'TOML',
  ini: 'INI',
  makefile: 'Makefile',
  nginx: 'Nginx',
  apache: 'Apache',
  diff: 'Diff',
  regex: 'Regex',
};

// Map language aliases to syntax highlighter names
const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  kt: 'kotlin',
  cs: 'csharp',
  sh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  text: 'text',
};

// Check if language supports live preview
const supportsPreview = (lang?: string): boolean => {
  const previewable = ['html', 'jsx', 'tsx'];
  return previewable.includes(lang?.toLowerCase() || '');
};

// Check if dark mode is active
const isDarkMode = () => {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark');
  }
  return false;
};

export const CodeBlock = memo(function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = true,
  maxHeight,
  className,
  inline = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dark, setDark] = useState(isDarkMode());

  // Normalize language
  const normalizedLanguage = useMemo(() => {
    const lang = language?.toLowerCase() || 'text';
    return LANGUAGE_MAP[lang] || lang;
  }, [language]);

  const displayName = LANGUAGE_NAMES[language?.toLowerCase() || ''] || 
                      LANGUAGE_NAMES[normalizedLanguage] || 
                      language || 'Code';
  
  const canPreview = supportsPreview(normalizedLanguage);
  const lines = code.split('\n');
  const lineCount = lines.length;

  // Listen for theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const observer = new MutationObserver(() => {
      setDark(isDarkMode());
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [code]);

  // Create preview HTML for iframe
  const previewHtml = useMemo(() => {
    if (!canPreview) return '';
    
    // For HTML, use directly
    if (normalizedLanguage === 'html') {
      return code;
    }
    
    // For JSX/React, wrap in a basic HTML template
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
            ${code}
            const rootElement = document.getElementById('root');
            if (typeof App !== 'undefined') {
              ReactDOM.createRoot(rootElement).render(<App />);
            }
          </script>
        </body>
      </html>
    `;
  }, [code, canPreview, normalizedLanguage]);

  // Custom styles for syntax highlighter
  const customStyle = useMemo(() => ({
    margin: 0,
    padding: '1rem',
    background: 'transparent',
    fontSize: '0.875rem',
    lineHeight: '1.5rem',
  }), []);

  // Inline code rendering
  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded text-sm font-mono bg-[hsl(var(--code-bg))] text-[hsl(var(--foreground))]">
        {code}
      </code>
    );
  }

  return (
    <div className={cn('code-block rounded-xl overflow-hidden my-4', className)}>
      {/* Header */}
      <div className="code-block-header flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {lineCount > 15 && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-muted rounded transition-colors"
              aria-label={isCollapsed ? 'Expand code' : 'Collapse code'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <Code className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground font-medium truncate">
            {filename || displayName}
          </span>
          {filename && (
            <span className="text-muted-foreground/60 text-[10px] uppercase tracking-wider">
              {displayName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {canPreview && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
                showPreview
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              )}
              aria-label={showPreview ? 'Show code' : 'Show preview'}
            >
              {showPreview ? (
                <>
                  <Code className="w-3 h-3" />
                  Code
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  Preview
                </>
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all',
              copied
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'hover:bg-muted text-muted-foreground'
            )}
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <>
          {showPreview && canPreview ? (
            /* Preview iframe */
            <div className="relative">
              <iframe
                srcDoc={previewHtml}
                className="w-full bg-white dark:bg-gray-900"
                style={{ minHeight: '200px', height: Math.min(400, lineCount * 24 + 100) }}
                sandbox="allow-scripts"
                title="Code preview"
              />
              <a
                href={`data:text/html;charset=utf-8,${encodeURIComponent(previewHtml)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 right-2 p-1.5 rounded bg-background/80 backdrop-blur hover:bg-background transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            /* Code view with syntax highlighting */
            <div
              className="overflow-auto bg-[hsl(var(--code-bg))]"
              style={{ maxHeight: maxHeight }}
            >
              <SyntaxHighlighter
                language={normalizedLanguage}
                style={dark ? oneDark : oneLight}
                showLineNumbers={showLineNumbers && lineCount > 1}
                customStyle={customStyle}
                lineNumberStyle={{
                  minWidth: '2.5em',
                  paddingRight: '1em',
                  color: 'hsl(var(--muted-foreground) / 0.4)',
                  textAlign: 'right',
                  userSelect: 'none',
                }}
                wrapLines={true}
                wrapLongLines={false}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          )}
        </>
      )}

      {/* Collapsed indicator */}
      {isCollapsed && (
        <div className="px-4 py-3 text-sm text-muted-foreground bg-[hsl(var(--code-bg))]">
          {lineCount} lines collapsed
        </div>
      )}
    </div>
  );
});
