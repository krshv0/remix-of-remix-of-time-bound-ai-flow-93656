/**
 * Generation Block Card
 * Displays a single image generation with prompt, params, and image grid
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  RefreshCw, 
  Copy, 
  Check, 
  Clock,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeneratedImage } from './types';
import { format } from 'date-fns';

interface GenerationBlockCardProps {
  id: string;
  index: number;
  prompt: string;
  negativePrompt?: string;
  images: GeneratedImage[];
  params: {
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
  };
  timestamp: Date;
  onRegenerate?: () => void;
  onImageClick?: (image: GeneratedImage) => void;
  isHighlighted?: boolean;
  className?: string;
}

export function GenerationBlockCard({
  id,
  index,
  prompt,
  negativePrompt,
  images,
  params,
  timestamp,
  onRegenerate,
  onImageClick,
  isHighlighted = false,
  className,
}: GenerationBlockCardProps) {
  const [copied, setCopied] = useState(false);
  const [showParams, setShowParams] = useState(false);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadImage = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `sd-${image.seed || Date.now()}.png`;
    link.click();
  };

  return (
    <Card 
      id={`generation-block-${id}`}
      className={cn(
        'transition-all duration-300',
        isHighlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Block Index & Timestamp */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                #{index}
              </Badge>
              <Clock className="w-3 h-3" />
              <span>{format(timestamp, 'MMM d, h:mm a')}</span>
            </div>
            
            {/* Prompt */}
            <p className="text-sm font-medium leading-relaxed line-clamp-3">
              {prompt}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={copyPrompt}
              title="Copy prompt"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            {onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRegenerate}
                title="Regenerate"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Parameters Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-7 px-2 mt-2"
          onClick={() => setShowParams(!showParams)}
        >
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Settings2 className="w-3 h-3" />
            {params.width}×{params.height} • {params.steps} steps • CFG {params.cfgScale}
          </span>
          {showParams ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>

        {/* Expanded Parameters */}
        {showParams && (
          <div className="mt-2 p-3 rounded-lg bg-muted/50 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Resolution:</span>{' '}
                <span className="font-medium">{params.width}×{params.height}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Steps:</span>{' '}
                <span className="font-medium">{params.steps}</span>
              </div>
              <div>
                <span className="text-muted-foreground">CFG Scale:</span>{' '}
                <span className="font-medium">{params.cfgScale}</span>
              </div>
              {images[0]?.seed && (
                <div>
                  <span className="text-muted-foreground">Seed:</span>{' '}
                  <span className="font-medium">{images[0].seed}</span>
                </div>
              )}
            </div>
            {negativePrompt && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground">Negative prompt:</span>
                <p className="mt-1 text-foreground/80">{negativePrompt}</p>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Image Grid */}
        <div className={cn(
          'grid gap-3',
          images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        )}>
          {images.map((image) => (
            <div 
              key={image.id} 
              className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
            >
              <img
                src={image.url}
                alt={`Generated: ${prompt.slice(0, 50)}`}
                className="w-full h-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
                onClick={() => onImageClick?.(image)}
                loading="lazy"
              />
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageClick?.(image);
                    }}
                  >
                    <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(image);
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Save
                  </Button>
                </div>
              </div>

              {/* Seed Badge */}
              {image.seed && (
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 left-2 text-[10px] opacity-70"
                >
                  Seed: {image.seed}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
