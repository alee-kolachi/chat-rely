# Support-Agent Monorepo

This repository uses a split-service monorepo layout:

- `app/`: Next.js frontend
- `backend/`: FastAPI backend
- `supabase/`: migrations + seed + optional **local** Supabase (`supabase start`)

## Canonical entrypoints

Use package/dependency commands inside each service directory, not at repo root.

### Frontend (`app/`)

```bash
cd app
npm install
npm run dev
```

### Backend (`backend/`)

```bash
cd backend
uv sync
uv run uvicorn app.main:create_app --factory --reload
```

## Environment setup

- Copy `app/.env.example` to `app/.env.local` and fill values.
- Copy `backend/.env.example` to `backend/.env` and fill values.

### Hosted Supabase (default)

Use this when you want **Google / email providers** configured in the cloud dashboard (local Studio does not mirror that UI).

1. **Frontend** (`app/.env.local`): `NEXT_PUBLIC_SUPABASE_URL` = Project URL; `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Dashboard → Project Settings → API**.
2. **Backend** (`backend/.env`): `SUPABASE_JWKS_URL` / `SUPABASE_ISSUER` = `https://<project-ref>.supabase.co/auth/v1/...` (same project as the app). `DATABASE_URL` = pooled or direct Postgres URI from **Dashboard → Settings → Database** (use `postgresql+asyncpg://…`).
3. **`DEV_AUTH_BYPASS_ENABLED=false`** in `backend/.env` when testing real logins (see `.env.example`).
4. Align **Site URL** and **Redirect URLs** under **Authentication → URL Configuration** with where you run Next (e.g. `http://localhost:3000`).

### Optional: local Supabase

For Docker-only DB/auth experiments: `supabase start`, then use the local URLs in the commented block at the bottom of each `.env.example`. OAuth providers there are configured in `supabase/config.toml`, not the hosted dashboard.

If signup/auth behaves oddly locally, check **`supabase logs auth --local`** or reset with **`supabase db reset`** (wipes local data).

## Background workers (production)

Run these as separate processes or services alongside the API:

- **Indexing** — `cd backend && uv run python -m app.workers.indexing_worker`  
  Processes queued knowledge indexing jobs (crawl, chunk, embed).

- **Maintenance** — `cd backend && uv run python -m app.workers.maintenance_worker`  
  Periodically closes idle conversations, backfills conversation outcomes, and refreshes usage snapshots for all workspaces.

## Embeddable widget script

1. `cd widget && npm install && npm run build`
2. Deploy `widget/dist/widget.js` to a CDN or copy it to **`app/public/widget.js`** in the Next app so it is served at `/widget.js`.
3. Optionally set **`NEXT_PUBLIC_WIDGET_SCRIPT_URL`** in `app/.env.local` to an absolute URL if the script is hosted elsewhere (see `app/.env.example`).

### ChatRely on your own app (product support widget)

Set **`NEXT_PUBLIC_CHATRELY_SITE_AGENT_KEY`** to a platform agent’s public embed key and seed knowledge with `backend/scripts/seed_platform_site_agent.py` (see `backend/README.md`). The widget appears on all app routes when that env var is set.
