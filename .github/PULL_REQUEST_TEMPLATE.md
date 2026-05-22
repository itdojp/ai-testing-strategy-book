## 概要（必須）

- 変更内容:

## 影響範囲（必須）

- 対象章/ページ（例: /path/to/page/）:
- 影響（例: 追記 / 構成変更 / リンク修正 / 図表修正）:

## QA（必須）

- [ ] Book QA（Unicode / textlint(PRH) / 内部リンク・アンカー / Jekyll build / built-site smoke）: PASS
  - 実行URL: （GitHub Actions の workflow run URL）
- [ ] Current-run command / eval / benchmark evidence を記録した
  - `TODO: npm install --no-optional --no-audit --no-fund`
  - `TODO: npm run lint:light`
  - `TODO: npm run build`
  - `TODO: npm run check-links`
  - `TODO: 追加の eval / benchmark / smoke / 省略理由`

## AI / 外部サービス投入境界

- [ ] Issue / PR / log / eval case / golden dataset に秘密情報、個人情報、未公開仕様、脆弱性詳細が含まれる場合は分類・redaction・承認を記録した
- [ ] model / API / SDK / runtime / tool の時点依存情報は確認日と source を PR body に残した

## Review Completion Gate

- [ ] GitHub Copilot review を依頼した
- [ ] review 本文、inline comment、suggestion を全件確認した
- [ ] 必要な修正、または対応不要理由を PR 上で返信した
- [ ] 未解決 review thread が 0 件である
- [ ] CI green を確認した

## Pages確認（原則必須）

- 確認URL: https://itdojp.github.io/ai-testing-strategy-book/ （fork/rename の場合は適宜読み替え）
- [ ] トップページ HTTP 200
- [ ] 主要導線（navigation.yml 相当）で 404 が無い
- [ ] 表示崩れが無い（図表/表/コード中心）

## 補足

- 既知の制約 / TODO:
