# Stadium Sync

Real-time physical event experience platform for large venues. The app combines live map navigation, queue telemetry, alert broadcasting, and Google Cloud powered operations workflows.

## Stack

- Next.js 16 App Router
- Tailwind CSS v4 + Shadcn UI
- MongoDB (Mongoose)
- Redux Toolkit + TanStack Query
- Google Maps JS API
- Google Cloud Text-to-Speech + Vertex AI integration endpoints

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment template and configure values:

```bash
cp .env.example .env.local
```

3. Required env vars:

- `MONGODB_URI`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `AUTH_JWT_SECRET`
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_VERTEX_MODEL`
- `GOOGLE_TTS_LANGUAGE_CODE`
- `GOOGLE_TTS_VOICE_NAME`
- Optional: `GOOGLE_APPLICATION_CREDENTIALS`

4. Run development server:

```bash
npm run dev
```

## Scripts

- `npm run dev` - Run development server (`next dev --webpack`)
- `npm run lint` - Run ESLint
- `npm run build` - Production build (`next build --webpack`)
- `npm run start` - Start production server

## Routes

- `/` - Landing page
- `/dashboard` - Live map + queue overlay
- `/queues` - Queue analytics and pressure view
- `/alerts` - Alert feed
- `/profile` - Session-backed user profile
- `/login`, `/register`, `/forgot-password` - Auth pages
- `/admin` - Staff/admin operations console (protected)

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/pois`
- `GET /api/poi/:id`
- `GET /api/stream` (SSE)
- `GET /api/seed` (staff/admin)
- `GET /api/trigger-rush` (staff/admin)
- `GET /api/alerts`, `POST /api/alerts`
- `GET/PATCH/DELETE /api/alerts/:id`
- `POST /api/tts` (staff/admin)
- `POST /api/vertex/wait-times` (staff/admin)
