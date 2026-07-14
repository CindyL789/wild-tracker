# Contributing to Wild Tracker

Wild Tracker is a collaborative wildlife tracking dashboard built by CindyL789 and NyxSpecter4. It uses public Movebank GPS data and Google Gemini AI.

## Getting Started

```bash
git clone https://github.com/CindyL789/wild-tracker.git
cd wild-tracker
npm install
```

Create a `.env.local` file:
```
GEMINI_API_KEY=your_gemini_key_here
```

Run the dev server:
```bash
npm run dev
```

## Development Workflow

1. Create a branch from `main` (e.g. `feature/migration-analysis`)
2. Make your changes (additive preferred - don't rewrite existing files)
3. Ensure `npm run lint` passes (TypeScript strict mode)
4. Ensure `npm run build` succeeds
5. Open a PR with the template filled out
6. Tag a reviewer based on the CODEOWNERS file

## Code Conventions

- **TypeScript strict** - no `any` types without a comment explaining why
- **Additive changes** - create new files/components rather than rewriting existing ones
- **Server.ts is monolithic** - all API endpoints live in server.ts. Don't split it.
- **Leaflet via CDN** - don't install leaflet as an npm package
- **Fallback data** - every Movebank API call should have realistic fallback data
- **API keys server-side** - never expose GEMINI_API_KEY or SUPABASE_SERVICE_ROLE_KEY to the client

## Architecture

```
server.ts              Express server + API endpoints + Movebank integration
src/
  App.tsx              Main app (state, API orchestration, layout)
  types.ts             Shared TypeScript interfaces
  components/
    TrackingMap.tsx    Leaflet map with trail playback
    IntelligenceAssistant.tsx  Gemini AI chat
  lib/
    supabase.ts        Supabase client (optional persistence)
    geofence.ts        Geofencing utilities
    export.ts          Data export (GPX, KML, GeoJSON)
database/
  schema.sql           Supabase schema (saved studies, watchlists, alerts)
```

## Reviewers

See [CODEOWNERS](.github/CODEOWNERS) for who reviews what.

## Questions?

Open an issue or ask in the PR.
