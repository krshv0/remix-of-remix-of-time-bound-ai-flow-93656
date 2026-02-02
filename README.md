# AI Access Hub 

>  **Demo Project** - This is a demonstration/portfolio project. No actual payments are processed. Currently, Gemini 2.5 Flash is functional for testing purposes. More models and features are planned for future development.

A modern pay-per-hour AI chat platform that provides flexible, subscription-free access to premium AI models. Built as a full-stack application demonstrating real-time chat, session management, and multi-tier pricing architecture.

## Features

- **Multimodal Chat Interface** - Supports text, PDF, image, and DOCX file uploads
- **Session-Based Access** - Time-limited sessions (1-4 hours) with live countdown timers
- **Tiered Pricing Model** - Three plan levels: Flash Lite, Flash, and Pro (demo only)
- **Persistent Chat History** - Conversations saved per session with full message history
- **User Authentication** - Secure signup/login with session management

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI Components | shadcn/ui, Radix UI primitives |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| AI Integration | Lovable AI Gateway (Gemini 2.5 models) |
| State Management | TanStack Query, React Context |

## Current Status

| Model | Status |
|-------|--------|
| Gemini 2.5 Flash Lite | Planned |
| Gemini 2.5 Flash | ✅ Working |
| Gemini 2.5 Pro | Planned |

## Roadmap

- [ ] Additional AI models (GPT-5, Claude)
- [ ] Real payment integration (Stripe)
- [ ] Usage analytics dashboard
- [ ] Team/organization accounts
- [ ] API access for developers



**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

