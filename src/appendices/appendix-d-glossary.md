# 付録D 用語集

## 用語集の重要性

AI主導開発時代において、技術用語は急速に増加し、既存用語も新たな意味を持つようになっている。本用語集は、AI関連、テスト関連、品質管理関連の重要用語を整理し、読者の理解を支援する。各用語には、技術的定義に加えて、実務での意味や関連概念も含めている。

## AI関連用語

### A-G

**Adversarial Testing（敵対的テスト）**
- 定義：AIモデルを意図的に誤動作させる入力を用いてロバスト性を評価するテスト手法
- 実務での意味：セキュリティ脆弱性の発見、モデルの限界把握
- 関連：Adversarial Examples、Robustness Testing

**Bias（バイアス）**
- 定義：AIモデルが特定のグループや結果に対して示す系統的な偏り
- 実務での意味：公平性の欠如、差別的な判断の原因
- 関連：Fairness、Discrimination、Data Bias

**Confidence Score（信頼度スコア）**
- 定義：AIモデルが出力に対して持つ確信の度合いを示す数値
- 実務での意味：予測の信頼性評価、閾値設定の基準
- 関連：Uncertainty、Calibration、Threshold

**Data Drift（データドリフト）**
- 定義：時間経過に伴う入力データの統計的性質の変化
- 実務での意味：モデル性能劣化の主要因、再学習の必要性指標
- 関連：Concept Drift、Model Decay、Distribution Shift

**Embeddings（埋め込み）**
- 定義：高次元データを低次元の密ベクトル空間に変換した表現
- 実務での意味：意味的類似性の計算基盤、検索システムの要
- 関連：Vector Database、Semantic Search、Representation Learning

**Fine-tuning（ファインチューニング）**
- 定義：事前学習済みモデルを特定タスク向けに追加学習する手法
- 実務での意味：ドメイン特化モデルの作成、効率的なカスタマイズ
- 関連：Transfer Learning、Domain Adaptation、Few-shot Learning

**Generative AI（生成AI）**
- 定義：新しいコンテンツ（テキスト、画像、コード等）を生成するAI技術
- 実務での意味：コンテンツ作成の自動化、創造的タスクの支援
- 関連：LLM、Diffusion Models、GANs

### H-M

**Hallucination（幻覚）**
- 定義：AIが事実に基づかない、もっともらしい情報を生成する現象
- 実務での意味：信頼性の問題、ファクトチェックの必要性
- 関連：Factuality、Grounding、Truthfulness

**Inference（推論）**
- 定義：学習済みモデルを使用して新しい入力に対する予測を行うプロセス
- 実務での意味：本番環境での実行、レスポンスタイムの考慮
- 関連：Prediction、Deployment、Serving

**LLM（Large Language Model）**
- 定義：大規模なテキストデータで学習された言語理解・生成モデル
- 実務での意味：コード生成、文書作成、対話システムの基盤
- 関連：GPT、Transformer、Pre-training

**Model Interpretability（モデル解釈可能性）**
- 定義：AIモデルの判断プロセスを人間が理解できる形で説明する能力
- 実務での意味：規制対応、信頼構築、デバッグの基盤
- 関連：Explainable AI（XAI）、LIME、SHAP

### N-R

**Prompt Engineering（プロンプトエンジニアリング）**
- 定義：AIモデルから望ましい出力を得るための入力設計技術
- 実務での意味：生成品質の制御、タスク特化の最適化
- 関連：Few-shot Learning、In-context Learning、Chain of Thought

**RAG（Retrieval-Augmented Generation）**
- 定義：外部知識を検索して参照しながら生成を行う手法
- 実務での意味：最新情報の反映、幻覚の抑制、知識の更新
- 関連：Vector Search、Knowledge Base、Hybrid Systems

**Reinforcement Learning from Human Feedback（RLHF）**
- 定義：人間のフィードバックを用いてモデルを改善する学習手法
- 実務での意味：品質向上、ユーザー期待との整合性確保
- 関連：Preference Learning、Reward Model、Alignment

### S-Z

**Temperature（温度パラメータ）**
- 定義：生成AIの出力の多様性を制御するパラメータ
- 実務での意味：創造性と一貫性のバランス調整
- 関連：Sampling、Randomness、Determinism

**Token（トークン）**
- 定義：テキストを処理する際の基本単位（単語、サブワード、文字）
- 実務での意味：コスト計算の基準、入力長制限の単位
- 関連：Tokenization、Context Window、Token Limit

**Vector Database（ベクトルデータベース）**
- 定義：高次元ベクトルの効率的な保存と類似検索を行うデータベース
- 実務での意味：セマンティック検索、RAGシステムの基盤
- 関連：Embeddings、Similarity Search、Index

## テスト関連用語

### A-E

**Acceptance Criteria（受入基準）**
- 定義：機能が完成したとみなすための条件セット
- 実務での意味：開発完了の判断基準、品質ゲートの定義
- 関連：Definition of Done、User Story、Requirements

**Boundary Value Analysis（境界値分析）**
- 定義：入力範囲の境界付近の値でテストする技法
- 実務での意味：効率的な欠陥発見、エッジケースの網羅
- 関連：Equivalence Partitioning、Edge Cases、Domain Testing

**Code Coverage（コードカバレッジ）**
- 定義：テストによって実行されたコードの割合
- 実務での意味：テストの網羅性指標、品質の定量評価
- 関連：Branch Coverage、Statement Coverage、MC/DC

**Continuous Testing（継続的テスト）**
- 定義：開発プロセス全体を通じて自動的にテストを実行する実践
- 実務での意味：早期欠陥発見、迅速なフィードバック
- 関連：CI/CD、DevOps、Shift-Left Testing

