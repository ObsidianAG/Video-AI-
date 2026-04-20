FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9

WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/contracts/package.json ./packages/contracts/
COPY services/media/package.json ./services/media/

RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm --filter @veo3/contracts build
RUN pnpm --filter @veo3/media build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=builder --chown=nodejs:nodejs /app/services/media/dist ./services/media/dist
COPY --from=builder /app/services/media/node_modules ./services/media/node_modules
COPY --from=builder /app/node_modules ./node_modules

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1))"

CMD ["node", "services/media/dist/index.js"]
