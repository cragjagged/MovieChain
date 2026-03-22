export const TMDB_BASE = "https://api.themoviedb.org/3";

// Increment this when making breaking changes to the shape of stored state.
// Prevents restoring incompatible backups and detects manually altered DBs.
export const STATE_VERSION = 1;
export const TMDB_CACHE_TTL = 24 * 60 * 60 * 1000;

// Maps Emby person role types to our internal credit types.
// Emby does not distinguish Actor vs Actress — gender correction happens
// later when TMDB prefetch data merges in via applyIfCached / mergeEntries.
export const EMBY_TYPE_MAP = {
  "Actor":      "Actor",
  "GuestStar":  "Actor",
  "Director":   "Director",
  "Writer":     "Writer",
  "Producer":   "Producer",
  "Composer":   "Composer",
};

// Maps TMDB crew job strings (lowercase) to our internal credit types.
export const CREW_JOBS = {
  "director": "Director",
  "screenplay": "Writer", "writer": "Writer", "story": "Writer",
  "novel": "Writer", "book": "Writer", "original story": "Writer", "based on novel": "Writer",
  "producer": "Producer", "executive producer": "Producer",
  "original music composer": "Composer", "music": "Composer",
  "director of photography": "Cinematographer",
  "editor": "Editor",
};

// Per-type sets of TMDB job strings, used by moviesForPerson() to filter
// a person's crew credits down to only roles matching a specific credit type.
export const TYPE_JOBS = {
  Director:        new Set(["director"]),
  Writer:          new Set(["screenplay","writer","story","novel","book","original story","based on novel"]),
  Producer:        new Set(["producer","executive producer"]),
  Composer:        new Set(["original music composer","music"]),
  Cinematographer: new Set(["director of photography"]),
  Editor:          new Set(["editor"]),
};

// Canonical ordered list of credit types. Drives: back-to-back blocking rule,
// the credit type dropdown in the custom link form, and TYPE_STYLE colour mapping.
export const ALL_TYPES = ["Actor","Actress","Director","Writer","Producer","Composer","Cinematographer","Editor"];

export const TYPE_STYLE = {
  Actor:           { bg: "rgba(0,180,216,0.18)",   color: "#7dd8ef" },
  Actress:         { bg: "rgba(236,72,153,0.18)",  color: "#f0a0cb" },
  Director:        { bg: "rgba(245,158,11,0.18)",  color: "#f0b752" },
  Writer:          { bg: "rgba(52,211,153,0.18)",  color: "#5dddb4" },
  Producer:        { bg: "rgba(167,139,250,0.18)", color: "#c0a9fa" },
  Composer:        { bg: "rgba(163,230,53,0.18)",  color: "#a3e635" },
  Cinematographer: { bg: "rgba(251,146,60,0.18)",  color: "#f5a06a" },
  Editor:          { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" },
  Other:           { bg: "rgba(180,155,120,0.18)", color: "#c4a882" },
};

export const SORT_OPTIONS = [
  { value: "emby",       label: "Emby first" },
  { value: "title",      label: "Title A–Z" },
  { value: "year_desc",  label: "Newest first" },
  { value: "year_asc",   label: "Oldest first" },
  { value: "rating",     label: "Top rated" },
];
