# Stadium Sync

Production-ready physical event experience platform for high-capacity venues.

Stadium Sync combines live venue mapping, queue telemetry, operational alerting, and Google Cloud intelligence into one mobile-first system for attendees and event operations teams.

## What Is The Problem?

Large physical events have recurring operational pain points:

1. Attendees lose time in unpredictable restroom and concession queues.
2. Crowd pressure shifts quickly and creates local congestion hotspots.
3. Static signage and manual coordination are too slow during live incidents.
4. Venue teams need one trusted control surface for rapid decisions.

## What Problem Does This Solve?

Stadium Sync solves the fan-flow and operations visibility gap by giving both attendees and staff a shared real-time operational picture.

Results:

- Faster fan movement to seats and services.
- Better queue distribution across sections and blocks.
- Faster alert and announcement response during incidents.
- Better decision support using Google Cloud AI insights.

## How We Solve The Problem

The solution combines six coordinated layers:

1. Real-time venue map intelligence using Google Maps for in-stadium context.
2. Live queue updates over SSE for continuous wait-time visibility.
3. Operations console for seeding, rush simulation, and intervention workflows.
4. Staff/admin alert broadcasting for immediate communication.
5. Google Cloud Text-to-Speech for generated announcement audio.
6. Vertex AI wait-time analysis to identify hotspots and suggest actions.

## Key Features

### Attendee Experience

- Interactive live venue map with POI overlays.
- Queue pressure visibility for concessions, restrooms, exits, and first-aid points.
- Alert feed for operational and safety messaging.
- Mobile-first UX with PWA support.

### Staff And Admin Experience

- Protected operations console at `/admin`.
- POI seeding and rush-event simulation tools.
- Stadium-wide alert publishing with severity controls.
- Google Cloud TTS announcement generation.
- Vertex AI queue insights with fallback logic.

## Security Focus

Security is a primary design focus in this codebase with strong baseline controls:

- Stateless JWT session architecture with signed tokens.
- HttpOnly auth cookies, SameSite policy, and secure cookies in production.
- Google OAuth 2.0 login flow via Passport (`passport-google-oauth20`).
- Role-based access control (`ATTENDEE`, `STAFF`, `ADMIN`) across APIs and protected pages.
- Password hashing with bcrypt (cost factor 12).
- Zod schema validation for authentication and admin payloads.
- Protected admin operations (`/api/analytics/overview`, `/api/seed`, `/api/trigger-rush`, `/api/tts`, `/api/vertex/wait-times`, alert writes).
- Explicit environment validation for critical secrets and cloud configuration.

This gives the platform very strong practical security for real-world venue workflows.

## Google Services Used

Stadium Sync is tightly integrated with Google technologies:

- Google Maps JavaScript API: live venue visualization and map interactions.
- Google Analytics Data API (GA4): secure server-side reporting endpoint for operations insights.
- Google Cloud Text-to-Speech API: generated operational announcement audio.
- Google Vertex AI: wait-time analysis, hotspot detection, and intervention recommendations.
- google-auth-library: secure server-side token access to Google Cloud APIs.
- Google Cloud Run: production deployment platform for scalable container-based runtime.

## Technology Stack

| Layer                   | Technology                                                         |
| ----------------------- | ------------------------------------------------------------------ |
| Frontend                | Next.js 16 (App Router), React 19, TypeScript                      |
| UI System               | Tailwind CSS v4, shadcn/ui, Radix primitives                       |
| Data Layer              | Google Cloud Firestore                                             |
| State and Data Fetching | Redux Toolkit + TanStack Query                                     |
| Real-Time Transport     | Server-Sent Events (`/api/stream`)                                 |
| Authentication          | JWT (`jose`) + Passport Google OAuth 2.0 + HttpOnly cookie session |
| Validation              | Zod                                                                |
| PWA                     | next-pwa + manifest + service worker                               |
| Google Cloud            | Maps JS API, Cloud TTS, Vertex AI, Cloud Run                       |

## Production Deployment On Google Cloud Run

This project is deployed in production on Google Cloud Run.

Why Cloud Run is a strong fit here:

- Auto-scaling for bursty event-day traffic.
- Containerized runtime for consistent deployments.
- Tight integration with Google Cloud credentials and service APIs.
- Suitable platform model for real-time operational workloads.

## Production-Ready Project Structure And Code

This repository is organized for maintainability, scale, and safe iteration.

```text
src/
	app/
		(auth)/
		admin/
		alerts/
		dashboard/
		profile/
		queues/
		api/
			analytics/
			alerts/
			auth/
			poi/
			pois/
			seed/
			stream/
			trigger-rush/
			tts/
			vertex/
	components/
		layouts/
		ui/
	features/
		admin/
		alerts/
		map/
		queues/
	hooks/
	lib/
		google/
	store/
```

Production-ready characteristics in this codebase:

- Feature-oriented module boundaries for predictable scaling.
- Shared layout and UI primitives for consistency and velocity.
- Typed Firestore repository layer for `User`, `POI`, and `Alert` domains.
- Separated API route domains for auth, operations, data, and streaming.
- Global providers for Redux and TanStack Query.
- App-level error and not-found handling.
- PWA capability for installable mobile usage.

## Application Routes

- `/`: product landing page.
- `/dashboard`: live map and operational overlays.
- `/queues`: queue analytics and pressure dashboard.
- `/alerts`: alert feed.
- `/profile`: authenticated user profile.
- `/login`, `/register`, `/forgot-password`: authentication flows.
- `/admin`: staff/admin console (protected).

## API Snapshot

