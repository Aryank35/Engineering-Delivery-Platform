# syntax=docker/dockerfile:1
# Multi-stage build for the NestJS API within the pnpm monorepo.
# NOTE: not validated in the local dev environment (Docker unavailable there);
# intended for a Docker-enabled host / CI.

FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable
WORKDIR /repo

# Copy the whole workspace and install (build needs shared + database packages).
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @eop/database db:generate \
  && pnpm --filter @eop/shared build \
  && pnpm --filter @eop/api build

# Produce a self-contained, production-only bundle for the api.
RUN pnpm --filter @eop/api deploy --prod /app

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV API_PORT=4000
COPY --from=builder /app ./
EXPOSE 4000
CMD ["node", "dist/main.js"]
