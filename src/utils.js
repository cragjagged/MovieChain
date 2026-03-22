import { SORT_OPTIONS } from "./constants.js";

// Unicode-normalises a string for accent-insensitive filtering: decomposes
// combined characters (NFD), strips diacritics (U+0300–U+036F), then lowercases.
// "Café" and "cafe" match; "Niño" and "nino" match.
export const norm = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Sorts a candidate options array for the pick-movie screen.
// library is Record<tmdbId, EmbyEntry> (plain object, not Map).
export function sortOptions(options, sortBy, library) {
  const arr = [...options];
  arr.sort((a, b) => {
    if (sortBy === "emby") {
      const ae = String(a.movie.id) in (library || {}) ? 0 : 1;
      const be = String(b.movie.id) in (library || {}) ? 0 : 1;
      if (ae !== be) return ae - be;
      return (a.movie.title || "").localeCompare(b.movie.title || "");
    }
    if (sortBy === "title")     return (a.movie.title || "").localeCompare(b.movie.title || "");
    if (sortBy === "year_desc") return (b.movie.release_date || "").localeCompare(a.movie.release_date || "");
    if (sortBy === "year_asc")  return (a.movie.release_date || "").localeCompare(b.movie.release_date || "");
    if (sortBy === "rating")    return (b.movie.vote_average || 0) - (a.movie.vote_average || 0);
    return 0;
  });
  return arr;
}

export { SORT_OPTIONS };
