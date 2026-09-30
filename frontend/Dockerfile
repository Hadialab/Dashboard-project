# The app.
#
# Builds the Vite bundle, then serves the static files from nginx. There is no
# Node server in the runtime image: this is a client-side app, so what ships is
# HTML, JS and CSS, and the only thing that has to be correct is the SPA
# fallback (see nginx.conf).

# ===== build =====
FROM node:20-alpine AS build

WORKDIR /app

# On their own, so the dependency layer is cached until the lockfile changes.
# The source copy below then rebuilds in seconds rather than minutes.
COPY package*.json ./
RUN npm ci

COPY . .

# ARGs, not RUN-env, because VITE_ values are inlined at build time. This is the
# single most important detail in this file: passing them when the *server* starts
# does nothing, and the app would ship pointing at localhost.
#
# The defaults are deliberately unreachable. A build with no argument produces an
# app that cannot reach any API, which fails loudly on first use instead of
# quietly working for the person who built it. A real deployment passes real
# values; see .github/workflows/deploy.yml.
ARG VITE_API_URL
ARG VITE_API_TIMEOUT=60000
ARG VITE_APP_ENV=production
ARG VITE_SENTRY_DSN=""
ARG VITE_APP_VERSION=dev

RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL is required. A build without it reaches no API." && exit 1)

RUN VITE_API_URL="$VITE_API_URL" \
    VITE_API_TIMEOUT="$VITE_API_TIMEOUT" \
    VITE_APP_ENV="$VITE_APP_ENV" \
    VITE_SENTRY_DSN="$VITE_SENTRY_DSN" \
    VITE_APP_VERSION="$VITE_APP_VERSION" \
    npm run build

# ===== runtime =====
FROM nginx:1.27-alpine AS runtime

# Replacing the stock config rather than adding to it: the default one has a
# server block that would answer on port 80 before the SPA block ever gets
# matched, and two blocks on the same default server name is a silent
# misconfiguration.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copied into a fresh directory so the image cannot write to its own code, and
# `chown` is avoided by copying as root and letting nginx's own workers drop
# privilege — which is what the `nginx` user in the base image already does.
COPY --from=build /app/dist /usr/share/nginx/html

# Unprivileged nginx listens on 8080 instead of 80, which is the only way to run
# it as a non-root user. Port 80 needs a capability the runtime does not need to
# have.
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
