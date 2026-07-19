# 付録C ツール比較表

## ツール選定の目的

AI 支援開発では、製品名を先に決めるのではなく、品質リスクと検証可能性から選定条件を定義する。機能、対応言語、提供形態、価格、データ処理条件は変化するため、本付録は固定的な機能ランキングを提供しない。公式情報を再確認するための候補一覧と、比較結果を再現できる評価契約を示す。

<!-- freshness-claim: appendix-tool-candidate-catalog -->
> **候補一覧の確認記録**
>
> 確認日: 2026-07-19（Asia/Tokyo）
>
> 対象 profile: `Tool candidate catalog（official product documentation）`
>
> 区分: 確認日時点の候補 snapshot。製品の存続、機能、価格、利用条件を保証するものではない。導入判断では、各行の公式情報を再確認する。

## C.1 AI コーディング支援

### 候補と比較観点

| 候補（公式情報） | 比較時に確認する項目 | 最小の実証 |
|---|---|---|
| [GitHub Copilot](https://docs.github.com/copilot) | 対応環境、データ利用、組織ポリシー、監査、契約プラン | 同じ repository・task・quality gate で支援あり／なしを比較する |
| [Amazon Q Developer](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/what-is.html) | AWS 連携の必要性、対応環境、security scan、データ境界 | 実際の IAM・network 制約下で代表 task を実行する |
| [Cursor](https://docs.cursor.com/) | editor 移行、repository context、privacy mode、組織管理 | 機密区分別に送信される context と保持設定を確認する |
| [Tabnine](https://docs.tabnine.com/) | deployment 方式、対応環境、model/data policy、管理機能 | 採用予定の deployment profile で応答と監査証跡を確認する |
| [Windsurf](https://docs.windsurf.com/) | editor/extension、context 取得範囲、組織ポリシー、契約条件 | sandbox repository で権限と context boundary を確認する |

ここで比較するのは marketing 上の機能数ではない。次の証跡を同じ条件で残せるかを確認する。

1. 入力した task、許可した context、使用した model/runtime profile
2. 生成差分、test 結果、review 指摘、再作業時間
3. 外部送信、保持、学習利用、管理者設定の確認結果
4. 障害時の停止、fallback、監査ログ、契約終了時のデータ処理

## C.2 テスト自動化

### 候補と比較観点

| 候補（公式情報） | 主な評価対象 | 比較時に固定する条件 |
|---|---|---|
| [Selenium](https://www.selenium.dev/documentation/) | WebDriver を用いる browser automation | browser/driver、language binding、grid、timeout、retry |
| [Cypress](https://docs.cypress.io/) | Web application の end-to-end / component test | runtime、browser、test isolation、CI resource、artifact |
| [Playwright](https://playwright.dev/docs/intro) | Chromium / Firefox / WebKit を対象にする end-to-end test | package version、browser binary、OS image、project、trace policy |
| [Appium](https://appium.io/docs/en/latest/) | mobile application automation | server/driver/plugin、device/OS、app build、capability |

### 選定ルール

- **再現性**: package lock、browser/device、OS image、locale、timezone を固定できるか。
- **観測性**: failure 時に log、trace、screenshot、network evidence を残せるか。
- **機密性**: artifact に token、個人情報、画面入力が含まれる前提で redaction と保持期限を設定できるか。
- **保守性**: selector や fixture の責任範囲を分離し、flaky test を成功扱いにしないか。
- **CI 適合性**: retry や並列度を増やす前に、failure classification と resource 上限を定義できるか。

## C.3 品質分析・運用観測

### 候補と比較観点

| 候補（公式情報） | 主な評価対象 | 導入前に確認する境界 |
|---|---|---|
| [SonarQube Server](https://docs.sonarsource.com/sonarqube-server/) | 静的解析と quality gate | 対象言語、rule profile、false positive、edition、CI integration |
| [Sentry](https://docs.sentry.io/) | application error と performance evidence | event filtering、PII、source map、sampling、retention |
| [OpenTelemetry](https://opentelemetry.io/docs/) | vendor-neutral な telemetry 生成・伝送 | signal、semantic convention、collector、exporter、sampling |

ツールが示す数値は、そのまま品質目標にしない。収集対象、除外条件、sampling、集計期間、owner、意思決定との対応を先に定義する。導入前後の比較では同じ定義を使い、定義変更時は時系列を分離する。

## C.4 再現可能な実行・評価 profile

### 公式情報確認メモ

次の4項目は、本書の例を再現するときに変化しやすい前提である。snapshot と運用時の推奨を混同しないよう、確認日と対象 profile を記録する。

<!-- freshness-claim: appendix-node-runtime-profile -->
### Node.js

- **確認日**: 2026-07-19（Asia/Tokyo）
- **対象 profile**: `Node.js 24.x（book CI baseline）`
- **本書での扱い**: 本 repository の active CI 例は Node.js 24 を基準にする。Node.js の Current / LTS / EOL 状態は固定値として転記せず、実行時に公式一覧で確認する。
- **一次 source**: [Node.js — Previous Releases](https://nodejs.org/en/about/previous-releases)
- **更新契約**: CI runtime を変える場合は、package engine、lockfile、example test、Pages build を同じ PR で検証する。

<!-- freshness-claim: appendix-playwright-profile -->
### Playwright

- **確認日**: 2026-07-19（Asia/Tokyo）
- **対象 profile**: `Playwright official documentation（versionless live documentation）`
- **本書での扱い**: Chromium / Firefox / WebKit、auto-waiting、test isolation、trace の設計原則を参照する。実プロジェクトでは package と browser binary を lockfile / install command で固定し、versionless な文書だけでは再現条件を満たしたことにしない。
- **一次 source**: [Installation](https://playwright.dev/docs/intro)、[Best Practices](https://playwright.dev/docs/best-practices)
- **更新契約**: version 更新時は browser matrix、trace の機密情報、retry、CI image を再検証する。

<!-- freshness-claim: appendix-github-actions-profile -->
### GitHub Actions

- **確認日**: 2026-07-19（Asia/Tokyo）
- **対象 profile**: `GitHub Actions workflow syntax（versionless hosted-service documentation）`
- **本書での扱い**: workflow は `.github/workflows` 配下の YAML で管理し、trigger、permissions、job、step を明示する。hosted service の event や syntax の全一覧を本文へ固定せず、実装時の公式 reference を正本とする。
- **一次 source**: [Workflow syntax for GitHub Actions](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions)
- **更新契約**: action version、runner image、token permissions、artifact retention を PR ごとに確認する。

<!-- freshness-claim: appendix-openai-evals-profile -->
### OpenAI evaluations

- **確認日**: 2026-07-19（Asia/Tokyo）
- **対象 profile**: `OpenAI Evals API guides（versionless live documentation）`
- **本書での扱い**: evaluation objective、dataset、grader、継続評価という設計原則を参照する。API、endpoint、product lifecycle は時間依存であるため、本文へ永続的な固定値として転記しない。
- **一次 source**: [Working with evals](https://developers.openai.com/api/docs/guides/evals)、[Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- **更新契約**: 実装前に lifecycle notice と API reference を確認し、model、API、SDK、dataset、grader、確認日を `model/runtime profile` に記録する。

## C.5 比較結果の記録 template

ツールごとに、少なくとも次を1行で記録する。確認できない項目は推測せず `未確認` とする。

| 項目 | 記録内容 |
|---|---|
| 目的 | 解決する品質リスクと、採用しない場合の代替策 |
| 確認日 | `YYYY-MM-DD` と timezone |
| 対象 version/profile | package、service plan、runtime、runner、browser/device |
| 一次 source | vendor の documentation / release / security / pricing page |
| 実証条件 | repository、task、dataset、quality gate、比較期間 |
| 結果 | pass/fail、効果量、再作業、false positive、未解決事項 |
| データ境界 | 送信、保存、学習利用、redaction、retention、削除 |
| owner / 再確認条件 | 更新担当、期限、version・契約・仕様変更 trigger |

## C.6 publication freshness gate

本Issueで監査対象とした Chapter 1 と Appendix C では、`content-freshness.json` を volatile claim の registry とし、`npm run check:freshness` を公開前 gate とする。対象 path は registry の `trackedPaths` に明示し、repository 全体を監視しているとは扱わない。別の章へ対象を広げる場合は、その章に残る一般用法と外部状態の claim を分類してから `trackedPaths` へ追加する。

1. `最新`、`現時点`、`current`、`latest` 等を使って外部状態を述べる場合は、claim marker、確認日、対象 version/profile、一次 source を registry と本文へ追加する。
2. historical snapshot は、対象年と「過去の観測であり運用時の値ではない」ことを明記する。
3. versionless な live documentation は、その旨を profile に書き、実装 version の代替にしない。
4. 運用時の推奨に分類した claim の確認期限超過、全 claim の未来日、非HTTPS source、source/docs marker drift は build failure とする。historical snapshot は過去の観測として保持し、確認期限では失効させない。
5. 価格、release status、対応範囲など公式ページが正本の値は、本文へ複製する必要がない限り durable link を示す。
6. `npm run check:freshness:remote` は公式 URL の到達確認を行う公開前の手動監査であり、外部サイト障害で通常 CI を不安定化させないため Book QA とは分離する。remote host と redirect 先は checker 内の固定 allowlist で制限する。

最適な組み合わせは、project、team、risk、budget によって異なる。比較表の候補数ではなく、同じ条件で再実行できる証跡と、運用中に撤退できる契約を選定基準にする。
