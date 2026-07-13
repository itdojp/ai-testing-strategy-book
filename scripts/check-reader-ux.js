#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const FIGURES = [
  ['ai-human-code-comparison', 'chapter-01-ai-driven-development', 'figure-ai-human-code-comparison'],
  ['ai-testing-pyramid', 'chapter-02-software-testing-fundamentals', 'figure-ai-testing-pyramid'],
  ['ai-testing-lifecycle', 'chapter-04-ai-testing-strategy', 'figure-ai-testing-lifecycle'],
  ['ai-test-workflow-architecture', 'chapter-06-test-automation-ai-cooperation', 'figure-ai-test-workflow-architecture'],
  ['mlops-pipeline', 'chapter-06-test-automation-ai-cooperation', 'figure-mlops-pipeline'],
  ['quality-evaluation-framework', 'chapter-07-quality-metrics-evaluation', 'figure-quality-evaluation-framework'],
];

// These markers identify public sections that existed before the source-first
// build was enabled. Exact source/docs parity alone cannot detect a synchronized
// deletion, so keep a small, explicit preservation contract for the migrated
// chapter summaries and the public appendix additions.
const PRESERVED_PUBLIC_SECTIONS = [
  ...[
    'chapter-01-ai-driven-development',
    'chapter-02-software-testing-fundamentals',
    'chapter-03-ai-code-characteristics',
    'chapter-05-ai-code-verification',
    'chapter-06-test-automation-ai-cooperation',
    'chapter-07-quality-metrics-evaluation',
    'chapter-08-organization-process-transformation',
    'chapter-09-case-studies',
    'chapter-10-advanced-topics',
    'chapter-11-future-outlook',
  ].map((chapter) => [`chapters/${chapter}.md`, ['## この章のまとめとチェックリスト']]),
  ['chapters/chapter-05-ai-code-verification.md', ['## ミニ演習（手を動かす）']],
  ['chapters/chapter-06-test-automation-ai-cooperation.md', ['## ミニ演習（手を動かす）']],
  ['chapters/chapter-10-advanced-topics.md', ['## 10.4 LLM内包機能のテスト戦略（非決定性への対応）']],
  ['appendices/appendix-a-templates.md', [
    '## A.0 ROI計算の例（例示値）',
    '## A.4 PR/CI 品質ゲートテンプレート（最小運用）',
  ]],
  ['appendices/appendix-b-checklists.md', ['## B.6 PR / CI / eval evidence チェックリスト']],
  ['appendices/appendix-c-tool-comparison.md', ['### 公式情報確認メモ']],
  ['appendices/appendix-d-glossary.md', ['**Benchmark（ベンチマーク）**']],
];

function fail(errors, message) {
  errors.push(message);
}

function read(root, relative, errors) {
  const file = path.join(root, relative);
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    fail(errors, `missing or unreadable ${relative}: ${error.code || error.message}`);
    return '';
  }
}

function exists(root, relative) {
  return fs.existsSync(path.join(root, relative));
}

function count(content, expression) {
  return (content.match(expression) || []).length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripFrontMatter(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n/, '');
}

function readPublishedChapter(root, chapter, errors) {
  const relative = `docs/chapters/${chapter}.md`;
  const content = read(root, relative, errors);
  if (/\{%\s*include\s+[^\s%]+\.md\s*%\}/.test(content)) {
    fail(errors, `${relative} must contain its deep-link anchors directly; Markdown includes are opaque to the pinned link checker`);
  }
  return content;
}

function listMarkdown(root, prefix) {
  const base = path.join(root, prefix);
  if (!fs.existsSync(base)) return [];
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  walk(base);
  return files.sort();
}

