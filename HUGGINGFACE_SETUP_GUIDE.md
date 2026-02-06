# Hugging Face API Setup Guide
## For Stable Diffusion v1.5 Image Generation

---

## Step 1: Create Hugging Face Account

1. Go to [huggingface.co](https://huggingface.co/join)
2. Sign up with email (FREE, no credit card required)
3. Verify your email

---

## Step 2: Get API Token

1. Go to [Settings → Access Tokens](https://huggingface.co/settings/tokens)
2. Click "New token"
3. Name it: `ai-access-hub-demo`
4. Role: Select "Read"
5. Click "Generate token"
6. **Copy the token** (starts with `hf_...`)

---

## Step 3: Add Token to Supabase

### Option A: Via Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **Edge Functions** → **Manage secrets**
3. Add new secret:
   - Name: `HUGGINGFACE_API_KEY`
   - Value: `hf_your_token_here`
4. Save

### Option B: Via Supabase CLI

```bash
supabase secrets set HUGGINGFACE_API_KEY=hf_your_token_here
```

---

## Step 4: Test the API

Test in your browser or Postman:

```bash
curl https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5 \
  -X POST \
  -H "Authorization: Bearer hf_your_token_here" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "a beautiful sunset over mountains"}'
```

You should get back binary image data.

---

## API Limits (Free Tier)

| Limit | Value |
|-------|-------|
| Requests/hour | 30 |
| Requests/day | 1,000 |
| Rate limit | 1 req/2 seconds |
| Image size | 512x512 (default) |
| Generation time | 3-5 seconds |

**Perfect for demo/testing!**

---

## Upgrade Options (Optional)

### Hugging Face Pro ($9/month)

- ✅ Unlimited requests
- ✅ Faster inference
- ✅ Priority support
- ✅ Access to all models

### Self-Hosted (For Production)

If you need more control:

1. **DigitalOcean GPU Droplet** (~₹800/month)
   - 1x NVIDIA GPU
   - Unlimited generations
   - Full control

2. **AWS EC2 g4dn.xlarge** (~₹1,200/month)
   - More powerful
   - Auto-scaling
   - Better for production

---

## Supported Models on Hugging Face

### Image Generation (FREE)

| Model | Resolution | Speed | Quality |
|-------|-----------|-------|---------|
| **stable-diffusion-v1-5** | 512x512 | Fast | Good |
| stable-diffusion-2-1 | 768x768 | Medium | Better |
| stable-diffusion-xl | 1024x1024 | Slow | Best |

### Video Generation (FREE)

| Model | Duration | Resolution | Speed |
|-------|----------|------------|-------|
| **stable-video-diffusion** | 2-5s | 480p | Slow |

---

## Example Code

### Generate Image

```typescript
const response = await fetch(
  'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: "a beautiful sunset over mountains",
      parameters: {
        num_inference_steps: 30,
        guidance_scale: 7.5,
        width: 512,
        height: 512,
      },
    }),
  }
);

const imageBlob = await response.blob();
```

### Handle Rate Limits

```typescript
if (response.status === 429) {
  // Rate limit exceeded
  const retryAfter = response.headers.get('Retry-After');
  console.log(`Rate limited. Retry after ${retryAfter} seconds`);
}
```

---

## Troubleshooting

### Error: "Model is loading"

**Solution:** Wait 20-30 seconds and retry. Models "cold start" on first use.

```typescript
if (response.status === 503) {
  const data = await response.json();
  if (data.error?.includes('loading')) {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 20000));
    // Retry request
  }
}
```

### Error: "Rate limit exceeded"

**Solution:** 
- Wait 2 seconds between requests
- Upgrade to Pro tier
- Use self-hosted solution

### Error: "Invalid token"

**Solution:**
- Check token starts with `hf_`
- Regenerate token in Hugging Face settings
- Update Supabase secret

---

## Best Practices

1. **Cache generated images** - Don't regenerate same prompt
2. **Add loading states** - Generation takes 3-5 seconds
3. **Handle errors gracefully** - Show user-friendly messages
4. **Implement retry logic** - For model loading errors
5. **Monitor usage** - Track API calls to avoid limits

---

## Cost Comparison

| Solution | Setup Cost | Monthly Cost | Generations/Month |
|----------|-----------|--------------|-------------------|
| **HF Free** | ₹0 | ₹0 | ~720 (30/hour × 24h) |
| HF Pro | ₹0 | ₹750 | Unlimited |
| Self-Hosted | ₹5,000 | ₹800 | Unlimited |

**Recommendation:** Start with HF Free for demo, upgrade to Pro when you have paying users.

---

## Next Steps

1. ✅ Get Hugging Face API token
2. ✅ Add to Supabase secrets
3. ✅ Deploy edge function
4. ✅ Test image generation
5. ✅ Monitor usage
6. 📈 Upgrade when needed

---

**Questions?** Check [Hugging Face Docs](https://huggingface.co/docs/api-inference/index)
