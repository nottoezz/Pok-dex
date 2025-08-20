import React, { useEffect, useRef, useState } from "react";

// --- Type badge colors ---
const TYPE_COLORS = {
  // Maps Pokémon types to colors for UI badges
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

const ALL_TYPES = Object.keys(TYPE_COLORS);

// Map regions to PokeAPI generations
const REGION_TO_GENERATION = {
  Kanto: "generation-i",
  Johto: "generation-ii",
  Hoenn: "generation-iii",
  Sinnoh: "generation-iv",
  Unova: "generation-v",
  Kalos: "generation-vi",
  Alola: "generation-vii",
  Galar: "generation-viii",
  Paldea: "generation-ix",
};

// --- Simple in-memory caches for API results ---
const pokemonCache = new Map();
const listCache = new Map();

// --- Helper to fetch JSON from API ---
async function fetchJSON(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// --- Fetch full Pokémon details by name or ID ---
async function getPokemon(nameOrId, { signal } = {}) {
  const key = String(nameOrId).toLowerCase();
  if (pokemonCache.has(key)) return pokemonCache.get(key);

  const data = await fetchJSON(`https://pokeapi.co/api/v2/pokemon/${key}`, { signal });

  // Fetch species info for flavor text, genus, etc.
  let species = null;
  try {
    species = await fetchJSON(data.species.url, { signal });
  } catch (err) {
    console.error(`Failed to fetch species for ${key}:`, err);
  }

  // Extract various sprite images
  const officialArt = data.sprites.other?.["official-artwork"]?.front_default;
  const frontSprite = data.sprites.front_default;
  const animatedBW = data.sprites.versions?.["generation-v"]?.["black-white"]?.animated?.front_default;

  // Get English flavor text and genus
  const englishFlavor =
    species?.flavor_text_entries
      ?.find((f) => f.language.name === "en")
      ?.flavor_text?.replaceAll("\n", " ")
      ?.replaceAll("\f", " ") ?? "";
  const genus = species?.genera?.find((g) => g.language.name === "en")?.genus ?? "";
  const generation = species?.generation?.name ?? null;

  // Compose result object
  const result = {
    id: data.id,
    name: data.name,
    types: data.types.map((t) => t.type.name),
    height: data.height,
    weight: data.weight,
    abilities: data.abilities.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    stats: data.stats.map((s) => ({ name: s.stat.name, base: s.base_stat })),
    sprites: { officialArt, frontSprite, animatedBW },
    flavor: englishFlavor,
    genus,
    generation,
  };

  pokemonCache.set(key, result);
  return result;
}

// --- Get Pokémon names by type ---
async function getNamesByType(type, { signal } = {}) {
  const key = `type:${type}`;
  if (listCache.has(key)) return listCache.get(key);
  const json = await fetchJSON(`https://pokeapi.co/api/v2/type/${type}`, { signal });
  const names = Array.from(new Set(json.pokemon.map((p) => p.pokemon.name)));
  listCache.set(key, names);
  return names;
}

// --- Get Pokémon names by region ---
async function getNamesByRegion(region, { signal } = {}) {
  const gen = REGION_TO_GENERATION[region];
  if (!gen) return [];
  const key = `region:${gen}`;
  if (listCache.has(key)) return listCache.get(key);
  const json = await fetchJSON(`https://pokeapi.co/api/v2/generation/${gen}`, { signal });
  const names = json.pokemon_species.map((s) => s.name);
  listCache.set(key, names);
  return names;
}

// --- Get first 151 Pokémon names (Kanto) ---
async function getFirst151({ signal } = {}) {
  const key = "first151";
  if (listCache.has(key)) return listCache.get(key);
  const json = await fetchJSON(`https://pokeapi.co/api/v2/pokemon?limit=151`, { signal });
  const names = json.results.map((r) => r.name);
  listCache.set(key, names);
  return names;
}

// --- Helper to intersect two arrays ---
function intersect(a, b) {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

// --- Fetch Pokémon details in batches for pagination ---
async function fetchDetailsInBatches(names, { start = 0, count = 24, signal } = {}) {
  const slice = names.slice(start, start + count);
  const results = [];
  // Fetch in batches of 8 for parallelism
  for (let i = 0; i < slice.length; i += 8) {
    const batch = slice.slice(i, i + 8);
    const batchResults = await Promise.all(
      batch.map(async (name) => {
        try {
          return await getPokemon(name, { signal });
        } catch (err) {
          console.error(`Failed to fetch details for ${name}:`, err);
          return null;
        }
      })
    );
    results.push(...batchResults.filter(Boolean));
  }
  return results;
}

// --- UI helpers ---
// Pokeball SVG icon
function PokeballIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M2 12h6a4 4 0 1 0 8 0h6c-.5 5.06-4.74 9-9.99 9C6.74 21 2.5 17.06 2 12Zm10-7C7.76 5 3.5 8.94 3 14h6a3 3 0 1 1 6 0h6c-.5-5.06-4.74-9-10-9Z" />
    </svg>
  );
}

// Type badge component
function TypeBadge({ type }) {
  const bg = TYPE_COLORS[type] || "#888";
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-semibold text-white shadow"
      style={{ backgroundColor: bg }}
    >
      {type}
    </span>
  );
}

