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
