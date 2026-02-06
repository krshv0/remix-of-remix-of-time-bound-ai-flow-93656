# 🚀 Quick Start - Image Generation

Get image generation working in 5 minutes!

---

## Step 1: Database (2 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste this:

```sql
-- Add generation columns
ALTER TABLE session_config 
ADD COLUMN IF NOT EXISTS image_credits_per_hour INTEGER DEFAULT 0;

ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS images_generated INTEGER DEFAULT 0;

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

-- Update plans
UPDATE session_config SET image_credits_per_hour = 3 WHERE plan_id = 'flash-lite';
UPDATE session_config SET image_credits_per_hour = 8 WHERE plan_id = 'flash';
UPDATE session_config SET image_credits_per_hour = 15 WHERE plan_id = 'pro';

-- Enable RLS
ALTER TABLE image_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own images"
ON image_generations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images"
ON image_generations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT DO NOTHING;
```

3. Click "Run"

---

## Step 2: Hugging Face API (1 minute)

1. Go to [huggingface.co/join](https://huggingface.co/join)
2. Sign up (FREE)
3. Go to Settings → Access Tokens
4. Create token → Copy it (starts with `hf_...`)

---

## Step 3: Add API Key (1 minute)

**Option A: Supabase Dashboard**
1. Project Settings → Edge Functions
2. Click "Manage secrets"
3. Add: `HUGGINGFACE_API_KEY` = `hf_your_token`

**Option B: CLI**
```bash
supabase secrets set HUGGINGFACE_API_KEY=hf_your_token
```

---

## Step 4: Deploy Function (1 minute)

```bash
cd supabase/functions
supabase functions deploy generate-image
```

---

## Step 5: Test! (30 seconds)

1. Run: `npm run dev`
2. Log in
3. Buy a session
4. Go to chat
5. Click image icon 🖼️
6. Type: "a beautiful sunset"
7. Click Generate
8. Wait 3-5 seconds
9. 🎉 Image appears!

---

## ✅ Done!

You now have:
- ✅ FREE image generation (30/hour)
- ✅ Credit tracking
- ✅ Download functionality
- ✅ Storage in Supabase

---

## 🐛 Quick Fixes

**"Model is loading"**
→ Wait 20 seconds, try again

**"Rate limit"**
→ Free tier = 30/hour. Upgrade to Pro (₹750/month) for unlimited

**No image button**
→ Make sure you bought a session with image credits

**Image not appearing**
→ Check browser console for errors

---

## 📚 More Info

- **Full Guide**: IMPLEMENTATION_CHECKLIST.md
- **Technical Spec**: IMAGE_VIDEO_GENERATION_SPEC.md
- **API Setup**: HUGGINGFACE_SETUP_GUIDE.md
- **Overview**: IMAGE_VIDEO_SUMMARY.md

---

## 🎯 What's Next?

- Add video generation
- Create image gallery
- Add style presets
- Implement batch generation
- Add favorites feature

**Happy generating! 🎨**
