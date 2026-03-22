# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start         # Start Express server (port 7879) — required for storage API
npm run dev       # Start Vite dev server with HMR (proxies /api/* to port 7879)
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

Dev mode requires both `npm start` and `npm run dev` running simultaneously.

There are no tests.

## Architecture

**Movie Chain** is a single-page React app implementing a film-watching game where each movie in the chain must share a credited person with the previous film, and the same credit type cannot be used on consecutive links.

### File structure

```
src/
  api/
    tmdb.js              # tmdb(), isBearerToken, tmdbImg, extractCredits, moviesForPerson
    emby.js              # embyFetch(), embyImgUrl, fetchEmbyLibrary, fetchEmbyItemPeople,
                         # fetchEmbyPersonMovies, embyEntryFor, embyStatusFor, embyImgFor
  stores/
    storage.js           # fetch()-based KV adapter targeting /api/storage/*; zustandStorage for persist middleware
    configStore.js       # tmdbKey, embyConfig, syncInterval, allowWatched
    chainStore.js        # entries[], add/undo/clear/importChain; selector functions
    embyStore.js         # library (plain object), lastSynced, status, syncLibrary action
  hooks/
    useTmdbPrefetch.js   # prefetch(movieId) + applyIfCached({...}); module-level _inFlight Set
  components/
    primitives.jsx       # Badge, StatusPill, Toggle, EmbyDot, BackBtn, SectionLabel, Card, Divider
    banners.jsx          # ErrBanner, InfoBanner, WarnBanner
    Poster.jsx           # Movie poster with Emby-first image, NO IMAGE fallback
    LinkChip.jsx         # Clickable "Person · TYPE" chip
    MovieOptionRow.jsx   # Candidate movie row on pick-movie screen
    ChainEntry.jsx       # One entry in the main chain list + connector below
    SearchRow.jsx        # TMDB search result row
  screens/
    SetupScreen.jsx      # Three-step wizard: TMDB key → Emby connect → user select
    SettingsScreen.jsx   # TMDB/Emby config, sync interval, backup/restore
    SearchFirstScreen.jsx # TMDB search to pick the first movie
    ChainScreen.jsx      # Main view: full chain list
    PickMovieScreen.jsx  # Pick next movie: builds candidates, handles custom links
  constants.js           # ALL_TYPES, TYPE_STYLE, CREW_JOBS, TYPE_JOBS, EMBY_TYPE_MAP, SORT_OPTIONS, TMDB_CACHE_TTL
  theme.js               # T object (all colour tokens)
  utils.js               # norm() accent-insensitive filter helper, sortOptions()
  movie-chain.jsx        # Root: global CSS injection, boot effects, screen routing (~80 lines)
  main.jsx               # Boot: rehydrate stores → render
```

### Storage

All state persists in a SQLite database at `data/storage.db` (via `server/db.js`). The frontend reads and writes through `/api/storage/*` fetch calls — there is no localStorage dependency. Three Zustand stores handle persistence:

| Store key | Contents |
|-----------|----------|
| `mc:config` | tmdbKey, embyConfig, syncInterval, allowWatched |
| `mc:chain` | chain entries array |
| `mc:emby` | emby library (plain object) + lastSynced |
| `mc:tmdblinks:{id}` | TMDB prefetch cache per movie (raw `store.get/set`, not Zustand) |
| `mc:col:{id}` | Collection metadata cache |

All stores use `skipHydration: true`. `main.jsx` calls `store.persist.rehydrate()` on all three before rendering, so the app always starts with fully hydrated state — no loading screen needed.

### Chain entry shape

```js
{
  movie: { id, title, year, poster, embyId },
  link: null | { person: { personId, name }, type }  // null only on first entry
}
```

### Zustand stores

**configStore** — `useConfigStore(s => s.tmdbKey)` etc. Actions: `setTmdbKey`, `setEmbyConfig`, `setSyncInterval`, `setAllowWatched`.

