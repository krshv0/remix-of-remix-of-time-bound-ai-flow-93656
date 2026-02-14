/**
 * Image Fullscreen Modal
 * Full resolution image viewer with zoom and download
 */

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeneratedImage } from './types';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ImageFullscreenModalProps {
  image: GeneratedImage | null;
  images?: GeneratedImage[];
  onClose: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function ImageFullscreenModal({
  image,
  images = [],
  onClose,
  onNavigate,
}: ImageFullscreenModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentIndex = images.findIndex(img => img.id === image?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  // Reset transforms when image changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [image?.id]);

  // Keyboard navigation
  useEffect(() => {
    if (!image) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrev && onNavigate) onNavigate('prev');
          break;
        case 'ArrowRight':
          if (hasNext && onNavigate) onNavigate('next');
          break;
        case '+':
        case '=':
          setZoom(z => Math.min(z + 0.25, 3));
          break;
        case '-':
          setZoom(z => Math.max(z - 0.25, 0.5));
          break;
        case 'r':
          setRotation(r => (r + 90) % 360);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [image, hasPrev, hasNext, onNavigate, onClose]);

  const downloadImage = useCallback(() => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `sd-${image.seed || Date.now()}.png`;
    link.click();
  }, [image]);

  const copyPrompt = useCallback(async () => {
    if (!image) return;
    await navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [image]);

  if (!image) return null;

  return (
    <Dialog open={!!image} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 gap-0 overflow-hidden bg-black/95">
        <VisuallyHidden>
          <DialogTitle>Image Viewer</DialogTitle>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/10 text-white border-0">
              {image.width}×{image.height}
            </Badge>
            {image.seed && (
              <Badge variant="secondary" className="bg-white/10 text-white border-0">
                Seed: {image.seed}
              </Badge>
            )}
            {images.length > 1 && (
              <Badge variant="secondary" className="bg-white/10 text-white border-0">
                {currentIndex + 1} / {images.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-white text-sm min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setRotation(r => (r + 90) % 360)}
              title="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-white/20 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={copyPrompt}
              title="Copy prompt"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={downloadImage}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={onClose}
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full text-white hover:bg-white/10",
                !hasPrev && "opacity-30 pointer-events-none"
              )}
              onClick={() => onNavigate?.('prev')}
              disabled={!hasPrev}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full text-white hover:bg-white/10",
                !hasNext && "opacity-30 pointer-events-none"
              )}
              onClick={() => onNavigate?.('next')}
              disabled={!hasNext}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Image */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-8">
          <img
            src={image.url}
            alt={image.prompt}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
            draggable={false}
          />
        </div>

        {/* Footer with Prompt */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white/90 text-sm leading-relaxed max-w-3xl mx-auto text-center line-clamp-2">
            {image.prompt}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
