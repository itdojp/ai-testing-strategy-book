# examples/

本書の内容を「手元で動かして確認する」ための最小サンプルです。

## 構成

- `python/`: Python の最小サンプル（`pytest`）
- `node/`: Node.js の最小サンプル（`node:test`）

## まとめて実行（推奨）

リポジトリルートで次を実行します。

```bash
npm run test:examples
```

## 個別に実行

### Python

```bash
cd examples/python
python -m pip install -r requirements.txt
python -m pytest -q --cov=discount --cov-report=term-missing --cov-fail-under=100
```

### Node.js

```bash
cd examples/node
npm ci
npm run lint
npm test
```
