# Image & Video Generation Implementation Spec
## AI Access Hub - Pay-Per-Hour Model

---

## Overview

This document outlines how to implement image and video generation features within the existing pay-per-hour session model, including usage tracking, limits, and pricing.

---

## Business Model Integration

### Pricing Structure (Indian Rupees)

Each plan tier includes generation credits per hour:

| Plan | Price/Hour | Text Tokens | Image Credits | Video Credits |
|------|------------|-------------|---------------|---------------|
| Flash Lite | ₹50 (~$0.60) | 150,000 | 3 images | 0 videos |
| Flash | ₹100 (~$1.20) | 500,000 | 8 images | 1 video |
| Pro | ₹200 (~$2.40) | 1,000,000 | 15 images | 3 videos |

### Credit System

- **Image Credits**: 1 credit = 1 image generation (512x512 or 768x768)
- **Video Credits**: 1 credit = 1 video (up to 5 seconds, 480p)
- Credits reset per hour of purchased time
- Unused credits don't roll over to next session
- Using **Stable Diffusion v1.5** (free, self-hosted or via Hugging Face API)

---

## Database Schema Updates

### 1. Update session_config table

```sql
-- Add generation limits to session_config
ALTER TABLE session_config 
ADD COLUMN image_credits_per_hour INTEGER DEFAULT 0,
ADD COLUMN video_credits_per_hour INTEGER DEFAULT 0;

-- Update existing plans with realistic credits
UPDATE session_config SET 
  image_credits_per_hour = 3, 
  video_credits_per_hour = 0 
WHERE plan_id = 'flash-lite';

UPDATE session_config SET 
  image_credits_per_hour = 8, 
  video_credits_per_hour = 1 
WHERE plan_id = 'flash';

UPDATE session_config SET 
  image_credits_per_hour = 15, 
  video_credits_per_hour = 3 
WHERE plan_id = 'pro';
```

### 2. Track usage in user_sessions table

```sql
-- Add generation tracking to user_sessions
ALTER TABLE user_sessions 
ADD COLUMN images_generated INTEGER DEFAULT 0,
ADD COLUMN videos_generated INTEGER DEFAULT 0;
```

### 3. Create image_generations table

```sql
CREATE TABLE image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  session_id UUID REFERENCES user_sessions NOT NULL,
  conversation_id UUID REFERENCES conversations,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  model_used TEXT DEFAULT 'stable-diffusion-v1-5',
  resolution TEXT DEFAULT '512x512',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_image_generations_user ON image_generations(user_id);
CREATE INDEX idx_image_generations_session ON image_generations(session_id);
```

### 4. Create video_generations table

```sql
CREATE TABLE video_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  session_id UUID REFERENCES user_sessions NOT NULL,
  conversation_id UUID REFERENCES conversations,
  prompt TEXT NOT NULL,
  video_url TEXT NOT NULL,
  model_used TEXT DEFAULT 'stable-video-diffusion',
  duration_seconds INTEGER DEFAULT 5,
  resolution TEXT DEFAULT '480p',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_video_generations_user ON video_generations(user_id);
CREATE INDEX idx_video_generations_session ON video_generations(session_id);
```

---

## Implementation Steps

### Phase 1: Backend Setup

#### Step 1: Create Supabase Storage Buckets

