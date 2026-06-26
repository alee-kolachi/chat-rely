# Local demo outreach worker

Runs on your laptop only. Render runs **maintenance** + **indexing** workers; this process handles Google Sheets → demo provisioning.

Demo pages and chat stay on production (`/demo/{slug}`). This worker writes to the same Supabase DB.

## Setup (once)

```bash
cp -R outreach-local.example outreach-local
cp outreach-local/.env.example outreach-local/.env
# Edit outreach-local/.env (DATABASE_URL, OPENAI_API_KEY, Google Sheets vars)
chmod +x outreach-local/run.sh outreach-local/run-once.sh
cd backend && uv sync
```

`outreach-local/` is gitignored. Never commit `.env` or service account keys.

## Run

```bash
./outreach-local/run.sh          # loop (poll sheet + provision jobs)
./outreach-local/run-once.sh     # one tick, then exit
```

After setting a row to **Eligible for Demo = Yes**, run `run-once.sh` or wait for the next poll.

## Render workers (remote)

```bash
uv run python -m app.workers.maintenance_worker & \
uv run python -m app.workers.indexing_worker & \
wait
```

Do **not** run `outreach_worker` on Render.
