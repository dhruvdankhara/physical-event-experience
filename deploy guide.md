Here's everything you need.

**Why standalone?** Next.js standalone mode bundles only the required files, making the Docker image significantly smaller — ideal for Cloud Run.Here's the complete setup — `Dockerfile`, `.dockerignore`, and a step-by-step deployment guide.---

### `Dockerfile`

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the app
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

### `.dockerignore`

```
node_modules
.next
.git
.gitignore
README.md
.env*
Dockerfile
.dockerignore
```

---

### `next.config.js` — confirm this is set

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

module.exports = nextConfig;
```

---

### Deploy to Cloud Run — step by step

**1. Build and push the image**

```bash
# Set your project and region
PROJECT_ID=your-gcp-project-id
REGION=us-central1
IMAGE=gcr.io/$PROJECT_ID/nextjs-app

# Build
docker build -t $IMAGE .

# Push to Google Container Registry (or Artifact Registry)
docker push $IMAGE
```

If using **Artifact Registry** instead:

```bash
IMAGE=REGION-docker.pkg.dev/$PROJECT_ID/YOUR_REPO/nextjs-app
```

**2. Deploy to Cloud Run**

```bash
gcloud run deploy nextjs-app \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://your-api.com,OTHER_VAR=value"
```

> Environment variables go in `--set-env-vars`. For secrets (DB passwords, API keys), use `--set-secrets` with Google Secret Manager instead.

**3. Authenticate Docker with GCP (one-time)**

```bash
gcloud auth configure-docker
# or for Artifact Registry:
gcloud auth configure-docker $REGION-docker.pkg.dev
```

---

### A few things to double-check

- `HOSTNAME="0.0.0.0"` is required — Cloud Run expects the server to listen on all interfaces, not just `localhost`.
- `PORT=3000` should match the `--port 3000` flag in the deploy command. Cloud Run injects a `PORT` env var too, so if your app reads `process.env.PORT`, it'll automatically use whatever Cloud Run assigns.
- Public env vars (`NEXT_PUBLIC_*`) are baked in at **build time**, so they must be available during `docker build`, not just at runtime. Pass them as `--build-arg` if needed.
