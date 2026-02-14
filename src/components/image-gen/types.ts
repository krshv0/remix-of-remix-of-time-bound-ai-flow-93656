/**
 * Image Generation Types
 * Type definitions for Stable Diffusion image generation sessions
 */

export interface GenerationParams {
  prompt: string;
  negativePrompt?: string;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  width?: number;
  height?: number;
  batchCount?: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  seed: number;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  createdAt: string;
}

export interface ImageGeneration {
  id: string;
  userId: string;
  sessionId: string;
  imageSessionId?: string;
  prompt: string;
  negativePrompt?: string;
  imageUrl: string;
  modelUsed: string;
  resolution: string;
  steps: number;
  cfgScale: number;
  seed: number;
  width: number;
  height: number;
  batchCount: number;
  generationTimeMs: number;
  createdAt: Date;
}

export interface ImageSession {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerationBlock {
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
  preview: string;
}

export interface ImageGenState {
  generations: ImageGeneration[];
  isGenerating: boolean;
  error: string | null;
  imageSessionId: string | null;
}

export interface GenerationSearchMatch {
  blockId: string;
  highlightRanges: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export const DEFAULT_PARAMS: GenerationParams = {
  prompt: '',
  negativePrompt: 'blurry, bad quality, distorted, ugly, nsfw, watermark, text',
  steps: 30,
  cfgScale: 7.5,
  seed: undefined,
  width: 512,
  height: 512,
  batchCount: 1,
};

export const RESOLUTION_PRESETS = [
  { label: 'Square (512×512)', width: 512, height: 512 },
  { label: 'Portrait (512×768)', width: 512, height: 768 },
  { label: 'Landscape (768×512)', width: 768, height: 512 },
  { label: 'Large Square (1024×1024)', width: 1024, height: 1024 },
];

export const STYLE_PRESETS = [
  { label: 'None', suffix: '' },
  { label: 'Photorealistic', suffix: ', photorealistic, 8k, high detail, professional photography' },
  { label: 'Anime', suffix: ', anime style, vibrant colors, detailed' },
  { label: 'Oil Painting', suffix: ', oil painting, classical art, detailed brushwork' },
  { label: 'Digital Art', suffix: ', digital art, concept art, artstation' },
  { label: 'Cinematic', suffix: ', cinematic lighting, dramatic, movie still' },
];
