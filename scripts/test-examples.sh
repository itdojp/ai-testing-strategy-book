#!/usr/bin/env bash
set -euo pipefail

echo "[examples/ai-safety] positive execution + fail-closed self-test"
python3 examples/ai-safety/checker.py
python3 examples/ai-safety/checker.py --self-test

echo "[examples/python] install + test"
if [ -n "${VIRTUAL_ENV-}" ] || [ -n "${CI-}" ]; then
  python3 -m pip install -r examples/python/requirements.txt
else
  python3 -m pip install --user -r examples/python/requirements.txt
fi
( cd examples/python && python3 -m pytest -q --cov=discount --cov-report=term-missing --cov-fail-under=100 )

echo "[examples/node] install + lint + test"
npm ci --prefix examples/node
npm run lint --prefix examples/node
npm test --prefix examples/node
