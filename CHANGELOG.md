# Changelog: Supabase Migration & Image Generation Setup

## Context
This project was migrated from a Lovable-managed Supabase project to a new self-hosted Supabase project (`zaxowtufvxvijyejggsl`). The following changes were made to fix authentication, migrations, and image generation functionality.

---

## Changes Made

### 1. Supabase Project Migration
- **Linked project** to new Supabase instance: `zaxowtufvxvijyejggsl`
- **Updated `supabase/config.toml`** with new project ID
- **Updated `.env`** with new Supabase URL and keys:
  - `VITE_SUPABASE_URL=https://zaxowtufvxvijyejggsl.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` (new anon key)
  - `VITE_SUPABASE_PROJECT_ID=zaxowtufvxvijyejggsl`

### 2. Migration Files Fixed
- **Renamed** `20260204_add_generation_features.sql` → `20260204000000_add_generation_features.sql` (proper timestamp format required by Supabase CLI)
- **Renamed** `20260206_stable_diffusion_sessions.sql` → `20260206000000_stable_diffusion_sessions.sql` (proper timestamp format)
- **All 7 original migrations** were marked as applied on the remote database since tables already existed
- All migrations are now synced between local and remote

### 3. Email Verification Disabled
The new Supabase project was enforcing email confirmation on signup, blocking users from signing in.

**New migration: `20260213062357_disable_email_verification.sql`**
- Confirms all existing users' emails by setting `email_confirmed_at`

**New migration: `20260213070000_auto_confirm_emails.sql`**
- Creates a database trigger `auto_confirm_email_trigger` on `auth.users`
- Automatically sets `email_confirmed_at = NOW()` for every new user on signup
- This permanently bypasses email verification regardless of Supabase dashboard settings

### 4. Edge Function Fix: `sd-generate`
**File: `supabase/functions/sd-generate/index.ts`**

Fixed authentication header handling that was causing 401 errors. The function was not properly extracting the JWT token from the Authorization header.

**Before (broken):**
```typescript
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
);
```

**After (fixed):**
```typescript
const authHeader = req.headers.get("authorization");
const token = authHeader?.replace("Bearer ", "");

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { global: { headers: { Authorization: `Bearer ${token}` } } }
);
```

This matches the pattern used by the working `chat` Edge Function. The fix:
- Uses lowercase `"authorization"` for header lookup (case-safe)
- Safely extracts the token with optional chaining (`?.`)
- Rebuilds the header as `Bearer ${token}` (consistent format)
- Added error logging for debugging

**The `sd-generate` function has been redeployed** to the remote Supabase project.

### 5. Supabase Secrets Configured
The following secrets are set on the remote Supabase project:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `HUGGINGFACE_API_KEY` (for Stable Diffusion image generation via Hugging Face Inference API)

### 6. New Files Added
- `src/pages/ImageGen.tsx` - Image generation session page
- `src/components/image-gen/` - Image generation UI components (ImageGenInput, GenerationBlockCard, ImageFullscreenModal, ImageGenNavigation, ImageGenWelcome, types)
- `supabase/functions/sd-generate/index.ts` - Edge Function for Stable Diffusion image generation
- `src/App.tsx` - Added `/image-gen` route
- `src/components/PlanSelector.tsx` - Added Stable Diffusion plan options
- `src/pages/Dashboard.tsx` - Added image generation session management

### 7. Deleted Files
Old documentation files that are no longer needed:
- `HUGGINGFACE_SETUP_GUIDE.md`
- `IMAGE_VIDEO_GENERATION_SPEC.md`
- `IMAGE_VIDEO_SUMMARY.md`
- `IMPLEMENTATION_CHECKLIST.md`
- `IMPLEMENTATION_COMPLETE.md`
- `IMPLEMENTATION_GUIDE.md`

---

## Known Issues / Remaining Work

### Image Generation 401 Error (Partially Resolved)
- The Edge Function auth handling has been fixed and redeployed
- Users must be signed in with a valid session before accessing image generation
- If 401 persists, check:
  1. User is signed in (check localStorage for `sb-zaxowtufvxvijyejggsl-auth-token`)
  2. The Edge Function is receiving the Authorization header (check Edge Function logs in Supabase Dashboard)
  3. Supabase Dashboard auth settings: Email provider must be enabled, "Confirm email" should be OFF

### Dashboard Auth Settings Required
In the Supabase Dashboard (https://supabase.com/dashboard/project/zaxowtufvxvijyejggsl):
1. **Authentication → Providers → Email**: Must be enabled with "Confirm email" OFF
2. **Authentication → URL Configuration**: Site URL should be set to the production URL
3. **Authentication → URL Configuration → Redirect URLs**: Add `http://localhost:8080/home` for local dev

### Database Trigger for Auto-Confirm
A trigger `auto_confirm_email_trigger` exists on `auth.users` that auto-confirms emails. If Lovable recreates or modifies auth tables, this trigger may need to be reapplied.

---

## Architecture Overview

### Auth Flow
1. User signs up/in via `src/pages/Auth.tsx` using `supabase.auth.signUp()` / `signInWithPassword()`
2. Email is auto-confirmed by database trigger (no verification email sent)
3. Session token stored in localStorage
4. Protected pages check auth state via `supabase.auth.getSession()`

### Image Generation Flow
1. User purchases an image generation session on Dashboard (`session_type: 'image_generation'`)
2. Navigates to `/image-gen` which loads the active session
3. `ImageGenInterface` calls `supabase.functions.invoke('sd-generate', ...)` with generation params
4. Edge Function authenticates user, validates session/credits, calls Hugging Face API
5. Generated image is uploaded to Supabase Storage bucket `sd-generated-images`
6. Generation record saved to `image_generations` table
7. Session credits updated in `user_sessions` table

### Database Tables
- `user_sessions` - Tracks all user sessions (chat + image generation)
- `session_config` - Plan limits and model configurations
- `image_generations` - Individual image generation records
- `image_sessions` - Grouped image generation conversations

### Edge Functions
- `chat` - Chat/AI model interaction (working)
- `sd-generate` - Stable Diffusion image generation (fixed, redeployed)
- `generate-image` - Legacy image generation function
