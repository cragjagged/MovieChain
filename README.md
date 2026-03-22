# Movie Chain

A self-hosted film-watching game where each movie must share a credited person with the previous one — but you can't reuse the same credit type back-to-back.

Connects to [TMDB](https://www.themoviedb.org/) for film and credit data, and optionally [Emby](https://emby.media/) to track what you've already watched.

---

## How to play

1. Pick a starting movie
2. For each new addition, choose a person who worked on both it and the previous film
3. The credit type (Actor, Director, Writer, etc.) must be different from the one used on the previous link
4. Films you've already watched are blocked — keep it fresh
5. Series films must be added in order — no skipping ahead to a sequel if you haven't watched the earlier entries

---

## Getting started

### What you'll need

- A free [TMDB API key](https://www.themoviedb.org/settings/api)
- Docker (recommended), or Node.js 22+ for a bare-metal install
- An [Emby](https://emby.media/) server (optional — enables watch tracking)

### Docker (recommended)

```bash
docker compose up -d
```

Then open [http://localhost:7879](http://localhost:7879) in your browser. A setup wizard will walk you through the rest.

To use a different port, set `PORT` in `docker-compose.yml`:

```yaml
environment:
  PORT: "8080"
ports:
  - "8080:8080"
```

### Bare metal

```bash
npm run serve    # builds the app and starts the server at http://localhost:7879
```

For automatic restarts (e.g. after an auto-update), run via [PM2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

---

## First-time setup

On first launch you'll be walked through three steps:

1. **TMDB key** — paste your API key or Bearer token
2. **Emby** — optional; enter your server address, API key, and pick which user's watch history to use
3. Done — start your first chain

You can update any of these settings later from the **Settings** screen.

---

## Auto-update

Movie Chain can update itself automatically. Go to the **System** screen to configure it:

- **Channel** — *Stable* tracks releases; *Development* tracks the latest commits on the develop branch
- **Check interval** — how often to look for updates (default: 24 hours)

When an update is found, a banner appears at the top of the screen. You can install it immediately or dismiss the banner and come back to it later — a dot on the System nav item will remind you it's waiting.

---

## Credit types

Each link in your chain is categorised by credit type:

**Actor · Actress · Director · Writer · Producer · Composer · Cinematographer · Editor**

There's also a free-form **Other** option if you want to make a custom connection.

If you use Emby, all cast members are treated as Actor. Connecting via TMDB data will distinguish Actor and Actress.
