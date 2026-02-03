---
layout: book
order: 1
title: "AI主導開発時代のソフトウェアテスト戦略"
author: "株式会社アイティードゥ"
version: "1.0.0"
permalink: /
---

# AI主導開発時代のソフトウェアテスト戦略

## 品質保証の新パラダイム

<div class="book-cover">
  <h2>AI生成コードに対応した実践的テスト手法</h2>
  <p class="author">ITDO Inc.</p>
</div>

## 概要

GitHub Copilot、ChatGPT、Claudeなど、AI支援ツールの急速な普及により、ソフトウェア開発の現場は大きく変わりました。開発者の生産性は飛躍的に向上しましたが、同時に新たな品質保証の課題も生まれています。

本書は、AI主導開発時代における品質保証の新しいパラダイムを提示し、実践的な解決策を提供します。

## 学習成果

- AI生成コードを前提とした開発プロセスにおいて、どこで・何を・どの粒度でテストすべきかを体系的に設計できるようになる。
- 従来のテスト技法とAI固有のリスク（ハルシネーション、データリークなど）を組み合わせて、現場に適したテスト戦略を説明・合意形成できるようになる。
- AI支援ツールやテスト自動化ツールの導入効果と限界を評価し、プロジェクトや組織の状況に応じた品質保証体制を設計できるようになる。
- テンプレート・チェックリスト・メトリクスを活用して、継続的に改善可能な品質保証プロセスを回せるようになる。

## 読み方ガイド

- **QAエンジニア・テストエンジニア**: 第1部〜第3部を通読し、第5章・第6章の実践技法と第7章のメトリクス設計を重点的に読むとよい。
- **開発チームリーダー・アーキテクト**: 第1章で背景を押さえたうえで、第4章（テスト戦略）と第8章（組織・プロセス変革）を中心に読み、必要に応じて他章を参照する読み方がおすすめである。
- **CTO・VP of Engineering などの経営層**: 第2部全体と第8章・第11章（将来展望）を軸に読み、組織レベルでの品質保証体制設計のヒントとして活用してほしい。
- **DevOpsエンジニア**: 第6章（テスト自動化とAIの協調）と第7章のメトリクス関連を軸に、第4章・第5章を組み合わせて読むと、CI/CD パイプライン設計と接続しやすい。

## クイックスタート（30〜60分）

まず手を動かして「テストをガードレールとして使う」体験をしたい場合は、[クイックスタート](introduction/quickstart/) を参照してください。

## 想定読者
- QAエンジニア/テストエンジニア（AI生成コードの品質保証を設計したい方）
- 開発チームリーダー/アーキテクト（チームのテスト戦略・ガードレールを整備したい方）
- DevOps/SRE（CI/CD に品質検証を組み込みたい方）
- CTO/VP of Engineering 等（組織レベルの品質保証体制を設計したい方）

## 前提知識
- ソフトウェアテストの基礎（単体/結合/E2E、テストピラミッド等の概念）
- Git と CI/CD の基本（PR運用、テスト自動化の位置づけ）
- （推奨）アプリケーションコードの読解経験（AI生成コードの検証で理解が進みやすい）
- （推奨）AI支援開発ツールの利用経験（Copilot/ChatGPT/Claude 等）

## 所要時間
- 通読: 約4〜6時間（本文量ベース概算。コードブロック除外、400〜600文字/分換算）
- 手法を自組織に適用してチェックリスト/メトリクスを整備する場合は、対象範囲により変動します。

## ライセンス
本書は CC BY-NC-SA 4.0 で公開されています。商用利用は別途契約が必要です。

## 目次

### [はじめに](introduction/preface/)

### 第1部：基礎編

- [第1章 AI主導開発の現状と課題](chapters/chapter-01-ai-driven-development/)
- [第2章 ソフトウェアテストの基礎知識](chapters/chapter-02-software-testing-fundamentals/)
- [第3章 AIコードの特性理解](chapters/chapter-03-ai-code-characteristics/)

### 第2部：戦略編

- [第4章 AI時代のテスト戦略](chapters/chapter-04-ai-testing-strategy/)
- [第5章 AIコード検証の実践技法](chapters/chapter-05-ai-code-verification/)
- [第6章 テスト自動化とAIの協調](chapters/chapter-06-test-automation-ai-cooperation/)

### 第3部：実践編

- [第7章 品質メトリクスと評価](chapters/chapter-07-quality-metrics-evaluation/)
- [第8章 組織とプロセスの変革](chapters/chapter-08-organization-process-transformation/)
- [第9章 ケーススタディ](chapters/chapter-09-case-studies/)

### 第4部：発展編

- [第10章 高度なトピック](chapters/chapter-10-advanced-topics/)
- [第11章 将来展望](chapters/chapter-11-future-outlook/)

### 付録

- [付録A テンプレート集](appendices/appendix-a-templates/)
- [付録B チェックリスト](appendices/appendix-b-checklists/)
- [付録C ツール比較表](appendices/appendix-c-tool-comparison/)
- [付録D 用語集](appendices/appendix-d-glossary/)

### [あとがき](afterword/)

## 本書の特徴

### 🎯 実践的なアプローチ
理論だけでなく、実際の現場で使える具体的な手法、テンプレート、チェックリストを豊富に収録

### 🔄 継続的な更新
AI技術の進歩に対応して、内容を継続的に更新。最新情報は[GitHubリポジトリ](https://github.com/itdojp/ai-testing-strategy-book)で公開

### 💡 ケーススタディ
実際のプロジェクトでの成功事例と失敗事例から学ぶ実践的な知見

### 🛠️ すぐに使えるツール
付録に収録されたテンプレートやチェックリストは、そのまま現場で活用可能

## フィードバック・お問い合わせ

- **GitHub Issues**: [https://github.com/itdojp/ai-testing-strategy-book/issues](https://github.com/itdojp/ai-testing-strategy-book/issues)
- **Email**: knowledge@itdo.jp
- **公式サイト**: [https://itdojp.github.io/ai-testing-strategy-book/](https://itdojp.github.io/ai-testing-strategy-book/)

---

© 2025 ITDO Inc. All Rights Reserved.
{% include page-navigation.html %}
