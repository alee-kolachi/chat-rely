# ChatRely Backend

FastAPI platform foundation for ChatRely.
 
## Run

```bash
uv run uvicorn app.main:create_app --factory --reload
```

Website crawls run in a separate worker (API reload does not pick up crawl changes):

```bash
uv run python -m app.workers.indexing_worker
```

## Quality checks

```bash
uv run ruff check .
uv run mypy src
uv run pytest
```
