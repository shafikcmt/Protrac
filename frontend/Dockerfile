# ---------- BASE ----------
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat curl
RUN corepack enable && corepack prepare pnpm@9.1.2 --activate
WORKDIR /app

# ---------- DEPS ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ---------- BUILDER ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---------- RUNNER ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone output (requires next.config.* output: "standalone")
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# IMPORTANT:
# Your repo has NO /public folder (per screenshot),
# so DO NOT copy it. If you later add /public, you can add:
# COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
