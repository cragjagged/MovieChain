import { TMDB_BASE, CREW_JOBS, TYPE_JOBS } from "../constants.js";

export const tmdbImg = (p, s = "w200") => p ? `https://image.tmdb.org/t/p/${s}${p}` : null;

export function isBearerToken(key) { return key.length > 50 || key.startsWith("eyJ"); }

export async function tmdb(key, path, params = {}) {
  const u = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const headers = isBearerToken(key) ? { Authorization: `Bearer ${key}` } : {};
  if (!isBearerToken(key)) u.searchParams.set("api_key", key);
  const r = await fetch(u.toString(), { headers });
  if (!r.ok) throw new Error(`TMDB ${r.status}: ${r.statusText}`);
  return r.json();
}

// Converts a raw TMDB /movie/{id}/credits response into a flat array of
// { personId, name, type } objects, deduplicated by personId+type.
// Gender from TMDB (1 = female) is used to split Actor/Actress correctly.
export function extractCredits(credits) {
  const map = new Map();
  for (const m of (credits.cast || [])) {
    const type = m.gender === 1 ? "Actress" : "Actor";
    const k = `${m.id}|${type}`;
    if (!map.has(k)) map.set(k, { personId: m.id, name: m.name, type });
  }
  for (const m of (credits.crew || [])) {
    const type = CREW_JOBS[m.job?.toLowerCase()];
    if (!type) continue;
    const k = `${m.id}|${type}`;
    if (!map.has(k)) map.set(k, { personId: m.id, name: m.name, type });
  }
  return [...map.values()];
}

// Extracts relevant movies from a TMDB /person/{id}/movie_credits response
// for the given person+type. Cast members return data.cast; crew members are
// filtered by the job sets in TYPE_JOBS, deduplicated by movie ID.
export function moviesForPerson(person, data) {
  if (person.type === "Actor" || person.type === "Actress") return data.cast || [];
  const jobs = TYPE_JOBS[person.type];
  if (!jobs) return [];
  const seen = new Set();
  const out = [];
  for (const m of (data.crew || [])) {
    if (jobs.has(m.job?.toLowerCase()) && !seen.has(m.id)) { seen.add(m.id); out.push(m); }
  }
  return out;
}