**Exploratory Testing（探索的テスト）**
- 定義：事前の詳細な計画なしに、学習しながら実施するテスト
- 実務での意味：予期せぬ問題の発見、創造的な品質保証
- 関連：Ad-hoc Testing、Session-based Testing、Charter

### F-M

**Fuzz Testing（ファズテスト）**
- 定義：ランダムまたは異常な入力でシステムを攻撃するテスト
- 実務での意味：セキュリティ脆弱性の発見、堅牢性の確認
- 関連：Random Testing、Security Testing、Chaos Engineering

**Integration Testing（結合テスト）**
- 定義：複数のコンポーネントが正しく連携することを確認するテスト
- 実務での意味：インターフェース検証、システム間連携の確認
- 関連：Component Testing、System Testing、Interface Testing

**Mock Object（モックオブジェクト）**
- 定義：テスト用に作成された、実オブジェクトの代替実装
- 実務での意味：依存関係の分離、単体テストの独立性確保
- 関連：Stub、Test Double、Dependency Injection

**Mutation Testing（変異テスト）**
- 定義：コードに意図的な変更を加えてテストの有効性を評価する手法
- 実務での意味：テストスイートの品質評価、見逃しの発見
- 関連：Test Effectiveness、Fault Injection、Test Quality

### N-S

**Non-functional Testing（非機能テスト）**
- 定義：性能、セキュリティ、使用性などの品質特性を評価するテスト
- 実務での意味：ユーザー体験の保証、運用品質の確認
- 関連：Performance Testing、Security Testing、Usability Testing

**Property-based Testing（プロパティベーステスト）**
- 定義：入力の性質と期待される出力の関係を定義してテストする手法
- 実務での意味：網羅的なテスト、予期せぬエッジケースの発見
- 関連：Generative Testing、QuickCheck、Hypothesis

**Regression Testing（回帰テスト）**
- 定義：変更により既存機能が影響を受けていないことを確認するテスト
- 実務での意味：品質維持、意図しない副作用の防止
- 関連：Test Automation、Continuous Integration、Change Impact

**Smoke Testing（スモークテスト）**
- 定義：システムの基本的な機能が動作することを確認する簡易テスト
- 実務での意味：ビルドの健全性確認、詳細テストの前提確認
- 関連：Sanity Testing、Build Verification、Health Check

### T-Z

**Test-Driven Development（TDD）**
- 定義：テストを先に書いてから実装を行う開発手法
- 実務での意味：設計品質の向上、欠陥の予防
- 関連：Red-Green-Refactor、BDD、ATDD

**Test Oracle（テストオラクル）**
- 定義：テスト結果の正しさを判定するための基準やメカニズム
- 実務での意味：自動判定の基盤、期待値の定義方法
- 関連：Expected Results、Assertion、Verification

**White-box Testing（ホワイトボックステスト）**
- 定義：内部構造を理解した上で行うテスト
- 実務での意味：網羅的な経路テスト、複雑なロジックの検証
- 関連：Structural Testing、Code-based Testing、Glass-box Testing

## 品質管理用語

### A-D

**Defect Density（欠陥密度）**
- 定義：コード量あたりの欠陥数（通常は欠陥数/KLOC）
- 実務での意味：品質の定量指標、モジュール間比較の基準
- 関連：Quality Metrics、Bug Rate、Code Quality

**DORA Metrics（DORAメトリクス）**
- 定義：ソフトウェアデリバリーのパフォーマンスを測る4つの指標
- 実務での意味：組織の成熟度評価、改善領域の特定
- 関連：Deployment Frequency、Lead Time、MTTR、Change Failure Rate

### M-R

**Mean Time To Recovery（MTTR）**
- 定義：障害発生から復旧までの平均時間
- 実務での意味：システムの復旧能力、運用品質の指標
- 関連：Reliability、Availability、Incident Management

**Quality Assurance（品質保証）**
- 定義：品質目標を達成するためのプロセスと活動の体系
- 実務での意味：予防的アプローチ、プロセス改善の基盤
- 関連：Quality Control、Process Improvement、Standards

**Risk-based Testing（リスクベーステスト）**
- 定義：リスクの大きさに基づいてテストの優先順位を決定する手法
- 実務での意味：限られたリソースの効果的配分、重要領域への集中
- 関連：Risk Assessment、Priority、Test Strategy

### S-Z

**Service Level Objective（SLO）**
- 定義：サービスの品質目標を定量的に定義したもの
- 実務での意味：品質の約束、モニタリングの基準
- 関連：SLA、SLI、Error Budget

**Technical Debt（技術的負債）**
- 定義：短期的な解決策により蓄積される、将来の開発コスト
- 実務での意味：保守性の低下、リファクタリングの必要性
- 関連：Code Smell、Refactoring、Maintainability

**Zero Defect（ゼロディフェクト）**
- 定義：欠陥をゼロにすることを目指す品質管理の理念
- 実務での意味：品質文化の醸成、継続的改善の動機付け
- 関連：Quality Culture、Continuous Improvement、Prevention

## 用語集の活用方法

本用語集は以下の方法で活用することを推奨する：

1. **学習ツール**: 新しい概念を学ぶ際の参考資料
2. **コミュニケーション**: チーム内での共通言語の確立
3. **オンボーディング**: 新規メンバーの教育資料
4. **レファレンス**: 実務での迅速な確認

技術は日々進化しており、新しい用語が生まれ、既存用語の意味も変化する。本用語集を起点として、組織独自の用語集を作成・維持することを推奨する。