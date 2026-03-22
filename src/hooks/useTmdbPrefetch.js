import { useCallback } from "react";
import { useConfigStore } from "../stores/configStore.js";
import { store } from "../stores/storage.js";
import { tmdb, extractCredits, moviesForPerson } from "../api/tmdb.js";
import { TMDB_CACHE_TTL } from "../constants.js";

// Module-level Set of movie IDs currently being prefetched.
// Lives outside React state so it persists across re-renders without
// triggering them. Prevents duplicate concurrent fetches for the same ID.
const _inFlight = new Set();

export function useTmdbPrefetch() {
  const tmdbKey = useConfigStore(s => s.tmdbKey);

  // Fetches TMDB credits + all filmographies for movieId in the background,
  // storing the processed result in mc:tmdblinks:{id}. Called fire-and-forget
  // after every chain mutation and on boot. The compact stored shape is:
  // { cachedAt: number, entries: [{ movie, links: [{personId,name,type}] }] }
  const prefetch = useCallback((movieId) => {
    if (!tmdbKey || !movieId) return;
    const sid  = String(movieId);
    const skey = `mc:tmdblinks:${sid}`;
    if (_inFlight.has(sid)) return;
    _inFlight.add(sid);

    (async () => {
      try {
        const stored = await store.get(skey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Date.now() - parsed.cachedAt < TMDB_CACHE_TTL) {
            _inFlight.delete(sid);
            return;
          }
        }
        const creditsData = await tmdb(tmdbKey, `/movie/${movieId}/credits`);
        const allPeople   = extractCredits(creditsData);
        const results = await Promise.allSettled(
          allPeople.map(person =>
            tmdb(tmdbKey, `/person/${person.personId}/movie_credits`)
              .then(data => ({ person, data }))
              .catch(() => null)
          )
        );
        const optMap = new Map();
        for (const r of results) {
          if (r.status !== "fulfilled" || !r.value) continue;
          const { person, data } = r.value;
          for (const m of moviesForPerson(person, data)) {
            if (!m.title) continue;
            const msid = String(m.id);
            if (!optMap.has(msid)) optMap.set(msid, {
              movie: { id: m.id, title: m.title, release_date: m.release_date || "", vote_average: m.vote_average || 0, poster_path: m.poster_path || null },
              links: [],
            });
            const links = optMap.get(msid).links;
            if (!links.some(l => l.personId === person.personId && l.type === person.type))
              links.push({ personId: person.personId, name: person.name, type: person.type });
          }
        }
        await store.set(skey, JSON.stringify({ cachedAt: Date.now(), entries: [...optMap.values()] }));
      } catch { /* silent — cache miss handled by applyIfCached */ }
      finally { _inFlight.delete(sid); }
    })();
  }, [tmdbKey]);

  // Merges pre-fetched TMDB filmography data into the current candidate list.
  // Three cases:
  //   1. Cache hit  → applies immediately using `base` options array.
  //   2. In-flight  → polls the store every 500ms for up to 30s, then applies
  //                   via functional state update (avoids stale closure).
  //   3. Cache miss → kicks off prefetch for next time (non-blocking).
  //
  // Also upgrades Emby "Actor" → "Actress" when TMDB gender data is available,
  // and filters out any links whose type === lastType (back-to-back rule).
  //
  // Params:
  //   movieId   — current movie TMDB ID
  //   base      — initial options array built by startNext (used for case 1)
  //   lastType  — blocked credit type
  //   chainIds  — Set<string> of already-chained TMDB IDs
  //   watchedIds — Set<string> of played TMDB IDs
  //   onUpdate  — React state setter: (newArray | prev => newArray)
  const applyIfCached = useCallback(async ({ movieId, base, lastType, chainIds, watchedIds, onUpdate }) => {
    const sid  = String(movieId);
    const skey = `mc:tmdblinks:${sid}`;

    const computeMerge = (currentOptions, entries) => {
      const optMap = new Map(currentOptions.map(o => [String(o.movie.id), o]));
      for (const { movie, links } of entries) {
        const msid = String(movie.id);
        if (chainIds.has(msid)) continue;
        const isWatched = watchedIds.has(msid);
        if (!optMap.has(msid)) optMap.set(msid, { movie, links: [], watched: isWatched });
        const existing = optMap.get(msid).links;
        for (const l of links) {
          if (l.type === lastType) continue;
          // Match by TMDB ID when available, fall back to name (handles Emby persons without TMDB ID)
          const samePersonAs = (e) =>
            (l.personId && e.person?.personId === l.personId) ||
            (e.person?.name === l.name);
          // Upgrade Actor → Actress when TMDB confirms gender
          const existingActor = l.type === "Actress"
            ? existing.findIndex(e => samePersonAs(e) && e.type === "Actor")
            : -1;
          if (existingActor !== -1) {
            existing[existingActor] = { person: { personId: l.personId, name: l.name }, type: "Actress" };
          } else if (!existing.some(e => samePersonAs(e) && e.type === l.type)) {
            existing.push({ person: { personId: l.personId, name: l.name }, type: l.type });
          }
        }
      }
      return [...optMap.values()];
    };

    const stored = await store.get(skey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.cachedAt < TMDB_CACHE_TTL) {
        onUpdate(computeMerge(base, parsed.entries));
        return;
      }
    }

    if (_inFlight.has(sid)) {
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 500));
        const s2 = await store.get(skey);
        if (s2) {
          const p2 = JSON.parse(s2);
          if (Date.now() - p2.cachedAt < TMDB_CACHE_TTL) {
            // Functional update — React provides latest prev, avoids stale closure
            onUpdate(prev => computeMerge(prev, p2.entries));
            return;
          }
        }
      }
    }

    prefetch(Number(sid));
  }, [prefetch]);

  return { prefetch, applyIfCached };
}
