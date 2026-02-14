/**
 * Image Generation Interface
 * Main component for Stable Diffusion image generation sessions
 * Mirrors the architecture of ModernChatInterface for feature parity
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Hash, 
  Loader2, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { ImageGenInput } from './ImageGenInput';
import { GenerationBlockCard } from './GenerationBlockCard';
import { ImageFullscreenModal } from './ImageFullscreenModal';
import { ImageGenNavigation } from './ImageGenNavigation';
import { ImageGenWelcome } from './ImageGenWelcome';
import { 
  GenerationParams, 
  GeneratedImage, 
  ImageGeneration, 
  GenerationBlock,
  DEFAULT_PARAMS
} from './types';

interface ImageGenInterfaceProps {
  session: any;
  onCreditsUpdate?: () => void;
  isReadOnly?: boolean;
  onRenewSession?: () => void;
  className?: string;
}

// Generate unique ID
const generateId = () => `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Group generations into blocks by timestamp proximity
function groupGenerationsIntoBlocks(generations: ImageGeneration[]): GenerationBlock[] {
  const blocks: GenerationBlock[] = [];
  const sorted = [...generations].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  let currentBlock: GenerationBlock | null = null;
  let blockIndex = 0;

  for (const gen of sorted) {
    // Check if this generation should be part of current block
    // (same prompt within 30 seconds = same batch)
    if (
      currentBlock && 
      currentBlock.prompt === gen.prompt &&
      Math.abs(new Date(gen.createdAt).getTime() - currentBlock.timestamp.getTime()) < 30000
    ) {
      currentBlock.images.push({
        id: gen.id,
        url: gen.imageUrl,
        seed: gen.seed,
        prompt: gen.prompt,
        negativePrompt: gen.negativePrompt,
        width: gen.width,
        height: gen.height,
        steps: gen.steps,
        cfgScale: gen.cfgScale,
        createdAt: gen.createdAt.toISOString(),
      });
    } else {
      // Start new block
      blockIndex++;
      currentBlock = {
        id: gen.id,
        index: blockIndex,
        prompt: gen.prompt,
        negativePrompt: gen.negativePrompt,
        images: [{
          id: gen.id,
          url: gen.imageUrl,
          seed: gen.seed,
          prompt: gen.prompt,
          negativePrompt: gen.negativePrompt,
          width: gen.width,
          height: gen.height,
          steps: gen.steps,
          cfgScale: gen.cfgScale,
          createdAt: gen.createdAt.toISOString(),
        }],
        params: {
          width: gen.width,
          height: gen.height,
          steps: gen.steps,
          cfgScale: gen.cfgScale,
        },
        timestamp: new Date(gen.createdAt),
        preview: gen.prompt.slice(0, 100),
      };
      blocks.push(currentBlock);
    }
  }

  return blocks;
}

export function ImageGenInterface({
  session,
  onCreditsUpdate,
  isReadOnly = false,
  onRenewSession,
  className,
}: ImageGenInterfaceProps) {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // State
  const [generations, setGenerations] = useState<ImageGeneration[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSessionId, setImageSessionId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string>('');

  // Compute credits
  const creditsRemaining = useMemo(() => {
    // This should be passed from parent or fetched
    const imagesGenerated = session.images_generated || 0;
    // Default to 20 if not set (basic plan)
    const imageLimit = session.image_credits_per_hour || 20;
    return Math.max(0, imageLimit - imagesGenerated);
  }, [session]);

  // Group generations into blocks
  const generationBlocks = useMemo(() => 
    groupGenerationsIntoBlocks(generations),
    [generations]
  );

  // All images flat list for modal navigation
  const allImages = useMemo(() => 
    generationBlocks.flatMap(block => block.images),
    [generationBlocks]
  );

  // Load existing generations on mount
  useEffect(() => {
    const loadGenerations = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('image_generations')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setGenerations(data.map((g: any) => ({
            id: g.id,
            userId: g.user_id,
            sessionId: g.session_id,
            imageSessionId: g.image_session_id,
            prompt: g.prompt,
            negativePrompt: g.negative_prompt,
            imageUrl: g.image_url,
            modelUsed: g.model_used,
            resolution: g.resolution,
            steps: g.steps || 30,
            cfgScale: g.cfg_scale || 7.5,
            seed: g.seed,
            width: g.width || 512,
            height: g.height || 512,
            batchCount: g.batch_count || 1,
            generationTimeMs: g.generation_time_ms || 0,
            createdAt: new Date(g.created_at),
          })));
        }
      } catch (e) {
        console.error('Failed to load generations:', e);
      }
    };

    loadGenerations();
  }, [session.id]);

  // Keyboard shortcut for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsNavOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll to bottom on new generation
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // Navigate to specific block
  const navigateToBlock = useCallback((blockId: string) => {
    const element = document.getElementById(`generation-block-${blockId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHighlightedBlockId(blockId);
      setTimeout(() => setHighlightedBlockId(null), 2000);
    }
    setActiveBlockId(blockId);
  }, []);

  // Handle image generation
  const handleGenerate = useCallback(async (params: GenerationParams) => {
    if (!params.prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt',
        variant: 'destructive',
      });
      return;
    }

    if (creditsRemaining <= 0) {
      toast({
        title: 'No Credits',
        description: 'You have used all your image generation credits for this session.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: apiError } = await supabase.functions.invoke('sd-generate', {
        body: {
          params,
          sessionId: session.id,
          imageSessionId,
        },
      });

      if (apiError) throw apiError;

      if (data.error) {
        // Handle specific errors
        if (data.loading) {
          setError(`Model is loading. Please wait ${data.estimatedTime || 20} seconds and try again.`);
          toast({
            title: 'Model Loading',
            description: `The AI model is warming up. Please try again in ${data.estimatedTime || 20} seconds.`,
          });
        } else if (data.expired) {
          toast({
            title: 'Session Expired',
            description: 'Your session has ended.',
            variant: 'destructive',
          });
        } else {
          setError(data.error);
          toast({
            title: 'Generation Failed',
            description: data.error,
            variant: 'destructive',
          });
        }
        return;
      }

      // Add new generations to state
      const newGenerations: ImageGeneration[] = data.images.map((img: any) => ({
        id: img.id,
        userId: session.user_id,
        sessionId: session.id,
        imageSessionId,
        prompt: img.prompt,
        negativePrompt: img.negativePrompt,
        imageUrl: img.url,
        modelUsed: session.model_name,
        resolution: `${img.width}x${img.height}`,
        steps: img.steps,
        cfgScale: img.cfgScale,
        seed: img.seed,
        width: img.width,
        height: img.height,
        batchCount: params.batchCount || 1,
        generationTimeMs: data.generationTimeMs,
        createdAt: new Date(img.createdAt),
      }));

      setGenerations(prev => [...prev, ...newGenerations]);

      // Update credits
      if (onCreditsUpdate) {
        onCreditsUpdate();
      }

      toast({
        title: 'Image Generated!',
        description: `${data.creditsRemaining} credits remaining`,
      });

      // Scroll to new generation
      setTimeout(scrollToBottom, 100);

    } catch (err: any) {
      console.error('Generation error:', err);
      const message = err.message || 'Failed to generate image';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [session, imageSessionId, creditsRemaining, onCreditsUpdate, toast, scrollToBottom]);

  // Handle regenerate from a block
  const handleRegenerate = useCallback((block: GenerationBlock) => {
    handleGenerate({
      prompt: block.prompt,
      negativePrompt: block.negativePrompt,
      steps: block.params.steps,
      cfgScale: block.params.cfgScale,
      width: block.params.width,
      height: block.params.height,
      batchCount: 1,
    });
  }, [handleGenerate]);

  // Handle prompt click from welcome screen
  const handlePromptClick = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    handleGenerate({ ...DEFAULT_PARAMS, prompt });
  }, [handleGenerate]);

  // Handle image modal navigation
  const handleImageNavigate = useCallback((direction: 'prev' | 'next') => {
    if (!selectedImage) return;
    const currentIndex = allImages.findIndex(img => img.id === selectedImage.id);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < allImages.length) {
      setSelectedImage(allImages[newIndex]);
    }
  }, [selectedImage, allImages]);

  const hasGenerations = generations.length > 0;

  return (
    <div className={cn('flex h-full', className)}>
      {/* Navigation Panel */}
      <ImageGenNavigation
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        blocks={generationBlocks}
        activeBlockId={activeBlockId}
        onNavigateToBlock={navigateToBlock}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full">
        {/* Generations List */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-4xl mx-auto p-4">
            {!hasGenerations ? (
              <ImageGenWelcome onPromptClick={handlePromptClick} />
            ) : (
              <div className="space-y-6 pb-4">
                {generationBlocks.map((block) => (
                  <GenerationBlockCard
                    key={block.id}
                    id={block.id}
                    index={block.index}
                    prompt={block.prompt}
                    negativePrompt={block.negativePrompt}
                    images={block.images}
                    params={block.params}
                    timestamp={block.timestamp}
                    onRegenerate={() => handleRegenerate(block)}
                    onImageClick={setSelectedImage}
                    isHighlighted={highlightedBlockId === block.id}
                  />
                ))}

                {/* Loading indicator */}
                {isGenerating && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Generating image...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expired session banner */}
        {isReadOnly && (
          <div className="max-w-4xl mx-auto px-4 pb-2">
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted border">
              <p className="text-sm text-muted-foreground">
                This session has expired. You can view all generated images but cannot create new ones.
              </p>
              {onRenewSession && (
                <Button size="sm" onClick={onRenewSession} className="shrink-0">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Renew Session
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="max-w-4xl mx-auto px-4 pb-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive flex-1">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="h-7"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Input Panel */}
        {!isReadOnly && (
          <div className="border-t bg-background/80 backdrop-blur-lg">
            <div className="max-w-4xl mx-auto p-4">
              <div className="flex items-start gap-3">
                {/* Navigation Trigger */}
                {hasGenerations && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => setIsNavOpen(true)}
                    title="Browse generations (⌘K)"
                  >
                    <Hash className="w-4 h-4" />
                  </Button>
                )}

                {/* Input */}
                <div className="flex-1">
                  <ImageGenInput
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    creditsRemaining={creditsRemaining}
                    disabled={creditsRemaining <= 0}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <ImageFullscreenModal
        image={selectedImage}
        images={allImages}
        onClose={() => setSelectedImage(null)}
        onNavigate={handleImageNavigate}
      />
    </div>
  );
}
