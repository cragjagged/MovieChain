# Movie Chain

A self-hosted film-watching game where each movie in the chain must share a credited person with the previous film, and the same credit type cannot be used on consecutive links.

Integrates with [TMDB](https://www.themoviedb.org/) for film/credit data and optionally [Emby](https://emby.media/) to track what you've watched.

---

## The game

- Each new film must share a credited person with the previous film (actor, director, writer, etc.)
- You cannot use the same credit type on back-to-back links (e.g. two consecutive "Director" links are blocked)
- Films you've already watched (tracked via Emby) are blocked from being added
- Series films must be added in release order — you can't add a sequel if an earlier entry is unwatched and not already on the chain

---

## Prerequisites

- **Node.js 22+** (for local/bare-metal deployment)
- **Docker + Docker Compose** (for containerised deployment)
- A **TMDB API key** (v3 key or v4 Bearer token) — free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
- An **Emby server** (optional) — enables watched-status tracking and library integration

---

## Running locally (development)

Dev mode proxies `/api/*` to the Express server, so you need both running:

```bash
# Terminal 1 — Express server (storage + update API)
npm start

# Terminal 2 — Vite dev server with HMR
npm run dev        # http://localhost:5173
```

> The auto-update banner is suppressed in dev mode but the storage API is live, so data persists in SQLite exactly as it does in production.

---

## Running in production

### Bare metal / as a service

```bash
npm install
npm run serve      # builds the SPA then starts the Express server at http://localhost:7879
```

Or as two separate steps:

```bash
npm run build
npm start          # node server/index.js
```

For automatic restarts (e.g. after an auto-update), run via [PM2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup    # persist across reboots
```

#### systemd unit (optional)

```ini
[Unit]
Description=Movie Chain
After=network.target

[Service]
ExecStart=/usr/bin/node /opt/movie-chain/server/index.js
WorkingDirectory=/opt/movie-chain
Restart=always
Environment=PORT=7879

[Install]
WantedBy=multi-user.target
```

### Docker

```bash
docker compose up -d
```

The `data/` directory is mounted as a volume at `./data` — this persists all app state (SQLite database and update settings) across container rebuilds.

To pass the version and git SHA into the image at build time:

```bash
docker build \
  --build-arg APP_VERSION=1.0.0 \
  --build-arg GIT_SHA=$(git rev-parse --short HEAD) \
  -t movie-chain .
```

---

## Configuration

On first launch, a three-step setup wizard walks you through:

1. **TMDB key** — paste a v3 API key (32-char hex) or v4 Bearer token
2. **Emby** — optional; enter your server URL, API key, and select a user
3. **User select** — pick the Emby user whose watch history to track

Settings can be changed at any time via the **Settings** screen.

### Port

Default port is **7879**. Override with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

Or in `docker-compose.yml`:

```yaml
environment:
  PORT: "8080"
ports:
  - "8080:8080"
```

---

## Auto-update

Movie Chain can check GitHub for new releases and update itself without manual intervention.

### Setup

1. Go to **System** screen
2. Enter your GitHub repository in `owner/repo` format
3. Choose a channel:
   - **Stable** — tracks tagged releases; updates when a higher semver tag is published
   - **Development** — tracks the `develop` branch; updates when new commits are pushed
4. Set a check interval (default: 1 hour)

### Update flow

When an update is detected, a banner appears at the top of the app. Clicking **Update now** triggers:

1. Download source tarball from GitHub
2. Extract → `npm ci` → `npm run build`
3. Swap `dist/` and `server/` in place
4. Server restarts via PM2 (or Docker restart policy)
5. Banner changes to **Reload now** — click to load the new version

Update state and configuration are persisted in `data/server-config.json` (gitignored, mapped as a Docker volume).

### GitHub Actions (recommended)

Tag a release to trigger the stable channel update:

```bash
git tag v1.1.0 && git push origin v1.1.0
```

Create a GitHub release from that tag — Movie Chain polls `releases/latest` and will pick it up within the configured interval.

---

## Available npm scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |
| `npm start` | Start the Express server (requires `dist/` to exist) |
| `npm run serve` | Build then start the Express server |

---

## Storage

All state is stored server-side in a SQLite database at `data/storage.db`. The frontend reads and writes via `/api/storage/*` fetch calls — there is no localStorage dependency.

| Key | Contents |
| --- | --- |
| `mc:config` | TMDB key, Emby config, sync interval, preferences |
| `mc:chain` | Chain entries array |
| `mc:emby` | Emby library snapshot + last synced timestamp |
| `mc:tmdblinks:{id}` | TMDB prefetch cache per movie (24 h TTL) |
| `mc:col:{id}` | Collection metadata cache |

Update settings live in `data/server-config.json` (managed by the server process, not the KV store).

The `data/` directory is gitignored and should be mapped as a Docker volume so it survives container rebuilds.

---

## Credit types

`Actor` · `Actress` · `Director` · `Writer` · `Producer` · `Composer` · `Cinematographer` · `Editor`

Emby collapses all cast to "Actor". TMDB data is used to distinguish Actor vs Actress where available. A free-form "Other" credit type is also available for custom links.
