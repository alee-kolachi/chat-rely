# Support-Agent Monorepo

This repository uses a split-service monorepo layout:

- `app/`: Next.js frontend
- `backend/`: FastAPI backend
- `supabase/`: local Supabase config, migrations, and seed data

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

### Local Supabase (recommended for this repo)

1. From the repo root: `supabase start` (Docker required).
2. **Frontend** (`app/.env.local`): set `NEXT_PUBLIC_SUPABASE_URL` to `http://127.0.0.1:54321` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the **anon key** from `supabase status` (defaults in `.env.example` match the usual local demo key).
3. **Backend** (`backend/.env`): keep `SUPABASE_JWKS_URL` / `SUPABASE_ISSUER` on `http://127.0.0.1:54321/auth/v1` as in `.env.example`, and `DATABASE_URL` on port **54322** (local Postgres).
4. In the browser, **sign out** or clear site data for `localhost` if you previously used hosted Supabase—otherwise cookies still send **cloud** JWTs and the API will reject them (JWKS `kid` mismatch).

If signup returns **“Database error finding user”**, restart the stack after config changes (`supabase stop && supabase start`), use the same host for the app as in `supabase/config.toml` `site_url` (defaults to `http://localhost:3000`), and check `supabase logs auth --local` for the underlying Postgres error. A stale or broken local DB is often fixed with `supabase db reset` (wipes local data).
