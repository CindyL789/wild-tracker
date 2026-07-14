# Wild Tracker - Copilot Instructions

## Project Overview
Wild Tracker is an interactive global animal tracking dashboard using public Movebank datasets and Google Gemini AI. Users can browse curated wildlife studies, view tagged animals on a Leaflet map, replay GPS trails, and ask an AI assistant questions about animal behavior.

## Tech Stack
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend:** Express server (server.ts) - serves API routes and Vite dev server
- **AI:** Google Gemini (@google/genai) for the wildlife intelligence assistant
- **Maps:** Leaflet (loaded via CDN script in index.html, NOT an npm package)
- **Icons:** lucide-react
- **Animation:** motion (Framer Motion successor)
- **Data Source:** Movebank REST API (public animal GPS tracking data)
- **Persistence (optional):** Supabase for saved studies, watchlists, geofence alerts

## Architecture
- `src/App.tsx` - Main app component, state management, API orchestration
- `src/components/TrackingMap.tsx` - Leaflet map with trail visualization and playback animation
- `src/components/IntelligenceAssistant.tsx` - Gemini-powered chat UI for wildlife questions
- `src/types.ts` - Shared TypeScript interfaces
- `server.ts` - Express server with all API endpoints and Movebank integration
- `src/lib/` - Utility libraries (supabase client, geofencing, data export)

## API Endpoints
- `GET /api/studies` - List curated wildlife studies
- `GET /api/movebank/study/:studyId/individuals` - Get tagged animals in a study
- `GET /api/movebank/study/:studyId/events` - Get GPS tracking events
- `GET /api/movebank/study-metadata/:studyId` - Get study metadata from Movebank
- `POST /api/wildlife-ai` - Ask Gemini AI about wildlife (server-side, uses GEMINI_API_KEY)

## Rules
1. **Never delete existing files.** This is an AI Studio project - the deployment pipeline depends on the existing structure.
2. **Server.ts is the single backend.** Don't split it into multiple files. Add new endpoints inline.
3. **Leaflet is loaded via CDN** in index.html. Do NOT install leaflet as an npm package - it will conflict.
4. **All API keys stay server-side.** GEMINI_API_KEY is in .env.local, never exposed to the client. Supabase uses anon key (RLS-protected) client-side and service role key server-side only.
5. **Movebank data is public but rate-limited.** Always implement fallback data when the API is unreachable. The existing fallback pattern in server.ts is the reference.
6. **Additive only.** When adding features, create new files/components. Don't rewrite existing ones unless fixing a bug.
7. **TypeScript strict.** All new code must pass `tsc --noEmit` without errors.
8. **Tailwind v4 syntax.** Use `@tailwindcss/vite` plugin, not PostCSS config. Use utility classes, not custom CSS unless necessary.

## Code Style
- Use named exports for components
- Use TypeScript interfaces from src/types.ts, extend when needed
- Use lucide-react for all icons
- Use the `motion` package for animations (not framer-motion)
- API responses: always return JSON, always handle errors with try/catch
- Fallback data: every Movebank API call should have a fallback that returns realistic data

## Environment Variables
- `GEMINI_API_KEY` - Google Gemini API key (required for AI assistant)
- `APP_URL` - The URL where the app is hosted (injected by AI Studio)
- `SUPABASE_URL` - Supabase project URL (optional, for persistence features)
- `SUPABASE_ANON_KEY` - Supabase anon key (optional, client-side, RLS-protected)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (optional, server-side only)

## When Working in This Repo
- Check server.ts for existing API patterns before adding new endpoints
- Check src/types.ts before creating new interfaces
- Test with `npm run dev` (starts Express + Vite together)
- Lint with `npm run lint` (runs tsc --noEmit)
- Build with `npm run build` (Vite build + esbuild server bundle)
