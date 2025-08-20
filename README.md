# OG‑Style Pokédex (React + PokeAPI)

A clean, nostalgic Pokédex built with **React + Vite** and styled with **Tailwind CSS v4**.  
It consumes data from [PokeAPI](https://pokeapi.co/) and provides a fast, ad‑free way to browse, search, and filter Pokémon—styled with a tasteful nod to the OG games.

> **Live behavior**
> - Populates automatically on load with the **original 151** (Kanto).
> - Updates results **as you type** (debounced).
> - Supports **name** or **#dex number** search (e.g., `25` → *Pikachu*).
> - Filter by **Type** and **Region** (Region maps to the corresponding PokeAPI *generation*).
> - Progressive loading with a **Load more** button for large result sets.

---

## ✨ Features

- 🎯 **Instant search** (300ms debounce) across name / number
- 🧩 **Filters by Type & Region** (Region → Generation I–IX)
- 🖼️ Official artwork + sprites, flavor text, base stats, height/weight, abilities
- 📦 **Caching** (in‑memory) + **request cancellation** via `AbortController`
- 📱 Responsive layout, keyboard‑and‑screen‑reader friendly
- ⚡ **Vite** dev server & **Tailwind v4** modern design tokens

---

## 🧰 Tech Stack

- **React** (Vite)
- **Tailwind CSS v4** using the `@tailwindcss/postcss` plugin
- **PokeAPI** endpoints:
  - `GET /api/v2/pokemon?limit=151` – initial list
  - `GET /api/v2/pokemon/{name or id}` – details & sprites
  - `GET /api/v2/type/{type}` – names by type
  - `GET /api/v2/generation/{generation-id}` – names by region (via generation)
  - `GET /api/v2/pokemon-species/{id}` – flavor text, genus, generation

---

## 🚦 Prerequisites

- **Node.js 18+** and **npm**

---

## 🏁 Quick Start

Clone and install dependencies:
```bash
git clone <your-repo-url> pokedex
cd pokedex
npm i
```

Run the dev server:
```bash
npm run dev
```

Open the app at the URL printed in your terminal (usually `http://localhost:5173`).

---

## 🧩 Project Structure

```
pokedex/
├─ postcss.config.mjs        # PostCSS with @tailwindcss/postcss
├─ index.html
├─ src/
│  ├─ App.jsx                # Main Pokédex component & UI
│  ├─ index.css              # Tailwind v4 import + design tokens
│  └─ main.jsx               # React bootstrap (imports index.css)
└─ package.json
```

## 🔎 How Search Works

- On mount, the app fetches and caches the **original 151 names**.
- When users type or change filters, a **debounced** search runs:
  1. Build a candidate list from **Type** and/or **Region** (via Generation).
  2. If no filters are active, fall back to the **first 151**.
  3. Filter by the typed **name** (case‑insensitive). If the query is **numeric** and no filters are set, fetch that **exact Pokémon**.
  4. Fetch details **in batches** (8 at a time) to keep the UI snappy.
- All detail requests are cached; inflight requests are **aborted** when new searches start.

---

## 🧪 Scripts

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```
## 🧱 Accessibility & UX

- Logical heading order and focus rings for keyboard navigation
- Sufficient color contrast in both light/dark
- `aria-hidden` on purely decorative SVG
- Graceful “Loading…” and error states

---

## ⚠️ Notes & Limits

- PokeAPI rate limits apply; batching and debouncing reduce request pressure.
- Species flavor text can include special characters—cleaning is handled in code.
- This is a **fan project** and is **not** affiliated with Nintendo, Game Freak, or The Pokémon Company.

---

## 🙏 Acknowledgements

- Data from the amazing **[PokeAPI](https://pokeapi.co/)** community project.
- Pokémon and Pokémon character names are trademarks of **Nintendo**, **Game Freak**, and **The Pokémon Company**.

---

## 📄 License

MIT © liam
