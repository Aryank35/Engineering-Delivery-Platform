# syntax=docker/dockerfile:1
# Builds the SPA and serves it with nginx.
# NOTE: not validated in the local dev environment (Docker unavailable there).

FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
ARG VITE_API_URL=http://localhost:4000/api
RUN printf "VITE_API_URL=%s\n" "$VITE_API_URL" > /repo/.env \
  && pnpm --filter @eop/shared build \
  && pnpm --filter @eop/web build

FROM nginx:alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
