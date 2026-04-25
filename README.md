# 🎂 Saanji's Creations

A full-stack vegan & eggless baking website with recipe scaling, a photo gallery, admin editing, and an AI-powered recipe autofill.

---

## Project Structure

```
saanjis-creations/
├── backend/
│   ├── server.js              # Express server entry point
│   ├── db.js                  # JSON flat-file database helper
│   ├── setup.js               # Seed script — run once to initialize data
│   ├── middleware/
│   │   ├── auth.js            # Admin session token middleware
│   │   └── upload.js          # Multer photo upload config
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/login|logout
│   │   ├── recipes.js         # GET/POST/PUT/DELETE /api/recipes
│   │   ├── creations.js       # GET/POST/PUT/DELETE /api/creations
│   │   └── autofill.js        # POST /api/autofill
│   └── scrapers/
│       ├── claude-scraper.js  # Anthropic API-based recipe extractor
│       └── web-scraper.js     # Cheerio-based recipe extractor (no API key)
├── frontend/
│   └── public/
│       ├── index.html         # Single-page app shell
│       ├── css/
│       │   └── main.css       # All styles
│       ├── js/
│       │   ├── data.js        # Static data (techniques, tips, products)
│       │   ├── api.js         # All fetch() calls to the backend
│       │   └── app.js         # Main application logic & rendering
│       └── uploads/
│           ├── recipes/       # Recipe photos (auto-created)
│           └── creations/     # Creation photos (auto-created)
├── data/
│   ├── recipes.json           # Recipe database (auto-created by setup.js)
│   └── creations.json         # Creations database (auto-created by setup.js)
├── .env.example               # Environment variable template
├── .gitignore
└── package.json
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set:
- `ADMIN_PASSWORD` — your admin password (default: `saanji2024`)
- `ANTHROPIC_API_KEY` — your key from [console.anthropic.com](https://console.anthropic.com) *(optional — only needed for Claude autofill)*
- `AUTOFILL_MODE` — `claude` or `scraper` (default: `claude`)

### 3. Seed the database

```bash
npm run setup
```

This creates `data/recipes.json`, `data/creations.json`, and the upload folders.

### 4. Start the server

```bash
# Development (auto-restarts on changes)
npm run dev

# Production
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## Admin Access

Click **Admin** in the top nav and enter your password (set in `.env`).

Once logged in, admin features appear:
- **Edit** and **Delete** buttons on every recipe and creation card
- **Add New Recipe** form at the bottom of the Recipes page (with URL autofill)
- **Add Creation** form at the bottom of the Creations page (with photo upload)

---

## Recipe Autofill

When adding a recipe, you can paste a URL and click **Autofill** to extract recipe details automatically. Two modes are available:

| Mode | How it works | Requires |
|------|-------------|----------|
| **Claude AI** | Sends the URL to the Anthropic API; Claude reads and structures the recipe | `ANTHROPIC_API_KEY` in `.env` |
| **Web Scraper** | Uses `cheerio` to parse the page's JSON-LD schema or HTML directly | Nothing — works offline |

Switch modes using the **Claude AI / Web Scraper** toggle in the Add Recipe form. If no API key is configured, the site automatically falls back to the web scraper.

The web scraper supports all sites using [schema.org/Recipe](https://schema.org/Recipe) JSON-LD, which includes:
- Minimalist Baker
- AllRecipes
- Food Network
- Serious Eats
- Sally's Baking Addiction
- King Arthur Baking
- Most WordPress sites using Tasty Recipes or WP Recipe Maker

---

## Features

### Recipe Book
- **Scale:** ¼×, ½×, 1×, 1½×, 2× with live recalculation
- **Auto unit conversion:** cups auto-convert to tbsp/tsp below ¼ cup
- **Grams toggle:** switch between standard and metric
- **Vinegar substitution:** all vinegar auto-labeled as lemon juice (1:1)
- **Technique links:** steps link to relevant technique pages
- **Notes:** per-recipe notes saved to localStorage
- **Sharing:** copy link, download PDF, share recipe-only or with photos
- **Favorites:** heart toggle, persisted to localStorage

### Creations Gallery
- Filter by event type (Birthday, Wedding, Graduation, Holiday)
- Base / Filling / Decorations fields per creation
- Favorites toggle (persisted locally + synced to backend)
- Photo upload with organized storage at `frontend/public/uploads/creations/`

### Admin
- Full CRUD on recipes and creations
- URL autofill with mode toggle (Claude AI vs Web Scraper)
- Photo upload with auto-organized folders
- Confirm-before-delete modal
- Session-based auth (token stored in `sessionStorage`, resets on tab close)

---

## Database

Data is stored as human-readable JSON files in `/data/`:

```
data/
├── recipes.json    # Array of recipe objects
└── creations.json  # Array of creation objects
```

These files are easy to inspect, edit by hand, and back up. Each record includes `createdAt` and `updatedAt` timestamps.

---

## Hosting on GitHub Pages

The backend requires Node.js, so GitHub Pages (static only) won't run the server. You have two options:

### Option A: Full stack on a server (recommended)

Deploy to any Node-compatible host:
- **Railway** — `railway up` (free tier available)
- **Render** — connect your repo, set `npm start` as the start command
- **Fly.io** — `fly launch`
- **VPS** (DigitalOcean, Linode) — run with `pm2 start backend/server.js`

Set your environment variables in the host's dashboard.

### Option B: Static-only GitHub Pages

If you want to host only the frontend on GitHub Pages (no admin, no uploads, no autofill):

1. Copy `frontend/public/` to a `docs/` folder in your repo
2. Replace all `fetch('/api/...')` calls in `api.js` with hardcoded data from `data/recipes.json`
3. Enable GitHub Pages in your repo Settings → Pages → Source: `docs/`

A helper script for this export is planned for a future version.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `ADMIN_PASSWORD` | `saanji2024` | Admin login password |
| `ANTHROPIC_API_KEY` | *(empty)* | Key for Claude autofill |
| `AUTOFILL_MODE` | `claude` | `claude` or `scraper` |
| `BASE_PATH` | *(empty)* | URL base path for subdirectory hosting |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | JSON flat files (no setup required) |
| File uploads | Multer |
| Web scraping | Cheerio |
| AI autofill | Anthropic API (claude-sonnet-4) |
| Frontend | Vanilla JS + HTML + CSS |
| Fonts | Cormorant Garamond + Jost (Google Fonts) |
