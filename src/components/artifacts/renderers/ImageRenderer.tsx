import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageRendererProps {
  src: string;
  alt?: string;
  isFullscreen?: boolean;
}

const ImageRenderer = ({ src, alt, isFullscreen }: ImageRendererProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <span className="text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center p-4",
        isFullscreen && "h-full"
      )}
    >
      {isLoading && (
        <Skeleton className="absolute inset-4 rounded-lg" />
      )}
      <img
        src={src}
        alt={alt || "Generated image"}
        className={cn(
          "max-w-full rounded-lg transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          isFullscreen ? "max-h-full object-contain" : "max-h-[300px]"
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
};

export default ImageRenderer;