function validateManagedContentParity(root, config, errors) {
  const sections = (config?.contentSections || []).filter((section) => section.enabled).map((section) => section.directory);
  const sourceFiles = sections.flatMap((section) => listMarkdown(root, `src/${section}`));
  const docsFiles = sections.flatMap((section) => listMarkdown(root, `docs/${section}`));
  const sourceRelative = sourceFiles.map((file) => file.replace(/^src\//, ''));
  const docsRelative = docsFiles.map((file) => file.replace(/^docs\//, ''));
  if (sourceRelative.join('\n') !== docsRelative.join('\n')) {
    const missing = sourceRelative.filter((file) => !docsRelative.includes(file));
    const extra = docsRelative.filter((file) => !sourceRelative.includes(file));
    fail(errors, `managed source/docs Markdown inventory differs (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'})`);
  }
  for (const relative of sourceRelative) {
    if (!docsRelative.includes(relative)) continue;
    const source = read(root, `src/${relative}`, errors);
    const published = read(root, `docs/${relative}`, errors);
    if (/\{%\s*include\s+[^\s%]+\.md\s*%\}/.test(published)) {
      fail(errors, `docs/${relative} must contain reader content directly; Markdown includes are opaque to the pinned link checker`);
    }
    if (source !== stripFrontMatter(published)) {
      fail(errors, `managed source/docs reader content differs: ${relative}`);
    }
  }
  for (const section of sections) {
    const sectionRoot = path.join(root, 'docs', section);
    if (!fs.existsSync(sectionRoot)) continue;
    for (const entry of fs.readdirSync(sectionRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const sibling = `docs/${section}/${entry.name}.md`;
      const nested = `docs/${section}/${entry.name}/index.md`;
      if (exists(root, sibling) && exists(root, nested)) {
        fail(errors, `${nested} is a legacy duplicate route; ${sibling} is canonical`);
      }
    }
  }
}

function validatePreservedPublicSections(root, errors) {
  for (const [relative, markers] of PRESERVED_PUBLIC_SECTIONS) {
    const content = read(root, `src/${relative}`, errors);
    for (const marker of markers) {
      if (count(content, new RegExp(escapeRegExp(marker), 'g')) !== 1) {
        fail(errors, `preserved public section marker must occur exactly once in src/${relative}: ${marker}`);
      }
    }
  }
}

function validateStrictMermaidSources(root, errors) {
  const fence = String.fromCharCode(96).repeat(3);
  const expression = new RegExp(fence + 'mermaid\\r?\\n([\\s\\S]*?)' + fence, 'g');
  for (const relative of listMarkdown(root, 'src')) {
    const content = read(root, relative, errors);
    for (const match of content.matchAll(expression)) {
      if (/<br\s*\/?>/i.test(match[1])) {
        fail(errors, `${relative} uses an HTML line break that renders literally with Mermaid strict security mode; use a Markdown String newline`);
      }
    }
  }
}

function validateFigureBlock(content, slug, anchor, label, errors) {
  const image = `{{ '/assets/images/diagrams/${slug}.svg' | relative_url }}`;
  const anchorMarker = `<a id="${anchor}"></a>`;
  if (count(content, new RegExp(escapeRegExp(anchorMarker), 'g')) !== 1) {
    fail(errors, `${label} must contain stable anchor ${anchor} exactly once`);
  }
  if (count(content, new RegExp(`diagrams/${escapeRegExp(slug)}\\.svg`, 'g')) !== 1) {
    fail(errors, `${label} must contain exactly one reference to ${slug}.svg`);
  }
  if (!content.includes(image)) fail(errors, `${label} must use relative_url for ${slug}.svg`);

  const anchorStart = content.indexOf(anchorMarker);
  const nextAnchor = content.indexOf('<a id="figure-', anchorStart + anchorMarker.length);
  const scoped = anchorStart >= 0
    ? content.slice(anchorStart, nextAnchor >= 0 ? nextAnchor : content.length)
    : '';
  const figure = scoped.match(new RegExp(
    `<figure class="reader-figure">[\\s\\S]*?<img\\s+[^>]*src="[^"]*diagrams/${escapeRegExp(slug)}\\.svg[^"]*"[^>]*>[\\s\\S]*?<figcaption>([^<]+)</figcaption>[\\s\\S]*?</figure>`,
  ));
  const imageTag = figure ? figure[0].match(/<img\b[^>]*>/) : null;
  const alt = imageTag ? imageTag[0].match(/\balt="([^"]+)"/) : null;
  const betweenAnchorAndFigure = figure ? scoped.slice(anchorMarker.length, figure.index) : '';
  if (figure && betweenAnchorAndFigure.trim()) {
    fail(errors, `${label} must place stable anchor ${anchor} immediately before its figure`);
  }
  if (!figure || !alt || alt[1].trim().length < 8 || !figure[1].trim()) {
    fail(errors, `${label} must bind ${slug}.svg to meaningful alt text and a figure caption`);
  }
  const afterFigure = figure ? scoped.slice(figure.index + figure[0].length) : '';
  if (!afterFigure.includes('**文章による代替**:')) {
    fail(errors, `${label} is missing the textual alternative for ${anchor}`);
  }
}

function validateSvg(svg, slug, errors) {
  const documentBody = svg.replace(/^\uFEFF?\s*<\?xml[^>]*\?>\s*/, '');
  const opening = documentBody.match(/^<svg\b[^>]*>/);
  if (!opening || !documentBody.trimEnd().endsWith('</svg>')) {
    fail(errors, `asset ${slug}.svg must be a well-scoped SVG document root`);
    return;
  }
  if (!opening || !/\brole="img"/.test(opening[0])) fail(errors, `asset ${slug}.svg must declare role="img"`);
  if (!opening || !new RegExp(`aria-labelledby="${slug}-title ${slug}-desc"`).test(opening[0])) {
    fail(errors, `asset ${slug}.svg must reference its unique title and description`);
  }
  if (count(documentBody, /<title\b/g) !== 1 || count(documentBody, /<desc\b/g) !== 1) {
    fail(errors, `asset ${slug}.svg must contain exactly one title and description`);
  }
  const accessiblePrefix = new RegExp(
    `^<svg\\b[^>]*>\\s*<title id="${escapeRegExp(slug)}-title">[^<]+</title>\\s*<desc id="${escapeRegExp(slug)}-desc">[^<]+</desc>`,
  );
  if (!accessiblePrefix.test(documentBody)) {
    fail(errors, `asset ${slug}.svg must place its unique title and description directly under the SVG root`);
  }
  const hrefs = [...documentBody.matchAll(/(?:href|xlink:href)=["']([^"']+)["']/gi)].map((match) => match[1]);
  const urls = [...documentBody.matchAll(/url\(([^)]+)\)/gi)].map((match) => match[1].trim().replace(/^["']|["']$/g, ''));
  if (/<script\b|<foreignObject\b|@import\b|\son[a-z]+\s*=/i.test(documentBody)
      || hrefs.some((value) => !value.startsWith('#'))
      || urls.some((value) => !value.startsWith('#'))) {
    fail(errors, `asset ${slug}.svg must be self-contained and must not load external resources`);
  }
}

function check(root = process.cwd()) {
  const errors = [];
  const config = JSON.parse(read(root, 'book-config.json', errors) || '{}');
  validateManagedContentParity(root, config, errors);
  validatePreservedPublicSections(root, errors);
  validateStrictMermaidSources(root, errors);
  if (config?.ux?.modules?.troubleshootingFlow !== true) fail(errors, 'book-config.json must enable troubleshootingFlow');
  if (config?.ux?.modules?.figureIndex !== true) fail(errors, 'book-config.json must enable figureIndex');

  const sourceNav = read(root, 'src/navigation.yml', errors);
  const docsNav = read(root, 'docs/_data/navigation.yml', errors);
  if (sourceNav !== docsNav) fail(errors, 'source and docs navigation must be byte-for-byte synchronized');
  const sourceConfig = read(root, 'src/_config.yml', errors);
  const docsConfig = read(root, 'docs/_config.yml', errors);
  if (sourceConfig !== docsConfig) fail(errors, 'source and docs Jekyll config must be byte-for-byte synchronized');
  for (const [title, route] of [
    ['図表索引', '/appendices/figure-index/'],
    ['AI生成コードとテスト失敗の安全な切り分け', '/appendices/troubleshooting/'],
    ['あとがき', '/afterword/'],
  ]) {
    if (!sourceNav.includes(`title: ${title}`) || !sourceNav.includes(`path: ${route}`)) fail(errors, `navigation is missing ${route}`);
  }

  const appendixFiles = [
    'src/appendices/troubleshooting/index.md', 'docs/appendices/troubleshooting/index.md',
    'src/appendices/figure-index/index.md', 'docs/appendices/figure-index/index.md',
  ];
  for (const file of appendixFiles) if (!exists(root, file)) fail(errors, `missing dedicated reader route source: ${file}`);
  const troubleshooting = read(root, 'src/appendices/troubleshooting/index.md', errors);
  if (stripFrontMatter(read(root, 'docs/appendices/troubleshooting/index.md', errors)) !== troubleshooting) {
    fail(errors, 'source and docs troubleshooting pages must have identical reader content');
  }
  for (const heading of ['症状別の入口', '安全確認', '再現可能な最小条件', '原因仮説', '最小の安全な検証', '停止・エスカレーション', '判断と証跡']) {
    if (!troubleshooting.includes(heading)) fail(errors, `troubleshooting appendix is missing ${heading}`);
  }
  for (const symptom of ['AI生成コード', '生成テスト', 'eval/metric', 'CI/MLOps']) {
    if (!troubleshooting.includes(symptom)) fail(errors, `troubleshooting appendix is missing route for ${symptom}`);
  }

  const sourceReferences = [];
  const docsReferences = [];
  for (const [slug, chapter, anchor] of FIGURES) {
    const source = read(root, `src/chapters/${chapter}.md`, errors);
    validateFigureBlock(source, slug, anchor, `src/chapters/${chapter}.md`, errors);

    const docs = readPublishedChapter(root, chapter, errors);
    validateFigureBlock(docs, slug, anchor, `docs/chapters/${chapter}.md`, errors);
  }
  const sourceChapters = fs.readdirSync(path.join(root, 'src/chapters')).filter((name) => name.endsWith('.md')).map((name) => name.slice(0, -3));
  const docsChapters = fs.readdirSync(path.join(root, 'docs/chapters')).filter((name) => name.endsWith('.md')).map((name) => name.slice(0, -3));
  for (const chapter of sourceChapters) {
    sourceReferences.push(...(read(root, `src/chapters/${chapter}.md`, errors).match(/\/assets\/images\/diagrams\/[^'"\s]+\.svg/g) || []));
  }
  for (const chapter of docsChapters) {
    docsReferences.push(...(readPublishedChapter(root, chapter, errors).match(/\/assets\/images\/diagrams\/[^'"\s]+\.svg/g) || []));
  }
  const expectedReferences = FIGURES.map(([slug]) => `/assets/images/diagrams/${slug}.svg`).sort();
  if (sourceReferences.sort().join('\n') !== expectedReferences.join('\n')) fail(errors, 'source chapter figure references must be an exact six-item inventory');
  if (docsReferences.sort().join('\n') !== expectedReferences.join('\n')) fail(errors, 'docs chapter figure references must be an exact six-item inventory');

  const index = read(root, 'src/appendices/figure-index/index.md', errors);
  const indexLinks = [...index.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
  const expectedLinks = FIGURES.map(([, chapter, anchor]) => `../../chapters/${chapter}/#${anchor}`);
  if (indexLinks.join('\n') !== expectedLinks.join('\n')) fail(errors, 'figure index must contain exactly six chapter-ordered relative deep links');
  if (/(?:https?:\/\/itdojp\.github\.io|\/ai-testing-strategy-book\/|\{\{\s*site\.baseurl)/.test(index)) fail(errors, 'figure index must not contain an absolute or baseurl-bound deep link');
  if (stripFrontMatter(read(root, 'docs/appendices/figure-index/index.md', errors)) !== index) {
    fail(errors, 'source and docs figure indexes must have identical reader content');
  }

  for (const [slug] of FIGURES) {
    const relative = `assets/images/diagrams/${slug}.svg`;
    const sourceSvg = read(root, relative, errors);
    const docsSvg = read(root, `docs/${relative}`, errors);
    if (sourceSvg !== docsSvg) fail(errors, `docs asset mirror differs from canonical source asset ${relative}`);
    validateSvg(sourceSvg, slug, errors);
  }
  const rootAssets = fs.existsSync(path.join(root, 'assets/images/diagrams')) ? fs.readdirSync(path.join(root, 'assets/images/diagrams')).filter((name) => name.endsWith('.svg')).sort() : [];
  const docsAssets = fs.existsSync(path.join(root, 'docs/assets/images/diagrams')) ? fs.readdirSync(path.join(root, 'docs/assets/images/diagrams')).filter((name) => name.endsWith('.svg')).sort() : [];
  const expectedAssets = FIGURES.map(([slug]) => `${slug}.svg`).sort();
  if (rootAssets.join('\n') !== expectedAssets.join('\n')) fail(errors, 'canonical source asset directory must contain exactly the six referenced SVGs');
  if (docsAssets.join('\n') !== expectedAssets.join('\n')) fail(errors, 'docs asset mirror must contain exactly the six referenced SVGs');

  const top = read(root, 'docs/index.md', errors);
  for (const route of ['appendices/troubleshooting/', 'appendices/figure-index/']) if (!top.includes(`](${route})`)) fail(errors, `top page is missing reader route ${route}`);
  const layout = read(root, 'docs/_layouts/book.html', errors);
  const pageNavigation = read(root, 'docs/_includes/page-navigation.html', errors);
  if (!layout.includes('page-navigation.html') || !pageNavigation.includes('rel="prev"') || !pageNavigation.includes('rel="next"')) {
    fail(errors, 'book layout must provide top and previous/next reader navigation');
  }

  const packageJson = JSON.parse(read(root, 'package.json', errors) || '{}');
  if (packageJson?.scripts?.['check:reader-ux'] !== 'node scripts/check-reader-ux.js && node scripts/check-reader-ux-regression.js') {
    fail(errors, 'package.json must wire the complete reader UX checker');
  }
  const workflow = read(root, '.github/workflows/book-qa.yml', errors);
  if (!workflow.includes('npm run check:reader-ux')) fail(errors, 'Book QA workflow must execute the reader UX checker');
  const committedJekyll = workflow.indexOf('destination: ./_site-committed');
  const committedAssetSmoke = workflow.indexOf('_site-committed/assets/js/code-copy-lightweight.js');
  const destructiveBuild = workflow.indexOf('name: Rebuild public tree from canonical source');
  if (count(workflow, /uses: actions\/jekyll-build-pages@v1/g) !== 2
      || committedJekyll < 0
      || committedAssetSmoke < committedJekyll
      || committedAssetSmoke > destructiveBuild
      || committedJekyll > destructiveBuild) {
    fail(errors, 'Book QA must Jekyll-build and smoke-check committed docs before the destructive source rebuild');
  }
  const buildScript = read(root, 'scripts/build-simple.js', errors);
  for (const asset of ['sidebar.js', 'search.js', 'code-copy-lightweight.js', 'main.js', 'mermaid-init.js']) {
    if (!buildScript.includes(`'${asset}'`)) fail(errors, `destructive build must preserve generated layout asset ${asset}`);
    if (!workflow.includes(`"assets/js/${asset}"`)) fail(errors, `Book QA smoke check must require generated layout asset ${asset}`);
  }
  const generatedLayout = read(root, 'templates/layouts/book.html', errors);
  const generatedCodeCopy = read(root, 'templates/js/code-copy-lightweight.js', errors);
  const mermaidRuntime = read(root, 'templates/js/mermaid-init.js', errors);
  const mermaidIntegrity = 'sha384-+NGfjU8KzpDLXRHduEqW+ZiJr2rIg+cidUVk7B51R5xK7cHwMKQfrdFwGdrq1Bcz';
  if (!generatedLayout.includes('site.mermaid and site.mermaid.enabled')
      || !generatedLayout.includes('mermaid@10.6.1/dist/mermaid.min.js')
      || !generatedLayout.includes(`integrity="${mermaidIntegrity}"`)
      || !generatedLayout.includes('crossorigin="anonymous"')
      || !generatedLayout.includes('referrerpolicy="no-referrer"')
      || !generatedLayout.includes("'/assets/js/mermaid-init.js' | relative_url")) {
    fail(errors, 'generated layout must load the SRI-pinned Mermaid runtime and initializer when Mermaid is enabled');
  }
  if (!layout.includes(`integrity="${mermaidIntegrity}"`)
      || !layout.includes('crossorigin="anonymous"')
      || !layout.includes('referrerpolicy="no-referrer"')) {
    fail(errors, 'committed layout must load Mermaid with the same SRI and privacy attributes');
  }
  if (!layout.includes("'/assets/js/code-copy-lightweight.js' | relative_url")
      || !generatedLayout.includes("'/assets/js/code-copy-lightweight.js' | relative_url")
      || generatedLayout.includes("'/assets/js/code-copy.js' | relative_url")
      || !generatedCodeCopy.includes("copyButton.type = 'button';")
      || read(root, 'docs/assets/js/code-copy-lightweight.js', errors) !== generatedCodeCopy) {
    fail(errors, 'committed and generated layouts must use the same non-submitting lightweight code-copy implementation');
  }
  if (!mermaidRuntime.includes('code.language-mermaid')
      || !mermaidRuntime.includes('window.mermaid.run')
      || !mermaidRuntime.includes("securityLevel: 'strict'")) {
    fail(errors, 'generated Mermaid initializer must convert fenced blocks and render them in strict security mode');
  }
  if (read(root, 'docs/assets/js/mermaid-init.js', errors) !== mermaidRuntime) {
    fail(errors, 'committed and generated Mermaid initializers must be identical');
  }

  if (errors.length) {
    const error = new Error(`Reader UX check failed:\n- ${errors.join('\n- ')}`);
    error.errors = errors;
    throw error;
  }
  return { figures: FIGURES.length, routes: 2 };
}

if (require.main === module) {
  try {
    const result = check(process.cwd());
    console.log(`Reader UX check passed: ${result.figures} figures, ${result.routes} dedicated routes.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { check, FIGURES, PRESERVED_PUBLIC_SECTIONS };
