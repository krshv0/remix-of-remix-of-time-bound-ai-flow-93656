import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface CodeRendererProps {
  code: string;
  language?: string;
  isExpanded?: boolean;
}

// Simple syntax highlighting tokens
const tokenize = (code: string, language?: string) => {
  if (!language || language === "plaintext") {
    return [{ type: "plain", content: code }];
  }

  const tokens: Array<{ type: string; content: string }> = [];
  let remaining = code;

  // Common patterns for syntax highlighting
  const patterns: Array<{ regex: RegExp; type: string }> = [
    // Comments
    { regex: /^(\/\/[^\n]*)/m, type: "comment" },
    { regex: /^(\/\*[\s\S]*?\*\/)/m, type: "comment" },
    { regex: /^(#[^\n]*)/m, type: "comment" },
    // Strings
    { regex: /^("(?:[^"\\]|\\.)*")/m, type: "string" },
    { regex: /^('(?:[^'\\]|\\.)*')/m, type: "string" },
    { regex: /^(`(?:[^`\\]|\\.)*`)/m, type: "string" },
    // Numbers
    { regex: /^(\b\d+\.?\d*\b)/m, type: "number" },
    // Keywords (common across languages)
    {
      regex: /^(\b(?:const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|super|extends|implements|interface|type|enum|public|private|protected|static|readonly|abstract|true|false|null|undefined|void|typeof|instanceof|in|of|as|is)\b)/m,
      type: "keyword",
    },
    // Functions
    { regex: /^(\b[a-zA-Z_]\w*)\s*(?=\()/m, type: "function" },
    // Properties
    { regex: /^(\.[a-zA-Z_]\w*)/m, type: "property" },
    // Operators
    { regex: /^([+\-*/%=<>!&|^~?:]+)/m, type: "operator" },
    // Punctuation
    { regex: /^([{}[\]();,])/m, type: "punctuation" },
    // Identifiers
    { regex: /^(\b[a-zA-Z_]\w*\b)/m, type: "identifier" },
    // Whitespace
    { regex: /^(\s+)/m, type: "whitespace" },
    // Any other character
    { regex: /^(.)/m, type: "plain" },
  ];

  while (remaining.length > 0) {
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

const getTokenClass = (type: string): string => {
  switch (type) {
    case "comment":
      return "text-muted-foreground italic";
    case "string":
      return "text-primary/80";
    case "number":
      return "text-accent-foreground";
    case "keyword":
      return "text-primary font-medium";
    case "function":
      return "text-foreground font-medium";
    case "property":
      return "text-muted-foreground";
    case "operator":
      return "text-foreground/70";
    case "punctuation":
      return "text-muted-foreground";
    default:
      return "";
  }
};

const CodeRenderer = ({ code, language, isExpanded }: CodeRendererProps) => {
  const tokens = useMemo(() => tokenize(code, language), [code, language]);
  const lines = code.split("\n");

  return (
    <div className="relative font-mono text-sm">
      <div className="flex">
        {/* Line numbers */}
        <div className="select-none pr-4 pl-4 py-4 text-right text-muted-foreground/50 border-r border-border bg-muted/30">
          {lines.map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code content */}
        <pre className={cn("flex-1 p-4 overflow-x-auto")}>
          <code className="leading-6">
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
