#!/usr/bin/env bash
# Run the outreach worker loop on your laptop (uses backend/ deps + DB).
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${DIR}/.." && pwd)"

if [[ ! -f "${DIR}/.env" ]]; then
  echo "Missing ${DIR}/.env — copy .env.example to .env and fill in values."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "${DIR}/.env"
set +a

export LOG_FILE_ENABLED="${LOG_FILE_ENABLED:-false}"
export LOG_PRETTY_FILE_ENABLED="${LOG_PRETTY_FILE_ENABLED:-false}"

cd "${REPO_ROOT}/backend"
exec uv run python "${DIR}/worker.py" "$@"
