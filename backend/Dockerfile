# The API.
#
# Multi-stage so the runtime image carries no build tooling, no dev dependencies
# and no npm cache. There is nothing to compile here — the backend is plain ES
# modules run directly by Node — but the split still buys a much smaller image
# and a much smaller attack surface.

# ===== build =====
FROM node:20-alpine AS build

WORKDIR /app

# Copied on their own so `npm ci` is only re-run when the lockfile changes. The
# node_modules layer is by far the slowest step, and this is what stops every
# source edit from reinstalling the world.
COPY package*.json ./
RUN npm ci

COPY . .

# A syntax check over every source file. Catches a broken import at image build
# time rather than at boot, where the only symptom is a crash loop and a health
# check that never turns green.
RUN set -e; for f in $(find src scripts -name '*.js'); do node --check "$f"; done

# ===== runtime =====
FROM node:20-alpine AS runtime

# dumb-init gives the process a real init, so SIGTERM from the orchestrator
# reaches Node and the graceful shutdown in server.js actually runs. Without it
# the container is killed after the grace period and in-flight requests are cut
# off mid-transaction.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
WORKDIR /app

# Production dependencies only.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts

# node:alpine ships an unprivileged `node` user (uid 1000). Running as root
# inside a container is unnecessary and turns a container escape into a host
# compromise.
USER node

EXPOSE 5000

# Uses the existing /health endpoint rather than adding one. The healthcheck
# checks that the process is answering, which is what an orchestrator needs to
# know before routing traffic.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
