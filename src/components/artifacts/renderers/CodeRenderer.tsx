import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface CodeRendererProps {
  code: string;
  language?: string;
  isExpanded?: boolean;
}

// Token types for syntax highlighting
type TokenType = 
  | "comment" 
  | "string" 
  | "number" 
  | "keyword" 
  | "function" 
  | "property" 
  | "operator" 
  | "punctuation" 
  | "type"
  | "whitespace" 
  | "plain";

interface Token {
  type: TokenType;
  content: string;
}

// Simple syntax highlighting tokens
const tokenize = (code: string, language?: string): Token[] => {
  if (!language || language === "plaintext") {
    return [{ type: "plain", content: code }];
  }

  const tokens: Token[] = [];
  let remaining = code;

  // Language-specific keyword patterns
  const goKeywords = /^(\b(?:package|import|func|return|if|else|for|range|switch|case|default|break|continue|go|defer|select|chan|map|struct|interface|type|const|var|nil|true|false|make|new|append|len|cap|copy|delete|close|panic|recover|iota)\b)/m;
  const pythonKeywords = /^(\b(?:def|class|return|if|elif|else|for|while|try|except|finally|with|as|import|from|raise|pass|break|continue|and|or|not|in|is|lambda|yield|global|nonlocal|assert|True|False|None|async|await)\b)/m;
  const jsKeywords = /^(\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|default|break|continue|class|import|export|from|default|async|await|try|catch|throw|new|this|super|extends|implements|interface|type|enum|public|private|protected|static|readonly|abstract|true|false|null|undefined|void|typeof|instanceof|in|of|as|is)\b)/m;

  // Choose keywords based on language
  let keywordRegex = jsKeywords;
  if (language === "go" || language === "golang") {
    keywordRegex = goKeywords;
  } else if (language === "python" || language === "py") {
    keywordRegex = pythonKeywords;
  }

  // Common patterns for syntax highlighting
  const patterns: Array<{ regex: RegExp; type: TokenType }> = [
    // Multi-line comments
    { regex: /^(\/\*[\s\S]*?\*\/)/m, type: "comment" },
    // Single-line comments
    { regex: /^(\/\/[^\n]*)/m, type: "comment" },
    { regex: /^(#[^\n]*)/m, type: "comment" },
    // Triple-quoted strings (Python)
    { regex: /^("""[\s\S]*?""")/m, type: "string" },
    { regex: /^('''[\s\S]*?''')/m, type: "string" },
    // Template literals
    { regex: /^(`(?:[^`\\]|\\.)*`)/m, type: "string" },
    // Double-quoted strings
    { regex: /^("(?:[^"\\]|\\.)*")/m, type: "string" },
    // Single-quoted strings
    { regex: /^('(?:[^'\\]|\\.)*')/m, type: "string" },
    // Numbers
    { regex: /^(\b\d+\.?\d*(?:e[+-]?\d+)?\b)/mi, type: "number" },
    { regex: /^(\b0x[0-9a-f]+\b)/mi, type: "number" },
    // Type annotations (capitalized words, common types)
    { regex: /^(\b(?:string|int|int32|int64|float|float32|float64|bool|byte|rune|error|any|void|number|boolean|object|array|Promise|Array|Object|String|Number|Boolean|Map|Set|Error)\b)/m, type: "type" },
    // Keywords (language-specific)
    { regex: keywordRegex, type: "keyword" },
    // Function calls
    { regex: /^(\b[a-zA-Z_]\w*)\s*(?=\()/m, type: "function" },
    // Property access
    { regex: /^(\.[a-zA-Z_]\w*)/m, type: "property" },
    // Operators
    { regex: /^([+\-*/%=<>!&|^~?:]+)/m, type: "operator" },
    // Punctuation
    { regex: /^([{}[\]();,])/m, type: "punctuation" },
    // Identifiers
    { regex: /^(\b[a-zA-Z_]\w*\b)/m, type: "plain" },
    // Whitespace (including newlines)
    { regex: /^(\s+)/m, type: "whitespace" },
    // Any other character
    { regex: /^(.)/m, type: "plain" },
  ];

  let iterations = 0;
  const maxIterations = code.length * 2; // Safety limit

  while (remaining.length > 0 && iterations < maxIterations) {
    iterations++;
    let matched = false;

    for (const { regex, type } of patterns) {
      const match = remaining.match(regex);
      if (match && match[1]) {
        tokens.push({ type, content: match[1] });
        remaining = remaining.slice(match[1].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      tokens.push({ type: "plain", content: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
};

const getTokenClass = (type: TokenType): string => {
  switch (type) {
    case "comment":
      return "text-muted-foreground/60 italic";
    case "string":
      return "text-emerald-400";
    case "number":
      return "text-amber-400";
    case "keyword":
      return "text-violet-400 font-medium";
    case "function":
      return "text-blue-400";
    case "type":
      return "text-cyan-400";
    case "property":
      return "text-sky-400";
    case "operator":
      return "text-foreground/70";
    case "punctuation":
      return "text-foreground/50";
    default:
      return "text-foreground";
  }
};

const CodeRenderer = ({ code, language, isExpanded }: CodeRendererProps) => {
  const tokens = useMemo(() => tokenize(code, language), [code, language]);
  const lines = code.split("\n");

  return (
    <div className="relative font-mono text-[13px] leading-relaxed bg-card/50">
      <div className="flex">
        {/* Line numbers */}
        <div 
          className="select-none shrink-0 py-4 pr-4 text-right text-muted-foreground/40 border-r border-border/50"
          style={{ minWidth: `${Math.max(2, String(lines.length).length) * 0.75 + 1.5}rem`, paddingLeft: '1rem' }}
        >
          {lines.map((_, i) => (
            <div key={i} className="leading-[1.7]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code content */}
        <pre className="flex-1 py-4 px-4 overflow-x-auto">
          <code className="leading-[1.7]">
            {tokens.map((token, i) => (
              <span key={i} className={getTokenClass(token.type)}>
                {token.content}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeRenderer;
