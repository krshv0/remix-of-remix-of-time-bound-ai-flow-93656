# Image Generation Implementation Checklist

## ✅ Completed Steps

### 1. Database Setup
- [x] Created migration file: `supabase/migrations/20260204_add_generation_features.sql`
- [x] Added `image_credits_per_hour` and `video_credits_per_hour` to `session_config`
- [x] Added `images_generated` and `videos_generated` to `user_sessions`
- [x] Created `image_generations` table
- [x] Created `video_generations` table
- [x] Set up RLS policies
- [x] Updated plan credits (Flash Lite: 3, Flash: 8, Pro: 15)

### 2. Backend (Edge Function)
- [x] Created `supabase/functions/generate-image/index.ts`
- [x] Implemented Hugging Face Stable Diffusion v1.5 integration
- [x] Added credit limit checking
- [x] Added image upload to Supabase Storage
- [x] Added database tracking
- [x] Implemented error handling

### 3. Frontend Components
- [x] Created `src/components/chat/ImageGenerator.tsx`
- [x] Updated `src/pages/Chat.tsx` with generation stats
- [x] Updated `src/components/chat-ui/ModernChatInterface.tsx`
- [x] Added image generation button to chat input
- [x] Added credit display in stats sidebar

### 4. Build
- [x] Successfully compiled with no errors

---

## 🚀 Next Steps to Deploy

### Step 1: Run Database Migration

```bash
# Option A: Via Supabase Dashboard
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy contents of supabase/migrations/20260204_add_generation_features.sql
4. Run the SQL

# Option B: Via Supabase CLI
supabase db push
```

### Step 2: Create Storage Buckets

Run in Supabase SQL Editor:

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('generated-images', 'generated-images', true),
  ('generated-videos', 'generated-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Users can view their own images"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Step 3: Get Hugging Face API Key

1. Go to [huggingface.co/join](https://huggingface.co/join)
2. Sign up (FREE, no credit card)
3. Go to Settings → Access Tokens
4. Create new token with "Read" role
5. Copy the token (starts with `hf_...`)

### Step 4: Add API Key to Supabase

```bash
# Via Supabase CLI
supabase secrets set HUGGINGFACE_API_KEY=hf_your_token_here

# Or via Dashboard:
# Project Settings → Edge Functions → Manage secrets
# Add: HUGGINGFACE_API_KEY = hf_your_token_here
```

### Step 5: Deploy Edge Function

```bash
cd supabase/functions
supabase functions deploy generate-image
```

### Step 6: Test Image Generation

1. Start your dev server: `npm run dev`
2. Log in to your app
3. Purchase a session (any plan)
4. Go to chat page
5. Click the image icon button
6. Enter a prompt: "a beautiful sunset over mountains"
7. Click Generate
8. Wait 3-5 seconds
9. Image should appear!

---

## 🧪 Testing Checklist

- [ ] Database migration runs without errors
- [ ] Storage buckets created successfully
- [ ] Hugging Face API key added to Supabase
- [ ] Edge function deploys successfully
- [ ] Image generation button appears in chat
- [ ] Credits display correctly in sidebar
- [ ] Can generate image with valid prompt
- [ ] Image appears after generation
- [ ] Can download generated image
- [ ] Credits decrement after generation
- [ ] Error shown when credits exhausted
- [ ] Generated images saved to database
- [ ] Images stored in Supabase Storage
- [ ] Can view generation history

---

## 🐛 Troubleshooting

### Error: "Model is loading"
**Solution:** Wait 20-30 seconds and try again. First request "wakes up" the model.

### Error: "Rate limit exceeded"
**Solution:** 
- Free tier: 30 requests/hour
- Wait or upgrade to Hugging Face Pro (₹750/month)

### Error: "Invalid token"
**Solution:**
- Check token starts with `hf_`
- Regenerate in Hugging Face settings
- Update Supabase secret

### Error: "Storage bucket not found"
**Solution:**
- Run storage bucket creation SQL
- Check bucket name is 'generated-images'

### Images not appearing
**Solution:**
- Check browser console for errors
- Verify storage bucket is public
- Check RLS policies are correct

---

## 📊 Monitoring

### Track These Metrics

1. **Generation Success Rate**
   ```sql
   SELECT 
     COUNT(*) as total_generations,
     COUNT(DISTINCT user_id) as unique_users
   FROM image_generations
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Credits Usage**
   ```sql
   SELECT 
     plan_id,
     AVG(images_generated) as avg_images_per_session
   FROM user_sessions
   WHERE status = 'expired'
   GROUP BY plan_id;
   ```

3. **API Errors**
   - Check Supabase Edge Function logs
   - Monitor Hugging Face API status

---

## 💰 Cost Tracking

### Current Setup (Free Tier)
- Cost: ₹0
- Limit: 30 requests/hour
- Perfect for: Demo, testing, <50 users/day

### When to Upgrade

**Hugging Face Pro (₹750/month)**
- When: >50 active users/day
- Benefits: Unlimited requests, faster inference
- Break-even: ~8 Pro plan sales/month

**Self-Hosted (₹800-1,200/month)**
- When: >500 active users/day
- Benefits: Full control, no rate limits
- Break-even: ~10 Pro plan sales/month

---

## 🎯 Success Criteria

Your image generation feature is ready when:

- ✅ Users can generate images from chat
- ✅ Credits are tracked and enforced
- ✅ Images are stored and downloadable
- ✅ Stats display correctly
- ✅ Error handling works
- ✅ No console errors
- ✅ Build succeeds
- ✅ Performance is acceptable (3-5s generation)

---

## 📈 Next Features to Add

1. **Image Gallery** - View all generated images
2. **Regenerate** - Try same prompt again
3. **Variations** - Generate similar images
4. **Styles** - Preset artistic styles
5. **Higher Resolution** - 768x768 or 1024x1024
6. **Video Generation** - Add video support
7. **Batch Generation** - Multiple images at once
8. **Favorites** - Save favorite generations

---

## 🎉 You're Ready!

Follow the steps above and you'll have a working image generation feature in ~30 minutes!

**Questions?** Check:
- IMAGE_VIDEO_GENERATION_SPEC.md (technical details)
- HUGGINGFACE_SETUP_GUIDE.md (API setup)
- IMAGE_VIDEO_SUMMARY.md (overview)
