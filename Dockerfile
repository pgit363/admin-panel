# admin-panel — Vite + React static build served by nginx.
#
# This repo has NO server-side code. `npm run build` emits plain static files
# to ./build, so the production container is a static file server, not a Node
# process. `npm run serve` (vite preview) is deliberately NOT used as the
# entrypoint: it is a dev tool, it would force the whole devDependency tree to
# stay in the image, and it ships no gzip, cache or security headers.

# ---------------------------------------------------------------------------
# Stage 1 — build the static bundle
# ---------------------------------------------------------------------------
# Node is needed at BUILD time only. node:20-alpine is multi-arch, so this
# works on Apple Silicon (linux/arm64) under Colima without emulation.
FROM node:20-alpine AS build

WORKDIR /app

# Copy manifests first so the dependency layer is cached independently of
# source changes.
#
# NOTE: package-lock.json is listed in .gitignore and is NOT tracked by git.
# It exists in the working tree, so a build from this directory succeeds, but a
# build from a fresh `git clone` will fail here with "npm ci can only install
# with an existing package-lock.json". Fix before wiring this into CI:
#     git add -f package-lock.json && git commit -m "chore: track lockfile"
# `npm ci` is used rather than `npm install` on purpose — `npm install`
# re-resolves the ^ranges on every build, so images would drift without a
# single code change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# ---------------------------------------------------------------------------
# Build-time configuration
# ---------------------------------------------------------------------------
# Vite inlines VITE_* values into the JS bundle at BUILD time. They cannot be
# changed later with `docker run -e` — the strings are baked into the minified
# assets. Verified: a production build writes the literal
# "https://api.tourkokan.com/admin/v2" into build/assets/apiService-*.js.
#
# The defaults below are RELATIVE paths, which is what makes one image usable
# against any backend: the browser calls the same origin it loaded from, and
# nginx (stage 2) proxies those paths onward to $BACKEND_ORIGIN, which IS a
# run-time variable. This also avoids CORS entirely — the app sends
# `Authorization: Bearer` and a custom `X-App-Source: admin` header, which
# would otherwise trigger a preflight against the backend.
#
# To reproduce today's Cloudflare Pages build instead (absolute, cross-origin,
# requires backend CORS to allow the origin), override them:
#   --build-arg VITE_ADMIN_API_BASE=https://api.tourkokan.com/admin/v2
#   --build-arg VITE_PUBLIC_API_BASE=https://api.tourkokan.com/api/v2
#
# Note all .env files are excluded by .dockerignore, so these args are the only
# configuration input. None of them is a secret — they are public URLs, already
# committed in the repo. Never add a token or key here: build args are visible
# in the image history.
ARG VITE_ADMIN_API_BASE=/admin/v2
ARG VITE_PUBLIC_API_BASE=/api/v2
ARG VITE_AWS_URL=https://tourkokan-412490161095-eu-north-1-an.s3.eu-north-1.amazonaws.com

# Vite reads VITE_* from the process environment and lets them win over any
# .env file, so exporting the args here is enough to control the bundle.
ENV VITE_ADMIN_API_BASE=$VITE_ADMIN_API_BASE \
    VITE_PUBLIC_API_BASE=$VITE_PUBLIC_API_BASE \
    VITE_AWS_URL=$VITE_AWS_URL

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — serve
# ---------------------------------------------------------------------------
# nginx-unprivileged instead of the stock nginx image: it already runs as uid
# 101 (nginx), with its temp/cache/pid paths relocated to writable locations
# and a default listener on 8080 instead of the privileged port 80. That gives
# a non-root container without hand-patching permissions. Multi-arch, so arm64
# is native. It keeps the stock image's /etc/nginx/templates envsubst
# entrypoint, which is what makes BACKEND_ORIGIN a run-time knob.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# Where nginx forwards /admin/v2 and /api/v2. Overridable at run time:
#   docker run -e BACKEND_ORIGIN=http://api:8000 ...
# Only used when the bundle was built with relative API bases (the default).
ENV BACKEND_ORIGIN=http://backend:8000

# Opts into the base image's own /docker-entrypoint.d/15-local-resolvers.envsh,
# which is a no-op unless this flag is set. It reads /etc/resolv.conf and
# exports NGINX_LOCAL_RESOLVERS for the template to substitute.
#
# The config needs a `resolver` because proxy_pass uses a variable (see the
# template), and the correct address differs by network mode — verified here:
#   user-defined / compose network : 127.0.0.11   (Docker's embedded DNS)
#   default bridge (`docker run`)  : 192.168.5.1  (the host's resolver)
# Hardcoding either one makes every proxied request time out in the other mode,
# so detection at startup is required rather than a fixed value.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

# Rendered by the base image's entrypoint (envsubst) into
# /etc/nginx/conf.d/default.conf before nginx starts, so proxy_pass ends up
# holding a literal value rather than an unresolved variable.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Static assets only — no node_modules, no source, no build toolchain.
COPY --from=build /app/build /usr/share/nginx/html

# Already non-root via the base image; stated explicitly so it survives edits.
USER 101

EXPOSE 8080

# Hits the SPA entrypoint rather than a dedicated endpoint — there is no
# backend in this image to report on, so "can nginx serve index.html" is the
# only meaningful liveness signal. Uses busybox wget (present in alpine);
# curl is not installed.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