```typescript
// Run in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('generated-images', 'generated-images', true),
  ('generated-videos', 'generated-videos', true);

-- Set up storage policies
CREATE POLICY "Users can view their own images"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### Step 2: Create Edge Function for Image Generation


Create `supabase/functions/generate-image/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, sessionId, conversationId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // Check session and limits
    const { data: session, error: sessionError } = await supabaseClient
      .from('user_sessions')
      .select('*, session_config:session_config(*)')
      .eq('id', sessionId)
      .eq('status', 'active')
      .single();

    if (sessionError || !session) {
      throw new Error('Invalid or expired session');
    }

    // Check if user has credits left
    const imagesGenerated = session.images_generated || 0;
    const imageLimit = session.session_config[0]?.image_credits_per_hour || 0;

    if (imagesGenerated >= imageLimit) {
      return new Response(
        JSON.stringify({ 
          error: `Image generation limit reached (${imageLimit} per hour). Upgrade your plan for more credits.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Call Hugging Face Stable Diffusion API (FREE)
    const imageResponse = await fetch(
      'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('HUGGINGFACE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            num_inference_steps: 30,
            guidance_scale: 7.5,
            width: 512,
            height: 512,
          },
        }),
      }
    );

    // Response is a blob (image binary)
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('generated-images')
      .upload(fileName, new Uint8Array(imageBuffer), {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const imageUrl = supabaseClient.storage
      .from('generated-images')
      .getPublicUrl(fileName).data.publicUrl;

    // Save to database
    await supabaseClient.from('image_generations').insert({
      user_id: user.id,
      session_id: sessionId,
      conversation_id: conversationId,
      prompt: prompt,
      image_url: imageUrl,
      model_used: 'stable-diffusion-v1-5',
      resolution: '512x512',
    });

    // Update session usage
    await supabaseClient
      .from('user_sessions')
      .update({ images_generated: imagesGenerated + 1 })
      .eq('id', sessionId);

    return new Response(
      JSON.stringify({ 
        imageUrl,
        creditsRemaining: imageLimit - imagesGenerated - 1,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
```

#### Step 3: Create Edge Function for Video Generation

Similar structure to image generation, but for videos.
Create `supabase/functions/generate-video/index.ts` with same pattern.

---

### Phase 2: Frontend Components

#### Component 1: ImageGenerator Component


Create `src/components/chat/ImageGenerator.tsx`:

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Image, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageGeneratorProps {
  sessionId: string;
  conversationId?: string;
  creditsRemaining: number;
  onImageGenerated: () => void;
}

export const ImageGenerator = ({ 
  sessionId, 
  conversationId, 
  creditsRemaining,
  onImageGenerated 
}: ImageGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    if (creditsRemaining <= 0) {
      toast({
        title: "No Credits Remaining",
        description: "You've used all your image generation credits for this session.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, sessionId, conversationId },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Generation Failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setGeneratedImage(data.imageUrl);
      onImageGenerated();
      
      toast({
        title: "Image Generated!",
        description: `${data.creditsRemaining} credits remaining`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `generated-${Date.now()}.png`;
      link.click();
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Image className="w-4 h-4" />
          Generate Image
        </h3>
        <span className="text-xs text-muted-foreground">
          {creditsRemaining} credits left
        </span>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Describe the image you want to generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={generating}
          onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
        />
        <Button 
          onClick={handleGenerate} 
          disabled={generating || creditsRemaining <= 0}
          size="sm"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Image className="w-4 h-4" />
          )}
        </Button>
      </div>

      {generatedImage && (
        <div className="relative group">
          <img 
            src={generatedImage} 
            alt="Generated" 
            className="w-full rounded-lg"
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      )}
    </Card>
  );
};
```

#### Component 2: Update Chat Stats Sidebar

Update `src/pages/Chat.tsx` to show generation credits:


```typescript
// Add to Chat.tsx state
const [generationStats, setGenerationStats] = useState<{
  imagesUsed: number;
  imagesLimit: number;
  videosUsed: number;
  videosLimit: number;
} | null>(null);

// Update loadActiveSession to fetch generation limits
const { data: config } = await (supabase as any)
  .from('session_config')
  .select('token_limit_per_hour, image_credits_per_hour, video_credits_per_hour')
  .eq('plan_id', data.plan_id)
  .eq('model_name', data.model_name)
  .single();

if (config) {
  setTokenStats({
    used: data.tokens_used || 0,
    limit: config.token_limit_per_hour,
  });
  setGenerationStats({
    imagesUsed: data.images_generated || 0,
    imagesLimit: config.image_credits_per_hour || 0,
    videosUsed: data.videos_generated || 0,
    videosLimit: config.video_credits_per_hour || 0,
  });
}

// Add to stats sidebar
{generationStats && (
  <>
    <div className="p-3 rounded-lg bg-muted/50 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-xs text-muted-foreground">Image Credits</span>
        <span className="font-medium text-xs">
          {generationStats.imagesUsed} / {generationStats.imagesLimit}
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all"
          style={{ 
            width: `${Math.min((generationStats.imagesUsed / generationStats.imagesLimit) * 100, 100)}%` 
          }}
        />
      </div>
    </div>

    <div className="p-3 rounded-lg bg-muted/50 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-xs text-muted-foreground">Video Credits</span>
        <span className="font-medium text-xs">
          {generationStats.videosUsed} / {generationStats.videosLimit}
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-purple-500 h-2 rounded-full transition-all"
          style={{ 
            width: `${Math.min((generationStats.videosUsed / generationStats.videosLimit) * 100, 100)}%` 
          }}
        />
      </div>
    </div>
  </>
)}
```

---

## Integration with Chat Interface

### Option 1: Inline Generation (Recommended)

Add generation buttons to the chat input area:

```typescript
// In ModernChatInterface or ChatInput component
<div className="flex items-center gap-2">
  <Button
    variant="ghost"
    size="icon"
    onClick={() => setShowImageGenerator(!showImageGenerator)}
    title="Generate Image"
  >
    <Image className="w-4 h-4" />
  </Button>
  <Button
    variant="ghost"
    size="icon"
    onClick={() => setShowVideoGenerator(!showVideoGenerator)}
    title="Generate Video"
  >
    <Video className="w-4 h-4" />
  </Button>
</div>

{showImageGenerator && (
  <ImageGenerator
    sessionId={session.id}
    conversationId={conversationId}
    creditsRemaining={generationStats.imagesLimit - generationStats.imagesUsed}
    onImageGenerated={refreshStats}
  />
)}
```

### Option 2: Command-Based Generation

Allow users to type commands in chat:

```
/image a beautiful sunset over mountains
/video a cat playing with yarn
```

Parse these in the chat input handler and trigger generation.

---

## Pricing Display Updates

Update `src/components/PlanSelector.tsx` to show generation credits:

```typescript
const plans = [
  {
    id: 'flash-lite',
    name: 'Flash Lite',
    price: 50,
    currency: '₹',
    features: [
      '150K tokens/hour',
      '3 image generations',
      'No video generation',
      'Basic support'
    ]
  },
  {
    id: 'flash',
    name: 'Flash',
    price: 100,
    currency: '₹',
    features: [
      '500K tokens/hour',
      '8 image generations',
      '1 video generation',
      'Priority support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 200,
    currency: '₹',
    features: [
      '1M tokens/hour',
      '15 image generations',
      '3 video generations',
      '24/7 support'
    ]
  },
];
```

---

## Usage Tracking & Analytics

### Dashboard Analytics Component

Create `src/components/GenerationAnalytics.tsx`:

```typescript
export const GenerationAnalytics = ({ userId }: { userId: string }) => {
  const [stats, setStats] = useState({
    totalImages: 0,
    totalVideos: 0,
    recentGenerations: []
  });

  // Load user's generation history
  // Display charts and statistics
  // Show gallery of generated content
};
```

---

## Migration Script

Create `supabase/migrations/[timestamp]_add_generation_features.sql`:


```sql
-- Add generation limits to session_config
ALTER TABLE session_config 
ADD COLUMN IF NOT EXISTS image_credits_per_hour INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_credits_per_hour INTEGER DEFAULT 0;

-- Add generation tracking to user_sessions
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS images_generated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS videos_generated INTEGER DEFAULT 0;

-- Create image_generations table
CREATE TABLE IF NOT EXISTS image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  session_id UUID REFERENCES user_sessions NOT NULL,
  conversation_id UUID REFERENCES conversations,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  model_used TEXT DEFAULT 'stable-diffusion-v1-5',
  resolution TEXT DEFAULT '512x512',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_generations_user ON image_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_image_generations_session ON image_generations(session_id);

-- Create video_generations table
CREATE TABLE IF NOT EXISTS video_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  session_id UUID REFERENCES user_sessions NOT NULL,
  conversation_id UUID REFERENCES conversations,
  prompt TEXT NOT NULL,
  video_url TEXT NOT NULL,
  model_used TEXT DEFAULT 'stable-video-diffusion',
  duration_seconds INTEGER DEFAULT 5,
  resolution TEXT DEFAULT '480p',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_generations_user ON video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_session ON video_generations(session_id);

-- Update existing plans with realistic credits
UPDATE session_config SET 
  image_credits_per_hour = 3, 
  video_credits_per_hour = 0 
WHERE plan_id = 'flash-lite';

UPDATE session_config SET 
  image_credits_per_hour = 8, 
  video_credits_per_hour = 1 
WHERE plan_id = 'flash';

UPDATE session_config SET 
  image_credits_per_hour = 15, 
  video_credits_per_hour = 3 
WHERE plan_id = 'pro';

-- Enable RLS
ALTER TABLE image_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own image generations"
ON image_generations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own image generations"
ON image_generations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own video generations"
ON video_generations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video generations"
ON video_generations FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

---

## API Integration - Stable Diffusion v1.5 (FREE)

### Using Hugging Face Inference API (Recommended for Demo)

**Advantages:**
- ✅ **FREE** with rate limits (30 requests/hour on free tier)
- ✅ No credit card required
- ✅ Easy to set up
- ✅ Good quality images
- ✅ Fast inference (~3-5 seconds)

**Setup:**
1. Create account at [huggingface.co](https://huggingface.co)
2. Get API token from Settings → Access Tokens
3. Add to Supabase Edge Function secrets: `HUGGINGFACE_API_KEY`

```typescript
// Stable Diffusion v1.5 via Hugging Face (FREE)
const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');

const response = await fetch(
  'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        num_inference_steps: 30,  // Quality vs speed tradeoff
        guidance_scale: 7.5,       // How closely to follow prompt
        width: 512,                // Standard SD v1.5 resolution
        height: 512,
        negative_prompt: "blurry, bad quality, distorted", // Optional
      },
    }),
  }
);

// Response is binary image data
const imageBlob = await response.blob();
```

### Alternative: Self-Hosted Stable Diffusion (For Production)

If you want unlimited generations:

```typescript
// Self-hosted SD v1.5 API
const response = await fetch('http://your-server:7860/sdapi/v1/txt2img', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: prompt,
    steps: 30,
    width: 512,
    height: 512,
    cfg_scale: 7.5,
  }),
});
```

**Setup Guide:**
1. Use [AUTOMATIC1111 WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
2. Deploy on cloud (AWS, GCP, or DigitalOcean)
3. Enable API mode with `--api` flag
4. Cost: ~₹500-1000/month for GPU instance

### Video Generation (Optional)

For video, use **Stable Video Diffusion** via Hugging Face:

```typescript
const response = await fetch(
  'https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
    },
    body: JSON.stringify({
      inputs: imageBase64, // Requires input image
      parameters: {
        num_frames: 14,
        fps: 7,
      },
    }),
  }
);
```

---

## Testing Checklist

- [ ] Database migrations run successfully
- [ ] Storage buckets created with proper policies
- [ ] Edge functions deploy without errors
- [ ] Image generation works and respects credit limits
- [ ] Video generation works and respects credit limits
- [ ] Credits decrement correctly after generation
- [ ] Error handling for exceeded limits
- [ ] Generated content saves to database
- [ ] Files upload to storage correctly
- [ ] Public URLs are accessible
- [ ] Stats sidebar updates in real-time
- [ ] Download functionality works
- [ ] Gallery view displays all generations
- [ ] RLS policies prevent unauthorized access

---

## Cost Considerations

### API Costs (Stable Diffusion v1.5)

| Option | Image Cost | Video Cost | Notes |
|--------|-----------|------------|-------|
| **Hugging Face Free** | ₹0 (FREE) | ₹0 (FREE) | 30 req/hour limit, perfect for demo |
| **Hugging Face Pro** | ₹0.50/image | ₹2/video | Unlimited, faster inference |
| **Self-Hosted** | ₹0.10/image | ₹0.50/video | Fixed ₹800/month server cost |

### Pricing Strategy (Using Hugging Face Free for Demo)

**Flash Lite Plan (₹50/hour, 3 images):**
- Cost: 3 × ₹0 = ₹0 (FREE)
- Margin: ₹50 (100%)

**Flash Plan (₹100/hour, 8 images):**
- Cost: 8 × ₹0 = ₹0 (FREE)
- Margin: ₹100 (100%)

**Pro Plan (₹200/hour, 15 images):**
- Cost: 15 × ₹0 = ₹0 (FREE)
- Margin: ₹200 (100%)

**For Production (Self-Hosted):**
- Server Cost: ₹800/month
- Break-even: ~16 hours of Pro plan sales/month
- Healthy margins after minimal usage

### Realistic Pricing Breakdown

With Indian market in mind:
- ₹50/hour = Affordable entry point (cost of a coffee)
- ₹100/hour = Standard tier (cost of a meal)
- ₹200/hour = Premium tier (cost of a movie ticket)

This pricing is competitive with:
- ChatGPT Plus: ₹1,650/month (~₹55/day unlimited)
- Midjourney: ₹2,500/month (~₹83/day unlimited)
- Our model: Pay only for what you use!

---

## Future Enhancements

1. **Batch Generation**: Generate multiple variations at once
2. **Style Presets**: Pre-defined artistic styles
3. **Image Editing**: Modify generated images
4. **Video Length Options**: 5s, 10s, 15s with different credit costs
5. **Generation History**: Browse and reuse past generations
6. **Favorites**: Save favorite generations
7. **Sharing**: Share generated content publicly
8. **Templates**: Pre-made prompts for common use cases

---

## Summary

This implementation:
- ✅ Integrates with existing pay-per-hour model
- ✅ Enforces usage limits per session
- ✅ Tracks all generations in database
- ✅ Provides clear UI for credits remaining
- ✅ Stores generated content securely
- ✅ Maintains healthy profit margins
- ✅ Scales with user growth

Next steps: Run migration, deploy edge functions, implement frontend components.
