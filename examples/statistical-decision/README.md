# Statistical decision contract

Issue #194 のeffect-size-first release decisionを実行する最小参照実装です。`cases.json`は、分析前に次を固定します。

- analysis unit: `pull_request`
- design: independent two-group Welch comparison
- minimum sample: 各group 30（このfixture専用の例であり、普遍的推奨値ではない）
- practical threshold: review reworkを0.5分以上改善
- 95% confidence interval
- p-value: `auxiliary_only`
- multiple testing: 事前登録した3つのrelease primary metric familyへHolm法
- repeated looks: fixed horizon、1回

実務のminimum sampleは、analysis unit、依存・cluster構造、baseline variance、最小検出効果、power、欠測を基に分析前に決めます。この例はsummary statisticsからWelchの差の区間、raw effect、Hedges' g、両側p-valueを計算します。raw observation、外れ値、分布、cluster、paired/repeated structureは検証できないため、実運用では設計に適した統計libraryとreviewを使用してください。

## 実行

Python 3.11 以降で、リポジトリルートから実行します。追加dependencyはありません。

```bash
python3 examples/statistical-decision/checker.py
python3 examples/statistical-decision/checker.py --self-test
```

positive fixtureは次を証明します。

- no-effect: `no_practical_improvement`
- small-but-statistically-significant: p-valueが0.05未満でもthreshold未達のため`no_practical_improvement`
- threshold-crossing-interval: raw effectはthreshold以上でも95% CIがthresholdを跨ぐため`inconclusive`
- large-effect: 95% CIの下限がpractical threshold以上のため`practical_improvement`

4つのsynthetic caseは同じ実験の4 metricではなく、decision branchを示す別scenarioです。別のworked exampleでは、事前登録した3 metricのraw p-value `0.01 / 0.03 / 0.04`へHolm法を適用し、adjusted p-value `0.03 / 0.06 / 0.06`を確認します。adjusted p-valueもrelease decisionには使いません。

repeated looksは、positive fixtureではfixed horizonの1回に限定し、self-testで「fixed horizonのまま2回見る」policyと未実装の`alpha_spending` / `always_valid`指定を拒否します。sequential計算は実装していません。途中判定が必要な実務分析では、検証済み統計libraryと事前reviewを使用します。

`--self-test`は、p-value単独gate、analysis unit欠落、practical threshold欠落、multiple-testing計画欠落、不正なrepeated look、観測後のthreshold固定、minimum sample不足をfail-closedにします。NISTのStudent-t表にある7つのcritical valueと計算結果を小数第3位で照合し、Chapter 7 / Appendix Bのcanonical `src`と公開`docs`の同期、p-value単独判定の再混入も検査します。

decisionはsample gate、raw effect、confidence interval、practical thresholdだけで決まり、p-valueを参照しません。p-valueはdiagnosticと監査用の補助出力です。