// Stat bar for displaying base stats
function StatBar({ label, value }) {
  const pct = Math.min(100, Math.round((value / 180) * 100));
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 uppercase tracking-wide opacity-80">{label}</span>
      <div className="flex-1 h-2 bg-black/10 rounded">
        <div
          className="h-2 rounded"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #ef4444, #22c55e)" }}
        />
      </div>
      <span className="w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

// Card for displaying a single Pokémon's info
function PokeCard({ p }) {
  const displayId = String(p.id).padStart(3, "0");
  const img = p.sprites.officialArt || p.sprites.frontSprite || p.sprites.animatedBW;
  return (
    <div className="group relative rounded-2xl bg-red-600/10 ring-1 ring-red-700/30 shadow-lg overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center gap-2 bg-red-700 text-white px-3 py-2">
        <PokeballIcon className="w-4 h-4 opacity-80" />
        <div className="font-bold tracking-wider uppercase text-xs">Pokédex Entry</div>
        <div className="ml-auto text-xs opacity-90">#{displayId}</div>
      </div>

      {/* Body */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        <div className="sm:col-span-1 bg-white rounded-xl p-2 ring-1 ring-black/10">
          {img ? (
            <img src={img} alt={p.name} className="w-full h-40 object-contain" loading="lazy" />
          ) : (
            <div className="h-40 flex items-center justify-center text-sm opacity-60">No image</div>
          )}
        </div>
        <div className="sm:col-span-2 space-y-2">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight capitalize">{p.name}</h3>
            <p className="text-xs opacity-70 italic">{p.genus || ""}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {p.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>

          {p.flavor && <p className="text-sm leading-snug opacity-90">{p.flavor}</p>}

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-white/70 p-2 ring-1 ring-black/5">
              <div className="text-xs uppercase opacity-60">Height</div>
              <div className="font-semibold">{(p.height / 10).toFixed(1)} m</div>
            </div>
            <div className="rounded-lg bg-white/70 p-2 ring-1 ring-black/5">
              <div className="text-xs uppercase opacity-60">Weight</div>
              <div className="font-semibold">{(p.weight / 10).toFixed(1)} kg</div>
            </div>
          </div>

          <div className="space-y-1">
            {p.stats.map((s) => (
              <StatBar key={s.name} label={s.name.replace("-", " ")} value={s.base} />
            ))}
          </div>

          <div className="text-xs opacity-70">
            Abilities: {p.abilities.map((a) => (a.hidden ? `${a.name} (hidden)` : a.name)).join(", ")}
          </div>
        </div>
      </div>

      {/* Pixel-ish frame */}
      <div
        className="absolute inset-0 pointer-events-none border-4 border-black/20 [image-rendering:pixelated]"
        style={{ boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.2)" }}
      />
    </div>
  );
}

// --- Main App Component ---
export default function PokedexApp() {
  // --- State hooks ---
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [region, setRegion] = useState("");

  const [resultNames, setResultNames] = useState([]);
  const [results, setResults] = useState([]);
  const [nextIndex, setNextIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- Refs for aborting fetches and debouncing input ---
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const PAGE = 24; // Number of Pokémon per page

  // --- Cleanup abort controller on unmount ---
  useEffect(() => () => abortRef.current?.abort(), []);

  // --- Main search handler ---
  async function handleSearch(e) {
    e?.preventDefault();
    setError("");
    setResults([]);
    setNextIndex(0);

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const trimmed = query.trim().toLowerCase();
      const isNumeric = /^\d+$/.test(trimmed);

      // If searching by number only, fetch single Pokémon
      if (isNumeric && !type && !region) {
        setLoading(true);
        const p = await getPokemon(trimmed, { signal });
        setResultNames([]);
        setResults([p]);
        setLoading(false);
        return;
      }

      setLoading(true);

      // Get candidate Pokémon names by type/region
      let candidates = [];
      let byType = null;
      let byRegion = null;

      if (type) byType = await getNamesByType(type, { signal });
      if (region) byRegion = await getNamesByRegion(region, { signal });

      if (byType && byRegion) candidates = intersect(byType, byRegion);
      else if (byType) candidates = byType;
      else if (byRegion) candidates = byRegion;

      // Default to first 151 if no filter
      if (!candidates.length) {
        candidates = await getFirst151({ signal });
      }

      // Filter by name substring if query is present
      if (trimmed && !isNumeric) {
        candidates = candidates.filter((n) => n.includes(trimmed));
      }

      setResultNames(candidates);
      const firstBatch = await fetchDetailsInBatches(candidates, { start: 0, count: PAGE, signal });
      setResults(firstBatch);
      setNextIndex(Math.min(PAGE, candidates.length));
      setLoading(false);
    } catch (err) {
      if (err.name === "AbortError") return;
      setLoading(false);
      setError(err.message || "Something went wrong fetching data.");
    }
  }

  // --- Debounce search on input change ---
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, region]);

  // --- Load more results for pagination ---
  async function loadMore() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setLoading(true);
    const batch = await fetchDetailsInBatches(resultNames, { start: nextIndex, count: PAGE, signal });
    setResults((r) => [...r, ...batch]);
    setNextIndex((i) => Math.min(i + PAGE, resultNames.length));
    setLoading(false);
  }

  // --- Reset all filters ---
  function clearAll() {
    setQuery("");
    setType("");
    setRegion("");
  }

  // --- Render UI ---
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:12px_12px] p-4 sm:p-6 text-gray-900">
      {/* Top bar */}
      <header className="mx-auto max-w-6xl mb-4 sm:mb-6">
        <div className="flex items-center gap-3 bg-red-700 text-white rounded-2xl px-4 py-3 shadow-xl ring-1 ring-black/10">
          <PokeballIcon className="w-6 h-6" />
          <h1 className="text-xl sm:text-2xl font-black tracking-widest uppercase">Pokédex</h1>
          <div className="ml-auto text-xs sm:text-sm opacity-90">Powered by PokeAPI</div>
        </div>
      </header>

      {/* Controls */}
      <form onSubmit={handleSearch} className="mx-auto max-w-6xl mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wide mb-1 opacity-70">Search name or #</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. pikachu or 25"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600/60 shadow-inner"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide mb-1 opacity-70">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600/60 shadow-inner"
            >
              <option value="">Any</option>
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide mb-1 opacity-70">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600/60 shadow-inner"
            >
              <option value="">Any</option>
              {Object.keys(REGION_TO_GENERATION).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="rounded-xl bg-red-600 text-white px-4 py-2 font-semibold shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600"
          >
            Search
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-xl bg-white px-4 py-2 font-semibold shadow ring-1 ring-black/10 hover:bg-black/5"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Results */}
      <main className="mx-auto max-w-6xl">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 text-red-700 p-3 ring-1 ring-red-200">
            Error: {error}
          </div>
        )}

        {loading && results.length === 0 && (
          <div className="mb-4 rounded-xl bg-white p-3 ring-1 ring-black/10 shadow flex items-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-black/20 border-t-black animate-spin" />
            <span className="text-sm">Loading Pokémon…</span>
          </div>
        )}

        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((p) => (
              <PokeCard key={`${p.id}-${p.name}`} p={p} />
            ))}
          </div>
        ) : (
          !loading && (
            <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-black/10 shadow">
              <div className="mx-auto w-10 h-10 text-red-600">
                <PokeballIcon />
              </div>
              <p className="mt-2 font-semibold">Try a search</p>
              <p className="text-sm opacity-70">
                Name/number, filter by type and region, or leave blank to load the original 151.
              </p>
            </div>
          )
        )}

        {resultNames.length > nextIndex && (
          <div className="flex justify-center">
            <button
              onClick={loadMore}
              className="mt-6 rounded-xl bg-white px-4 py-2 font-semibold shadow ring-1 ring-black/10 hover:bg-black/5 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl mt-8 text-xs opacity-60 text-center">
        Data from{" "}
        <a className="underline" href="https://pokeapi.co/" target="_blank" rel="noreferrer">
          PokeAPI
        </a>
        . This is a fan project inspired by the classic games.
      </footer>
    </div>
  );
}