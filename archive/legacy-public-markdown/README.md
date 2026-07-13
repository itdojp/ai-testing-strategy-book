# 旧公開Markdownの保管

このディレクトリは、`docs/` 内で同一のpretty permalinkを生成していた旧sibling/nestedページと、平坦化前のMarkdown include本文を保管する。

- GitHub Pagesの公開元ではない。
- 現行の正本は `src/`、生成済み公開本文は `docs/` にある。
- 旧ファイルは履歴調査用であり、現行本文の編集先として使用しない。
- `npm run build` はこのディレクトリを入力にしない。

これにより、公開routeの競合とopaque includeを解消しながら、移行前の原稿をリポジトリ内で参照できる。
