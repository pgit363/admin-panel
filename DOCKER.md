# Docker — admin-panel

This repo has **no server-side code**. `npm run build` emits static files to
`./build`, so the container is a multi-stage build: Node 20 compiles the bundle,
then nginx serves it. There is no Node process in the final image.

Final image: **~87 MB**, runs as non-root (uid 101), listens on **8080** inside
the container.

## Build

```bash
docker build -t tourkokan/admin-panel:local .
```

## Run

```bash
docker compose up -d --build     # http://localhost:3010
```

or without compose:

```bash
docker run -d -p 3010:8080 \
  -e BACKEND_ORIGIN=http://host.docker.internal:8001 \
  --add-host host.docker.internal:host-gateway \
  tourkokan/admin-panel:local
```

Host port **3010** was chosen because 8000/8001 belong to another account's
apps and 8010/5432/11434/8080 are taken by the AI repo's stack.

## Environment variables

### Build time (baked into the JS — cannot be changed later)

Vite inlines `VITE_*` values into the minified bundle. `docker run -e VITE_...`
does nothing. Change these and you must rebuild the image.

| Build arg | Default | Purpose |
|---|---|---|
| `VITE_ADMIN_API_BASE` | `/admin/v2` | Admin API base (JWT) |
| `VITE_PUBLIC_API_BASE` | `/api/v2` | Public API base |
| `VITE_AWS_URL` | S3 bucket URL | Image base path |

The defaults are **relative** on purpose: the browser calls this container and
nginx proxies onward, so one image works against any backend and there is no
CORS preflight for the app's `Authorization` / `X-App-Source: admin` headers.

To reproduce the current Cloudflare Pages build instead (absolute, cross-origin,
requires backend CORS to allow the origin):

```bash
docker build \
  --build-arg VITE_ADMIN_API_BASE=https://api.tourkokan.com/admin/v2 \
  --build-arg VITE_PUBLIC_API_BASE=https://api.tourkokan.com/api/v2 \
  -t tourkokan/admin-panel:prod .
```

None of these is a secret — they are public URLs already committed to the repo.
**Never add a token or key as a build arg**: build args are visible in
`docker history`.

### Run time (the only knob)

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_ORIGIN` | `http://backend:8000` | Where nginx forwards `/admin/v2` and `/api/v2` |

Set it to `http://<service>:8000` on a shared compose network, or
`http://host.docker.internal:8001` when the backend runs on the host.
Only meaningful when the bundle was built with relative API bases (the default).

## Caveats

**The lockfile is gitignored.** `package-lock.json` is in `.gitignore` and is
**not tracked**. The image builds fine from this working tree, but a build from
a fresh `git clone` fails at `npm ci`. Before wiring this into CI:

```bash
git add -f package-lock.json && git commit -m "chore: track lockfile"
```

**One image per environment.** Because `VITE_*` is inlined at build time, an
image is permanently bound to whatever API bases it was built with. There is no
runtime config shim. Use the relative defaults plus `BACKEND_ORIGIN` to avoid
needing one.

**The dev proxy does not exist in production.** `vite.config.mjs` proxies
`/admin/v2` and `/api/v2` only in the dev server. That middleware is gone from a
production build, which is why `nginx/default.conf.template` re-implements it.
If you build with relative bases and run *without* a reachable `BACKEND_ORIGIN`,
the app loads but every API call fails.

**This may not match how the app is actually deployed.** `deploy:test` and
`deploy:prod` both run `npx wrangler pages deploy build` — Cloudflare Pages,
which serves uploaded static files with no origin server. A container adds an
origin nothing in that pipeline currently consumes. Confirm the deploy target is
really changing before adopting this image.

**Routing is hash-based.** `src/App.js` uses `HashRouter`, so routes live in the
URL fragment (`#/dashboard`) and nginx only ever sees `/`. The `try_files`
fallback is cheap insurance, not load-bearing. (`public/_redirects` is a
Cloudflare Pages file; nginx ignores it entirely.)

**No WebSockets anywhere.** A grep of `src/` for `WebSocket`, `socket.io`,
`laravel-echo`, `pusher`, `ws://` and `wss://` returns nothing — all backend
communication is plain `fetch()` over HTTP. The nginx config deliberately has no
`Upgrade`/`Connection` handling because nothing needs it.

**Bundle size.** Vite warns about chunks >500 kB (Flags 3.46 MB, Brands 1.42 MB,
CoreUIIcons 363 kB). They are lazy-loaded, so this only affects the pages that
use them, but the image does ship them.

## Verified

Built and run on Colima / Apple Silicon (linux/arm64, native — both base images
are multi-arch):

- image builds clean from scratch (`--no-cache`)
- container starts, healthcheck reports `healthy`
- `/` and deep links return 200 with `nosniff`, `X-Frame-Options`,
  `Referrer-Policy`
- hashed assets get a single immutable `Cache-Control`; `index.html` is
  `no-cache`
- gzip active on JS
- `/admin/v2/*` genuinely proxies to `BACKEND_ORIGIN` (not a 404 from the static
  server)
- the nginx resolver is detected per network mode — `127.0.0.11` under compose,
  the host resolver on the default bridge
