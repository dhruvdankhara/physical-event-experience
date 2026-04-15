# Stadium Sync

## Physical Event Experience Platform

### Project Definition & Architecture Document

**Stack:** Next.js, Tailwind CSS, shadcn/ui, MongoDB, Mapbox GL JS, TanStack Query, Redux Toolkit, JWT, Google Cloud Run (Docker)

## 1. Executive Summary & Problem Statement

The modern physical event experience at large-scale sporting venues is often plagued by crowd congestion, unpredictable wait times for amenities, and navigational difficulties. Attendees frequently miss crucial moments of the event while trapped in concession lines or attempting to locate their assigned seating zones.

**Objective:** Design and develop a highly scalable, real-time web application to serve as a digital companion for venue attendees. The platform will provide dynamic indoor routing, live wait-time tracking, and contextual alerts to optimize crowd flow and enhance the overall fan experience.

## 2. Technology Stack & Architecture

To support high-concurrency environments (50,000+ simultaneous users within a localized cell grid), the application utilizes a decoupled, edge-optimized architecture deployed on highly available infrastructure.

| Layer                | Technology                     | Justification for This Project                                                                                                                                                       |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend Framework   | Next.js (App Router)           | Leverages Server Components for static venue data and Client Components for interactive maps. Highly optimized for mobile browsers.                                                  |
| UI Component Library | Tailwind CSS + shadcn/ui       | Ensures rapid development of accessible, mobile-first interfaces critical for usage on handheld devices in bright stadium lighting.                                                  |
| Database             | MongoDB Atlas                  | GeoJSON-native support for spatial querying ($near) and Change Streams for real-time wait-time updates.                                                                              |
| State Management     | Redux Toolkit + TanStack Query | Redux isolates complex client state (UI toggles, selected routes), while TanStack Query manages server data fetching, caching, and background syncing.                               |
| Mapping & Routing    | Mapbox GL JS                   | Provides vector-based, highly customizable indoor stadium maps. Substantially superior to Google Maps for multi-level architectural blueprints.                                      |
| Authentication       | JWT (JSON Web Tokens)          | Stateless authentication mechanism, minimizing database lookups for protected API routes and allowing scalable API access.                                                           |
| Deployment / Hosting | Google Cloud Run (Docker)      | Containerized deployment ensuring horizontal scalability. Crucial for maintaining persistent WebSocket connections for live data streams, bypassing standard serverless limitations. |

## 3. Core Features (MVP Scope)

The Minimum Viable Product focuses on delivering immediate utility to attendees, addressing the most pressing friction points.

### 3.1 Interactive Venue Map

- **Mapbox integration:** Rendering of a custom 2.5D venue map using specialized vector tiles.
- **GeoJSON data layer:** Points of Interest (POIs) such as concessions, restrooms, exits, and first aid are dynamically loaded over the map layer.
- **User positioning:** Geolocation API integration to estimate user proximity to nearby amenities.

### 3.2 Real-Time Wait-Time Tracking

- **Live updates:** Users can tap on a restroom or concession stand to view its current estimated wait time.
- **MongoDB Change Streams:** Backend architecture listens to wait-time modifications in the database and pushes updates to the client to avoid aggressive client-side polling.

### 3.3 Digital Ticketing & Contextual Routing

- **Seat finder:** Upon logging in and linking a ticket, the app highlights the optimal entrance gate and turn-by-turn route to the designated section.

### 3.4 Stadium-Wide Push Alerts

- **Admin broadcasts:** Staff can issue global alerts (e.g., "Weather delay: Please seek shelter", "Post-game traffic: Use North exits") seamlessly rendered in the frontend via toast notifications or persistent banners.

## 4. Database Schema (Mongoose / MongoDB)

The data layer is optimized for geographic querying and real-time observability.

### 4.1 User Model (`models/User.ts`)

```ts
import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["ATTENDEE", "STAFF"], default: "ATTENDEE" },
    savedPOIs: [{ type: Schema.Types.ObjectId, ref: "POI" }],
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
```

### 4.2 Point of Interest Model (`models/POI.ts`)

```ts
import mongoose, { Schema } from "mongoose";

const POISchema = new Schema({
  venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["RESTROOM", "CONCESSION", "EXIT"] },
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  currentWaitTime: { type: Number, default: 0 },
  status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
});

// 2dsphere index required for $near geospatial queries
POISchema.index({ location: "2dsphere" });

export default mongoose.models.POI || mongoose.model("POI", POISchema);
```

## 5. Project Folder Structure

The codebase relies on a feature-driven architecture within the Next.js App Router paradigm, ensuring logical separation of concerns as the application scales.

```text
stadium-app/
├── src/
│   ├── app/                         # Next.js App Router (pages & API)
│   │   ├── (auth)/                  # Auth routes (/login, /register)
│   │   ├── api/                     # Backend API routes (Next.js Edge/Node)
│   │   │   ├── auth/                # JWT generation and verification
│   │   │   └── poi/                 # POI geospatial queries and data
│   │   ├── dashboard/               # Main application interface
│   │   ├── layout.tsx               # Root layout with Redux and TanStack providers
│   │   └── page.tsx                 # Landing/marketing page
│   ├── components/                  # Reusable UI components
│   │   ├── ui/                      # shadcn primitives (buttons, cards)
│   │   └── layouts/                 # Mobile navbars, slide-out panels
│   ├── features/                    # Domain-specific business logic
│   │   ├── map/                     # Mapbox GL initialization and markers
│   │   ├── queues/                  # Wait-time progress bars and logic
│   │   └── alerts/                  # Push notification system
│   ├── hooks/                       # Global custom hooks (e.g., useGeolocation)
│   ├── lib/                         # Configuration and utilities
│   │   ├── db.ts                    # MongoDB Mongoose connection handler
│   │   ├── jwt.ts                   # Authentication helpers
│   │   └── utils.ts                 # Tailwind merge and clsx utilities
│   ├── models/                      # Mongoose schemas (User, POI, Alert)
│   ├── store/                       # Global state management
│   │   └── slices/                  # Redux slices (UI state, map filters)
│   └── types/                       # Global TypeScript definitions
├── Dockerfile                       # Container configuration for Google Cloud Run
├── next.config.js
└── tailwind.config.js
```

## 6. Execution Plan & Next Steps

To ensure a structured and risk-mitigated development cycle, the project will be executed in the following phases:

1. **Phase 1: Environment & Infrastructure Setup (Days 1-2)**
   Initialize the Next.js environment, install shadcn/Tailwind, provision the MongoDB Atlas cluster, and set up the Redux/TanStack Query boilerplate.
2. **Phase 2: Database & API Development (Days 3-5)**
   Develop Mongoose schemas, seed the database with mock GeoJSON data (dummy stadium coordinates), and build REST APIs for JWT authentication and POI retrieval.
3. **Phase 3: Mapbox Integration (Days 6-8)**
   Integrate Mapbox GL JS on the frontend. Consume the POI API via TanStack Query and render interactive markers on a custom stadium blueprint.
4. **Phase 4: Real-Time Features & UI Polish (Days 9-12)**
   Implement MongoDB Change Streams or WebSockets for live queue updates. Design the mobile-first shadcn UI overlays (bottom sheets, wait-time cards).
5. **Phase 5: Containerization & Deployment (Days 13-14)**
   Finalize the Dockerfile, test the build locally, and deploy to Google Cloud Run. Configure domain routing and edge caching.
