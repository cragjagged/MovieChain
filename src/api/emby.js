import { EMBY_TYPE_MAP } from "../constants.js";

// cfg shape: { serverUrl, apiKey, userId, userName }
export async function embyFetch(cfg, path, params = {}) {
  const base = cfg.serverUrl.replace(/\/$/, "");
  const u = new URL(`${base}${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u.toString(), { headers: { "X-Emby-Token": cfg.apiKey } });
  if (!r.ok) throw new Error(`Emby ${r.status}: ${r.statusText}`);
  return r.json();
}

// Returns the Emby primary image URL for an item.
export function embyImgUrl(cfg, embyId, height = 300) {
  if (!cfg || !embyId) return null;
  return `${cfg.serverUrl.replace(/\/$/, "")}/Items/${embyId}/Images/Primary?fillHeight=${height}&quality=90&api_key=${cfg.apiKey}`;
}

// Fetches the complete movie library for the configured user, paginated in
// batches of 500. Returns Map<tmdbId(string), { embyId, played, lastPlayedDate, title }>.
// Only movies with a TMDB provider ID are included.
export async function fetchEmbyLibrary(cfg) {
  const map = new Map();
  let start = 0;
  const limit = 500;
  while (true) {
    const d = await embyFetch(cfg, `/Users/${cfg.userId}/Items`, {
      IncludeItemTypes: "Movie", Recursive: true,
      Fields: "ProviderIds,UserData", Limit: limit, StartIndex: start,
    });
    for (const item of (d.Items || [])) {
      const tmdbId = item.ProviderIds?.Tmdb || item.ProviderIds?.tmdb;
      if (tmdbId) map.set(String(tmdbId), {
        embyId:         item.Id,
        played:         item.UserData?.Played ?? false,
        lastPlayedDate: item.UserData?.LastPlayedDate ? new Date(item.UserData.LastPlayedDate) : null,
        title:          item.Name,
      });
    }
    start += limit;
    if (start >= (d.TotalRecordCount || 0)) break;
  }
  return map;
}

// Returns the credited people on a specific Emby movie item, filtered to
// types we care about. Requests ProviderIds so each person carries their
// TMDB person ID for deduplication against TMDB filmography data.
export async function fetchEmbyItemPeople(cfg, embyId) {
  const d = await embyFetch(cfg, `/Users/${cfg.userId}/Items/${embyId}`, { Fields: "People,ProviderIds" });
  return (d.People || []).filter(p => EMBY_TYPE_MAP[p.Type]);
}

// Fetches all movies in the Emby library that feature a given person.
export async function fetchEmbyPersonMovies(cfg, personId) {
  const d = await embyFetch(cfg, `/Users/${cfg.userId}/Items`, {
    PersonIds: personId,
    IncludeItemTypes: "Movie",
    Recursive: true,
    Fields: "ProviderIds,UserData,ProductionYear,CommunityRating",
  });
  return d.Items || [];
}

// ── Library lookup helpers ──────────────────────────────────────────────────
// library is Record<tmdbId, { embyId, played, lastPlayedDate(ISO|null), title }>

export function embyEntryFor(library, id) {
  return library?.[String(id)] ?? null;
}

// Returns "available" | "watched" | "missing" | null (no library connected)
export function embyStatusFor(library, id) {
  if (!library) return null;
  const e = library[String(id)];
  return !e ? "missing" : e.played ? "watched" : "available";
}

// Returns the Emby poster URL for a movie (preferred over TMDB images).
export function embyImgFor(cfg, library, id, height = 200) {
  const e = library?.[String(id)];
  return cfg && e ? embyImgUrl(cfg, e.embyId, height) : null;
}

// Returns the Emby landscape thumb URL for a movie (Thumb image type).
export function embyThumbFor(cfg, library, id, height = 200) {
  const e = library?.[String(id)];
  if (!cfg || !e) return null;
  return `${cfg.serverUrl.replace(/\/$/, "")}/Items/${e.embyId}/Images/Thumb?fillHeight=${height}&quality=90&api_key=${cfg.apiKey}`;
}