| Endpoint                    | Method | Purpose                                  | Access        |
| --------------------------- | ------ | ---------------------------------------- | ------------- |
| `/api/auth/register`        | POST   | Register user and create session         | Public        |
| `/api/auth/login`           | POST   | Login and create session                 | Public        |
| `/api/auth/google`          | GET    | Start Google OAuth flow                  | Public        |
| `/api/auth/google/callback` | GET    | Complete Google OAuth and create session | Public        |
| `/api/auth/logout`          | POST   | Clear auth cookie                        | Authenticated |
| `/api/auth/session`         | GET    | Resolve current session                  | Public        |
| `/api/analytics/overview`   | GET    | Read GA4 overview metrics                | Staff/Admin   |
| `/api/pois`                 | GET    | List POIs and wait-time data             | Public        |
| `/api/poi/:id`              | GET    | Get one POI                              | Public        |
| `/api/stream`               | GET    | Real-time wait-time patch stream (SSE)   | Public        |
| `/api/seed`                 | GET    | Seed stadium POIs                        | Staff/Admin   |
| `/api/trigger-rush`         | GET    | Trigger queue pressure simulation        | Staff/Admin   |
| `/api/alerts`               | GET    | Read alerts                              | Public        |
| `/api/alerts`               | POST   | Create alert                             | Staff/Admin   |
| `/api/alerts/:id`           | GET    | Read one alert                           | Public        |
| `/api/alerts/:id`           | PATCH  | Update alert                             | Staff/Admin   |
| `/api/alerts/:id`           | DELETE | Delete alert                             | Staff/Admin   |
| `/api/tts`                  | POST   | Generate TTS audio                       | Staff/Admin   |
| `/api/vertex/wait-times`    | POST   | Generate queue insights                  | Staff/Admin   |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Google Cloud project with Firestore enabled

### Install

```bash
npm install
```

### Configure Environment

Mac/Linux:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

### Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

| Variable                          | Required | Purpose                                                                |
| --------------------------------- | -------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes      | Client map rendering                                                   |
| `AUTH_JWT_SECRET`                 | Yes      | JWT signing secret                                                     |
| `AUTH_COOKIE_NAME`                | Optional | Session cookie override                                                |
| `GOOGLE_OAUTH_CLIENT_ID`          | Yes      | Google OAuth client ID                                                 |
| `GOOGLE_OAUTH_CLIENT_SECRET`      | Yes      | Google OAuth client secret                                             |
| `GOOGLE_OAUTH_CALLBACK_URL`       | Yes      | OAuth callback URL registered in Google                                |
| `GOOGLE_ANALYTICS_PROPERTY_ID`    | Yes      | GA4 property ID used by analytics overview API                         |
| `GOOGLE_CLOUD_PROJECT_ID`         | Yes      | Firestore and Google API project context                               |
| `FIRESTORE_PROJECT_ID`            | Optional | Override Firestore project (if different from GOOGLE_CLOUD_PROJECT_ID) |
| `FIRESTORE_DATABASE_ID`           | Optional | Firestore database ID (`(default)` unless using a named database)      |
| `GOOGLE_CLOUD_LOCATION`           | Yes      | Cloud region for AI services                                           |
| `GOOGLE_VERTEX_MODEL`             | Yes      | Vertex model selection                                                 |
| `GOOGLE_TTS_LANGUAGE_CODE`        | Yes      | Default TTS language                                                   |
| `GOOGLE_TTS_VOICE_NAME`           | Yes      | Default TTS voice                                                      |
| `GOOGLE_APPLICATION_CREDENTIALS`  | Optional | Local credential file path                                             |

## Available Scripts

- `npm run dev`: start local development (`next dev --webpack`).
- `npm run lint`: run ESLint.
- `npm run build`: build production app (`next build --webpack`).
- `npm run start`: run production server.
- `npm run test` / `npm run test:e2e`: run Playwright end-to-end tests.
- `npm run test:e2e:headed`: run e2e tests in headed mode.
- `npm run test:e2e:ui`: open the Playwright UI runner.
- `npm run test:e2e:debug`: run tests in debug mode.
- `npm run test:e2e:report`: open the generated Playwright HTML report.

## End-to-End Testing (Playwright)

This repository includes a production-ready Playwright suite under `tests/e2e`.

Coverage includes:

- Auth flows (`/login`, `/register`, logout behavior).
- Route entry points and landing-page CTAs.
- Dashboard overlay controls with deterministic realtime/network mocks.
- Queue analytics rendering and fallback handling.
- Alert feed filtering and error states.
- Profile rendering with and without a valid session.
- Admin RBAC and operations console workflows.

Testing approach:

- Hybrid mocking strategy for unstable dependencies (`/api/stream`, Google Maps network, TTS/Vertex endpoints) while keeping core page routing/session behavior realistic.
- Browser matrix: Chromium, Firefox, and WebKit.
- Automatic traces/screenshots/videos on failure or retry.

Run locally:

```bash
npm run test:e2e
```

The Playwright config starts the Next.js dev server automatically using `npm run dev`.

## Security Hardening Roadmap

Current controls are strong. Additional hardening for long-term scale:

1. Add API rate limiting on auth endpoints.
2. Add explicit CSRF token protection on state-changing requests.
3. Add audit logging for role changes and high-impact admin actions.
4. Add formal security monitoring and anomaly alerting.

## Summary

Stadium Sync is a production-grade platform that solves real crowd-flow and venue-operations problems with a secure architecture, strong Google Cloud integration, and a maintainable code structure built for continuous delivery.
