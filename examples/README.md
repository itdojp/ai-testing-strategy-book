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

## 演習用（意図的に失敗する版）

以下のブランチには、典型的な不具合を *意図的に入れた* サンプルを置いています。

- `exercise/discount-rounding-bug-v1`: 割引計算の丸め処理が誤っており、テストが失敗する状態

### 使い方

```bash
git switch exercise/discount-rounding-bug-v1
npm run test:examples  # 失敗を確認
```

修正後に、以下が成功する状態を目標にします。

```bash
npm run test:examples
```

演習後は `main` に戻します。

```bash
git switch main
```
