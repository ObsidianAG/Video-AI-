# STATUS: BUILT — docker build -t vibeforge:1.0 . && docker run -e AI_PROXY_ARMED=false -p 8787:8787 vibeforge:1.0
# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM node:22-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
ENV NODE_ENV=production AI_PROXY_ARMED=false
COPY --from=build /app/dist ./dist
COPY server ./server
USER app
EXPOSE 8787
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8787/ || exit 1
CMD ["node", "server/index.mjs"]
