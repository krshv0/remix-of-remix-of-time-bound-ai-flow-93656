import { useMemo, useState, lazy, Suspense } from "react";
import { parseMessageForArtifacts, Artifact } from "@/lib/artifactParser";
import { ArtifactContainer } from "./ArtifactContainer";
import { ArtifactFullscreenModal } from "./ArtifactFullscreenModal";
import { cn } from "@/lib/utils";

interface MessageWithArtifactsProps {
  content: string;
  className?: string;
}

// Simple markdown rendering for text segments
const renderTextWithMarkdown = (text: string): JSX.Element => {
  // Process basic markdown inline
  let processed = text;

  // Bold
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  processed = processed.replace(/__(.*?)__/g, '<strong class="font-semibold">$1</strong>');

  // Italic
  processed = processed.replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>');
  processed = processed.replace(/(?<!_)_(?!_)([^_]+)(?<!_)_(?!_)/g, '<em class="italic">$1</em>');

  // Inline code
  processed = processed.replace(
    /`([^`]+)`/g,
    '<code class="px-1.5 py-0.5 bg-secondary rounded text-[13px] font-mono text-foreground/90">$1</code>'
  );

  // Links
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-foreground underline underline-offset-2 hover:no-underline">$1</a>'
  );

  return (
    <span
      className="whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
};

export const MessageWithArtifacts = ({
  content,
  className,
}: MessageWithArtifactsProps) => {
  const [fullscreenArtifact, setFullscreenArtifact] = useState<Artifact | null>(null);

  const parsed = useMemo(() => parseMessageForArtifacts(content), [content]);

  // If no artifacts, render as simple text
  if (parsed.artifacts.length === 0) {
    return (
      <p className={cn("text-[15px] leading-[1.7]", className)}>
        {renderTextWithMarkdown(content)}
      </p>
    );
  }

  // Build the content with interleaved text and artifacts
  const contentParts: JSX.Element[] = [];
  let currentTextIndex = 0;
  let artifactIndex = 0;

  // Split content by artifact placeholders
  const parts = content.split(/```[\s\S]*?```|!\[[^\]]*\]\([^)]+\)|data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/);
  
  // Process each part
  for (let i = 0; i < parts.length; i++) {
    const textPart = parts[i].trim();
    
    if (textPart) {
      contentParts.push(
        <p key={`text-${i}`} className="text-[15px] leading-[1.7] my-3">
          {renderTextWithMarkdown(textPart)}
        </p>
      );
    }

    // Add artifact after text if available
    if (artifactIndex < parsed.artifacts.length && i < parts.length - 1) {
      const artifact = parsed.artifacts[artifactIndex];
      contentParts.push(
        <div key={`artifact-${artifact.id}`} className="my-4">
          <ArtifactContainer
            artifact={artifact}
            onFullscreenToggle={() => setFullscreenArtifact(artifact)}
          />
        </div>
      );
      artifactIndex++;
    }
  }

  // Add remaining artifacts
  while (artifactIndex < parsed.artifacts.length) {
    const artifact = parsed.artifacts[artifactIndex];
    contentParts.push(
      <div key={`artifact-${artifact.id}`} className="my-4">
        <ArtifactContainer
          artifact={artifact}
          onFullscreenToggle={() => setFullscreenArtifact(artifact)}
        />
      </div>
    );
    artifactIndex++;
  }

  return (
    <div className={className}>
      {contentParts}

      <ArtifactFullscreenModal
        artifact={fullscreenArtifact}
        onClose={() => setFullscreenArtifact(null)}
      />
    </div>
  );
};