**chainStore** — `useChainStore(s => s.entries)`. Actions: `add(movie, link)`, `undo()`, `clear()`, `importChain(entries)`. Exported selector functions (plain functions, not hooks): `selectCurrentIdx(entries, library)`, `selectLastType(entries, currentIdx)`, `selectChainIds(entries)`, `selectWatchedIds(entries, library)`.

**embyStore** — `useEmbyStore(s => s.library)`. Library is `Record<tmdbId, {embyId, played, lastPlayedDate(ISO|null), title}>` — a plain object (not Map) for JSON-safe persistence. `syncLibrary(cfg, background)` fetches and updates in one action. `background=true` skips the "syncing" status flash.

### embyLib as plain object (not Map)

The Emby library is stored as a plain JS object keyed by TMDB ID string. All Map call sites were converted: `.has(id)` → `id in library`, `.get(id)` → `library[id]`, `.entries()` → `Object.entries(library)`. Use `embyEntryFor(library, id)` / `embyStatusFor(library, id)` / `embyImgFor(cfg, library, id)` from `api/emby.js` for lookups in components.

### Screen routing

`screen` state lives in the root `movie-chain.jsx`. Screens receive only `go(screenName)` as a navigation prop. All data comes from Zustand stores directly — no prop drilling of state.

### Link generation (`PickMovieScreen.startNext`)

**Emby path (preferred):** fetch people on current Emby item → fetch each person's Emby movies in parallel → merge into `optMap`. Fast — all local network.

**TMDB fallback:** full parallel TMDB filmography fetch for all credited people.

After building the base list, `applyIfCached` merges the TMDB prefetch cache on top (adds Actress distinction, non-library films, filters blocked `lastType`).

### `pickMovie` — series order check

When adding a movie, `pickMovie` fetches full TMDB details and checks `belongs_to_collection`. If the film is part of a series, it fetches `/collection/{id}` and blocks selection if any earlier entry is unwatched and not in the chain. Suspended in history mode (`allowWatched`).

### Background prefetch (`useTmdbPrefetch`)

`prefetch(movieId)` — fires after every chain mutation (via `useEffect` on `entries` in root). Fetches TMDB credits + filmographies and caches compact results at `mc:tmdblinks:{id}` (24h TTL). Module-level `_inFlight` Set prevents duplicates.

`applyIfCached({movieId, base, lastType, chainIds, watchedIds, onUpdate})` — three cases: (1) cache hit → merges immediately into `base`; (2) in-flight → polls every 500ms for up to 30s, then merges via functional state update; (3) miss → kicks off new prefetch.

### Credit types

`ALL_TYPES = ["Actor","Actress","Director","Writer","Producer","Composer","Cinematographer","Editor"]`

Emby collapses all cast to "Actor". `applyIfCached` upgrades Actor→Actress entries when TMDB gender data confirms it.

### Styling

All styles are inline or injected via `<style id="mc-styles">` in root's `useEffect`. Theme tokens in `theme.js` (`T` object). Font is Outfit (Google Fonts). No CSS-in-JS library, no component library.

### TMDB authentication

Supports v3 API keys (32-char hex, `api_key=` query param) and v4 Bearer tokens (JWT, `Authorization` header). `isBearerToken(key)`: length > 50 or starts with `"eyJ"`.

### Server

`server/index.js` — Express server that serves `dist/` and exposes:

- `GET|PUT|DELETE /api/storage/:key` — SQLite-backed KV store
- `GET /api/storage` — full dump of all stored keys
- `GET /api/version`, `GET /api/health`
- `GET|PATCH /api/update/config`, `GET /api/update/status` (SSE), `POST /api/update/check|apply`

`server/db.js` — synchronous SQLite wrapper using Node 22's built-in `node:sqlite`. Single `kv` table, WAL mode, all ops via prepared statements.
