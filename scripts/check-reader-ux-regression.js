#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { check } = require('./check-reader-ux');

const root = process.cwd();
const fixture = path.join(root, `.reader-ux-regression-base-${process.pid}`);
const casePrefix = path.join(root, `.reader-ux-regression-case-${process.pid}-`);
const required = [
  'book-config.json', 'package.json', 'src', 'docs', 'assets', 'templates', '.github/workflows/book-qa.yml', 'scripts/build-simple.js', 'scripts/check-reader-ux.js', 'scripts/check-reader-ux-regression.js',
];
const cases = [
  ['flag', (dir) => mutate(dir, 'book-config.json', (text) => text.replace('"troubleshootingFlow": true', '"troubleshootingFlow": false'))],
  ['route', (dir) => fs.rmSync(path.join(dir, 'src/appendices/troubleshooting'), { recursive: true, force: true })],
  ['quickstart-source', (dir) => fs.rmSync(path.join(dir, 'src/introduction/quickstart.md'), { force: true })],
  ['chapter-4-source-drift', (dir) => mutate(dir, 'src/chapters/chapter-04-ai-testing-strategy.md', (text) => text.replace('この章の学習目標', 'drifted learning goals'))],
  ['preserved-public-section', (dir) => {
    for (const relative of ['src/chapters/chapter-01-ai-driven-development.md', 'docs/chapters/chapter-01-ai-driven-development.md']) {
      mutate(dir, relative, (text) => text.replace('## この章のまとめとチェックリスト', '## synchronized deletion fixture'));
    }
  }],
  ['nav', (dir) => mutate(dir, 'docs/_data/navigation.yml', (text) => text.replace('path: /appendices/figure-index/', 'path: /appendices/missing/'))],
  ['afterword-nav', (dir) => {
    for (const relative of ['src/navigation.yml', 'docs/_data/navigation.yml']) {
      mutate(dir, relative, (text) => text.replace('afterword:\n- title: あとがき\n  path: /afterword/\n', ''));
    }
  }],
  ['reference', (dir) => mutate(dir, 'src/chapters/chapter-01-ai-driven-development.md', (text) => text.replace('/assets/images/diagrams/ai-human-code-comparison.svg', '/assets/images/diagrams/missing.svg'))],
  ['anchor', (dir) => mutate(dir, 'src/chapters/chapter-02-software-testing-fundamentals.md', (text) => text.replace('figure-ai-testing-pyramid', 'figure-missing'))],
  ['index', (dir) => mutate(dir, 'src/appendices/figure-index/index.md', (text) => text.replace('../../chapters/chapter-07-quality-metrics-evaluation/#figure-quality-evaluation-framework', '../../chapters/chapter-09-case-studies/#wrong'))],
  ['asset', (dir) => fs.rmSync(path.join(dir, 'assets/images/diagrams/mlops-pipeline.svg'))],
  ['external-resource', (dir) => mutate(dir, 'assets/images/diagrams/ai-testing-lifecycle.svg', (text) => text.replace('</svg>', '<image href="https://example.invalid/external.svg" /></svg>'))],
  ['baseurl', (dir) => mutate(dir, 'src/appendices/figure-index/index.md', (text) => text.replace('../../chapters/chapter-01-ai-driven-development/#figure-ai-human-code-comparison', '/ai-testing-strategy-book/chapters/chapter-01-ai-driven-development/#figure-ai-human-code-comparison'))],
  ['duplicate-reference', (dir) => mutate(dir, 'src/chapters/chapter-03-ai-code-characteristics.md', (text) => text + '\n<img src="{{ \'/assets/images/diagrams/ai-testing-pyramid.svg\' | relative_url }}" alt="duplicate">\n')],
  ['asset-mirror', (dir) => mutate(dir, 'docs/assets/images/diagrams/quality-evaluation-framework.svg', (text) => text.replace('role="img"', 'role="presentation"'))],
  ['qa-wire', (dir) => mutate(dir, '.github/workflows/book-qa.yml', (text) => text.replaceAll('npm run check:reader-ux', 'npm run omitted-reader-ux'))],
  ['committed-jekyll', (dir) => mutate(dir, '.github/workflows/book-qa.yml', (text) => text.replace('destination: ./_site-committed', 'destination: ./_site-missing'))],
  ['committed-code-copy-smoke', (dir) => mutate(dir, '.github/workflows/book-qa.yml', (text) => text.replace('_site-committed/assets/js/code-copy-lightweight.js', '_site-committed/assets/js/missing.js'))],
  ['generated-sidebar-asset', (dir) => mutate(dir, 'scripts/build-simple.js', (text) => text.replace("'sidebar.js', ", ''))],
  ['generated-code-copy-asset', (dir) => mutate(dir, 'scripts/build-simple.js', (text) => text.replace(", 'code-copy-lightweight.js'", ''))],
  ['code-copy-button-type', (dir) => mutate(dir, 'templates/js/code-copy-lightweight.js', (text) => text.replace("copyButton.type = 'button';", ''))],
  ['generated-main-asset', (dir) => mutate(dir, 'scripts/build-simple.js', (text) => text.replace(", 'main.js'", ''))],
  ['generated-mermaid-asset', (dir) => mutate(dir, 'scripts/build-simple.js', (text) => text.replace(", 'mermaid-init.js'", ''))],
  ['mermaid-integrity', (dir) => mutate(dir, 'templates/layouts/book.html', (text) => text.replace('sha384-+NGfjU8KzpDLXRHduEqW+ZiJr2rIg+cidUVk7B51R5xK7cHwMKQfrdFwGdrq1Bcz', 'sha384-regression'))],
  ['mermaid-security-level', (dir) => mutate(dir, 'templates/js/mermaid-init.js', (text) => text.replace("securityLevel: 'strict'", "securityLevel: 'loose'"))],
  ['strict-mermaid-html-break', (dir) => {
    for (const relative of ['src/chapters/chapter-04-ai-testing-strategy.md', 'docs/chapters/chapter-04-ai-testing-strategy.md']) {
      mutate(dir, relative, (text) => text.replace('リスク評価\n・機能複雑さ', 'リスク評価<br/>・機能複雑さ'));
    }
  }],
  ['figure-caption-binding', (dir) => mutate(dir, 'src/chapters/chapter-06-test-automation-ai-cooperation.md', (text) => text.replace(/(<img[^>]*mlops-pipeline\.svg[^>]*alt=")[^"]+"/, '$1"'))],
  ['troubleshooting-mirror', (dir) => mutate(dir, 'docs/appendices/troubleshooting/index.md', (text) => text.replace('## 安全な切り分けフロー', '## drifted flow'))],
  ['config-mirror', (dir) => mutate(dir, 'docs/_config.yml', (text) => text.replace('title:', 'drifted_title:'))],
  ['relative-external-resource', (dir) => mutate(dir, 'assets/images/diagrams/ai-human-code-comparison.svg', (text) => text.replace('</svg>', '<image href="tracker.png" /></svg>'))],
  ['svg-root', (dir) => mutate(dir, 'assets/images/diagrams/ai-testing-pyramid.svg', (text) => text.replace('<svg ', '<title id="outside">outside</title>\n<svg '))],
  ['legacy-chapter-route', (dir) => {
    const file = path.join(dir, 'docs/chapters/chapter-01-ai-driven-development/index.md');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '---\npublished: false\nlayout: book\ntitle: duplicate\n---\n\n# duplicate\n');
  }],
  ['anchor-distance', (dir) => mutate(dir, 'docs/chapters/chapter-01-ai-driven-development.md', (text) => text.replace(
    '<a id="figure-ai-human-code-comparison"></a>\n<figure',
    '<a id="figure-ai-human-code-comparison"></a>\n\nanchor must not drift from its target\n\n<figure',
  ))],
  ['opaque-markdown-include', (dir) => {
    const chapter = 'docs/chapters/chapter-04-ai-testing-strategy.md';
    const body = 'docs/_includes/regression-chapter-body.md';
    const content = fs.readFileSync(path.join(dir, chapter), 'utf8');
    fs.mkdirSync(path.dirname(path.join(dir, body)), { recursive: true });
    fs.writeFileSync(path.join(dir, body), content);
    fs.writeFileSync(path.join(dir, chapter), '---\nlayout: book\ntitle: regression\n---\n\n{% include regression-chapter-body.md %}\n');
  }],
];
function mutate(dir, relative, transform) {
  const file = path.join(dir, relative);
  fs.writeFileSync(file, transform(fs.readFileSync(file, 'utf8')));
}
function copy(relative) {
  const from = path.join(root, relative);
  const to = path.join(fixture, relative);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}
try {
  for (const relative of required) copy(relative);
  let rejected = 0;
  for (const [name, apply] of cases) {
    const testCase = `${casePrefix}${name}`;
    fs.cpSync(fixture, testCase, { recursive: true });
    apply(testCase);
    try {
      check(testCase);
      throw new Error(`negative case unexpectedly passed: ${name}`);
    } catch (error) {
      if (error.message.startsWith('negative case unexpectedly passed')) throw error;
      rejected += 1;
    } finally {
      fs.rmSync(testCase, { recursive: true, force: true });
    }
  }
  console.log(`Reader UX negative regression passed: ${rejected}/${cases.length}.`);
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
