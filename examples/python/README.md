# Python サンプル

## 目的

- 「最小のユニットテスト」「境界値テスト」を手元で再現できる状態にする。

## 実行

```bash
python -m pip install -r requirements.txt
python -m pytest -q --cov=discount --cov-report=term-missing --cov-fail-under=100
```
