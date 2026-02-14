/**
 * Image Generation Input Panel
 * Prompt input with advanced options for Stable Diffusion
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { 
  ImageIcon, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Wand2,
  Shuffle,
  Settings2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenerationParams, DEFAULT_PARAMS, RESOLUTION_PRESETS, STYLE_PRESETS } from './types';

interface ImageGenInputProps {
  onGenerate: (params: GenerationParams) => Promise<void>;
  isGenerating: boolean;
  creditsRemaining: number;
  disabled?: boolean;
  className?: string;
}

export function ImageGenInput({
  onGenerate,
  isGenerating,
  creditsRemaining,
  disabled = false,
  className,
}: ImageGenInputProps) {
  const [params, setParams] = useState<GenerationParams>(DEFAULT_PARAMS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedResolution, setSelectedResolution] = useState('512x512');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params.prompt.trim() || isGenerating || disabled || creditsRemaining <= 0) return;

    // Apply style preset
    const stylePreset = STYLE_PRESETS.find(s => s.label === selectedStyle);
    const finalPrompt = stylePreset && stylePreset.suffix 
      ? params.prompt + stylePreset.suffix 
      : params.prompt;

    await onGenerate({ ...params, prompt: finalPrompt });
  };

  const handleResolutionChange = (value: string) => {
    setSelectedResolution(value);
    const preset = RESOLUTION_PRESETS.find(p => `${p.width}x${p.height}` === value);
    if (preset) {
      setParams(prev => ({ ...prev, width: preset.width, height: preset.height }));
    }
  };

  const randomizeSeed = () => {
    setParams(prev => ({ ...prev, seed: Math.floor(Math.random() * 2147483647) }));
  };

  const isDisabled = disabled || isGenerating || creditsRemaining <= 0;

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {/* Main Prompt Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="prompt" className="text-sm font-medium">
            Describe your image
          </Label>
          <span className="text-xs text-muted-foreground">
            {creditsRemaining} credits remaining
          </span>
        </div>
        <Textarea
          id="prompt"
          placeholder="A serene mountain landscape at sunset, with golden light reflecting off a calm lake..."
          value={params.prompt}
          onChange={(e) => setParams(prev => ({ ...prev, prompt: e.target.value }))}
          disabled={isDisabled}
          className="min-h-[100px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
      </div>

      {/* Quick Settings Row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[150px]">
          <Select value={selectedResolution} onValueChange={handleResolutionChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Resolution" />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTION_PRESETS.map(preset => (
                <SelectItem key={`${preset.width}x${preset.height}`} value={`${preset.width}x${preset.height}`}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <Select value={selectedStyle} onValueChange={setSelectedStyle}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Style preset" />
            </SelectTrigger>
            <SelectContent>
              {STYLE_PRESETS.map(style => (
                <SelectItem key={style.label} value={style.label}>
                  {style.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Options */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Settings2 className="w-3 h-3" />
              Advanced Options
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label htmlFor="negativePrompt" className="text-xs text-muted-foreground">
              Negative Prompt (things to avoid)
            </Label>
            <Textarea
              id="negativePrompt"
              placeholder="blurry, bad quality, distorted..."
              value={params.negativePrompt}
              onChange={(e) => setParams(prev => ({ ...prev, negativePrompt: e.target.value }))}
              disabled={isDisabled}
              className="min-h-[60px] resize-none text-sm"
            />
          </div>

          {/* Steps & CFG */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Steps</Label>
                <span className="text-xs font-medium">{params.steps}</span>
              </div>
              <Slider
                value={[params.steps || 30]}
                onValueChange={([value]) => setParams(prev => ({ ...prev, steps: value }))}
                min={10}
                max={50}
                step={1}
                disabled={isDisabled}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">CFG Scale</Label>
                <span className="text-xs font-medium">{params.cfgScale}</span>
              </div>
              <Slider
                value={[params.cfgScale || 7.5]}
                onValueChange={([value]) => setParams(prev => ({ ...prev, cfgScale: value }))}
                min={1}
                max={20}
                step={0.5}
                disabled={isDisabled}
              />
            </div>
          </div>

          {/* Seed */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Seed (optional)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Random"
                value={params.seed || ''}
                onChange={(e) => setParams(prev => ({ 
                  ...prev, 
                  seed: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                disabled={isDisabled}
                className="h-9"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="h-9 w-9"
                onClick={randomizeSeed}
                disabled={isDisabled}
              >
                <Shuffle className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Batch Count */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Batch Count</Label>
              <span className="text-xs font-medium">{params.batchCount} image{(params.batchCount || 1) > 1 ? 's' : ''}</span>
            </div>
            <Slider
              value={[params.batchCount || 1]}
              onValueChange={([value]) => setParams(prev => ({ ...prev, batchCount: value }))}
              min={1}
              max={Math.min(4, creditsRemaining)}
              step={1}
              disabled={isDisabled || creditsRemaining < 2}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Generate Button */}
      <Button
        type="submit"
        className="w-full h-11"
        disabled={isDisabled || !params.prompt.trim()}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : creditsRemaining <= 0 ? (
          <>
            <ImageIcon className="w-4 h-4 mr-2" />
            No Credits Remaining
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            Generate {(params.batchCount || 1) > 1 ? `${params.batchCount} Images` : 'Image'}
          </>
        )}
      </Button>

      {/* Hint */}
      <p className="text-xs text-center text-muted-foreground">
        Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">⌘</kbd>+<kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Enter</kbd> to generate
      </p>
    </form>
  );
}
