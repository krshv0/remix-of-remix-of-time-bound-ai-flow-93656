# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

AI Access Hub is a React-based web application that provides paid access to AI models (Gemini 2.5 family) through time-bound sessions. Users can purchase hourly access to different AI models and interact with them through a chat interface.

**Technology Stack:**
- Vite + React 18 + TypeScript
- Supabase (authentication, database, edge functions)
- shadcn/ui + Tailwind CSS
- React Router for routing
- TanStack Query for data fetching
- Lucide React for icons

## Development Commands

### Essential Commands
```bash
# Development server (runs on localhost:8080)
npm run dev

# Build for production
npm run build

# Build for development mode (with component tagger)
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Package Management
The project uses both `npm` and has a `bun.lockb` file. Use `npm` for consistency as specified in the README.

### Environment Setup
```bash
# Install dependencies
npm i

# Start development server
npm run dev
```

## Architecture Overview

### Core Application Structure

**Routing Architecture:**
- Single-page application using React Router
- Main routes: `/` (Index), `/auth`, `/home`, `/dashboard`, `/chat-history`
- Authentication flow: unauthenticated users → `/auth` → `/home` → `/dashboard`

**Authentication & User Management:**
- Supabase Auth for user authentication
- Persistent sessions with automatic refresh
- Auth state management in individual pages (no global auth context)

**Database Schema (Supabase):**
- `user_sessions`: Tracks purchased AI access sessions with expiration times
- `conversations`: Chat conversation metadata  
- `chat_messages`: Individual messages within conversations
- `session_config`: Configuration for token limits per plan/model

### Key Components Architecture

**Session Management:**
- `PlanSelector`: Handles plan selection and payment simulation
- `SessionTimer`: Real-time countdown with expiration handling and token usage tracking
- Multiple active sessions supported per user

**Chat System:**
- `ChatInterface`: Main chat UI with message history and file attachments
- `FileAttachment`: Handles file uploads for AI context
- Conversations auto-created on first message
- Messages persisted to Supabase tables

**UI Components:**
- Built on shadcn/ui component system
- Custom animations via Tailwind CSS keyframes
- Responsive design with mobile-first approach

### Data Flow Patterns

**Session Lifecycle:**
1. User selects plan in `PlanSelector`
2. Payment simulation → session created in database
3. `SessionTimer` tracks remaining time
4. `ChatInterface` provides AI interaction
5. Session expires → status updated to 'expired'

**Chat Flow:**
1. User input → `ChatInterface`
2. Message saved to database
3. Supabase Edge Function processes AI request
4. AI response saved and displayed
5. Token usage updated

### Key Technical Patterns

**TypeScript Configuration:**
- Lenient TypeScript settings (`strict: false`, `noImplicitAny: false`)
- Path aliases: `@/*` maps to `./src/*`
- Project references for app and build tool separation

**Styling System:**
- Tailwind CSS with extensive custom keyframes and animations
- CSS variables for theming via shadcn/ui
- Custom shadow and animation utilities

**Error Handling:**
- Toast notifications via `useToast` hook (shadcn/ui)
- Try-catch blocks around Supabase operations
- User-friendly error messages

## Development Guidelines

### File Organization
- Pages in `src/pages/`
- Reusable components in `src/components/`
- UI primitives in `src/components/ui/`
- Supabase integration in `src/integrations/supabase/`
- Utilities in `src/lib/`
- Custom hooks in `src/hooks/`

### Component Patterns
- Functional components with hooks
- Props interfaces defined inline or separately
- `useEffect` for data fetching and cleanup
- Loading states and error handling in UI components

### Supabase Integration
- Client initialized in `src/integrations/supabase/client.ts`
- Type-safe database operations using generated types
- Edge functions for AI model interactions
- Real-time subscriptions for auth state changes

### State Management
- Local state with `useState` for component-specific data
- No global state management library (Redux, Zustand, etc.)
- TanStack Query for server state (minimal usage observed)
- Auth state managed per-page basis

### Testing
- No test files detected in current codebase
- ESLint configuration with React-specific rules
- Unused variable warnings disabled

## Important Notes for Development

- Development server runs on port 8080 (configured in vite.config.ts)
- Environment variables prefixed with `VITE_` for client-side access
- Supabase client configured for localStorage persistence
- Component tagger from lovable-tagger enabled in development mode
- File uploads processed as base64 strings for AI context

## Dependencies of Note

**Core Dependencies:**
- `@supabase/supabase-js`: Database and auth
- `@tanstack/react-query`: Server state management
- `react-router-dom`: Client-side routing
- `react-hook-form` + `@hookform/resolvers`: Form handling
- `zod`: Runtime validation

**UI & Styling:**
- All `@radix-ui/react-*` packages: Accessible UI primitives
- `tailwindcss` + `tailwindcss-animate`: Styling and animations
- `lucide-react`: Icon system
- `date-fns`: Date formatting
- `sonner`: Toast notifications

**Development:**
- `typescript-eslint`: TypeScript linting
- `lovable-tagger`: Development component tagging
- `@vitejs/plugin-react-swc`: Fast React refresh