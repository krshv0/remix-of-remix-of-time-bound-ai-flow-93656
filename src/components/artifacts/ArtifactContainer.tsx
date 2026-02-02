import { useState, lazy, Suspense } from "react";
import { Artifact } from "@/lib/artifactParser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Maximize2,
  Minimize2,
  Download,
  Copy,
  Check,
  FileCode,
  FileText,
  Image as ImageIcon,
  FileType,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy load renderers
const CodeRenderer = lazy(() => import("./renderers/CodeRenderer"));
const ImageRenderer = lazy(() => import("./renderers/ImageRenderer"));
const MarkdownRenderer = lazy(() => import("./renderers/MarkdownRenderer"));

interface ArtifactContainerProps {
  artifact: Artifact;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

const getArtifactIcon = (type: Artifact["type"]) => {
  switch (type) {
    case "code":
      return FileCode;
    case "image":
      return ImageIcon;
    case "markdown":
      return FileText;
    default:
      return FileType;
  }
};

const LoadingFallback = () => (
  <div className="p-4 space-y-2">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-4 w-5/6" />
  </div>
);

export const ArtifactContainer = ({
  artifact,
  isFullscreen = false,
  onFullscreenToggle,
}: ArtifactContainerProps) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const Icon = getArtifactIcon(artifact.type);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    let blob: Blob;
    let filename: string;

    if (artifact.type === "image" && artifact.content.startsWith("data:")) {
      // Convert base64 to blob
      const [header, base64] = artifact.content.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/png";
      const binary = atob(base64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      blob = new Blob([array], { type: mimeType });
      filename = artifact.filename || `image.${mimeType.split("/")[1]}`;
    } else {
      // Text content
      const mimeType = artifact.type === "code" ? "text/plain" : "text/plain";
      blob = new Blob([artifact.content], { type: mimeType });
      filename = artifact.filename || `${artifact.title || "artifact"}.txt`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    switch (artifact.type) {
      case "code":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CodeRenderer
              code={artifact.content}
              language={artifact.language}
              isExpanded={isExpanded || isFullscreen}
            />
          </Suspense>
        );
      case "image":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ImageRenderer
              src={artifact.content}
              alt={artifact.title}
              isFullscreen={isFullscreen}
            />
          </Suspense>
        );
      case "markdown":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <MarkdownRenderer content={artifact.content} />
          </Suspense>
        );
      default:
        return (
          <pre className="p-4 text-sm overflow-auto whitespace-pre-wrap">
            {artifact.content}
          </pre>
        );
    }
  };

  const showCopyButton = artifact.type === "code" || artifact.type === "text" || artifact.type === "markdown";
  const canExpand = artifact.type === "code" && artifact.content.split("\n").length > 10;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 border-border/50 bg-card/80",
        isFullscreen && "fixed inset-4 z-50 flex flex-col"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className="w-4 h-4 text-muted-foreground/70 shrink-0" />
          <span className="text-xs font-medium text-foreground/80 truncate">
            {artifact.title || artifact.filename || artifact.type}
          </span>
          {artifact.language && (
            <span className="text-xs text-muted-foreground/50 hidden sm:inline font-mono">
              {artifact.language}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {showCopyButton && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDownload}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>

          {canExpand && !isFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </Button>
          )}

          {onFullscreenToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onFullscreenToggle}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          "overflow-hidden",
          isFullscreen ? "flex-1 overflow-auto" : canExpand && !isExpanded ? "max-h-[240px] overflow-hidden" : "max-h-[500px] overflow-auto"
        )}
      >
        {renderContent()}
      </div>

      {/* Expand indicator for collapsed code */}
      {canExpand && !isExpanded && !isFullscreen && (
        <div className="px-3 py-1.5 border-t border-border bg-muted/30 text-center">
          <button
            onClick={() => setIsExpanded(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Show more ({artifact.content.split("\n").length} lines)
          </button>
        </div>
      )}
    </Card>
  );
};
