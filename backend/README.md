# ChatRely Backend

FastAPI platform foundation for ChatRely.

## Run

```bash
uv run uvicorn app.main:create_app --factory --reload
```

## Quality checks

```bash
uv run ruff check .
uv run mypy src
uv run pytest
```
