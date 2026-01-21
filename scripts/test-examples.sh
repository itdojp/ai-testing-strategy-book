#!/usr/bin/env bash
set -euo pipefail

echo "[examples/python] install + test"
if [ -n "${VIRTUAL_ENV-}" ] || [ -n "${CI-}" ]; then
  python -m pip install -r examples/python/requirements.txt
else
  python -m pip install --user -r examples/python/requirements.txt
fi
( cd examples/python && python -m pytest -q --cov=discount --cov-report=term-missing --cov-fail-under=100 )

echo "[examples/node] install + lint + test"
npm ci --prefix examples/node
npm run lint --prefix examples/node
npm test --prefix examples/node
