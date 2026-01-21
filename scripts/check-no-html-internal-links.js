#!/usr/bin/env node

/**
 * Check that internal links do not use "*.html" (except "index.html").
 *
 * Rationale:
 * - This repository uses Jekyll `permalink: pretty` for GitHub Pages.
 * - Links like `/chapters/foo.html` become 404 on the deployed site because
 *   the actual URL is `/chapters/foo/` (i.e., `/chapters/foo/index.html`).
 *
 * This checker is intentionally simple:
 * - Markdown: checks link targets in `[text](target)`
 * - HTML: checks `href="..."`
 * - Skips external links (http/https) and non-navigational schemes.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const DOCS_ROOT = path.join(REPO_ROOT, "docs");

function isExternalLink(target) {
  const lower = target.trim().toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("//")
  );
}

function normalizeTarget(rawTarget) {
  const trimmed = rawTarget.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function stripQueryAndFragment(target) {
  return target.split("#")[0].split("?")[0];
}

function isDisallowedHtmlLink(target) {
  const normalized = normalizeTarget(target);
  if (!normalized) return false;
  if (normalized.startsWith("#")) return false;
  if (isExternalLink(normalized)) return false;

  const withoutQuery = stripQueryAndFragment(normalized);

  // Accept explicit index.html (it can exist as a concrete file).
  if (withoutQuery.endsWith("/index.html") || withoutQuery === "index.html") {
    return false;
  }

  // Disallow *.html for internal navigation.
  return withoutQuery.endsWith(".html");
}

function getLineNumber(text, index) {
  return text.slice(0, index).split("\n").length;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip typical large/irrelevant directories in docs if any appear.
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      results.push(...walk(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

function checkMarkdown(filePath, content) {
  const issues = [];
  const linkRegex = /\[[^\]]*]\(([^)]+)\)/g;

  for (const match of content.matchAll(linkRegex)) {
    const rawTarget = match[1];
    // In markdown, targets may include a title: (url "title")
    const firstToken = rawTarget.trim().split(/\s+/)[0];

    if (isDisallowedHtmlLink(firstToken)) {
      issues.push({
        filePath,
        line: getLineNumber(content, match.index ?? 0),
        kind: "markdown",
        target: firstToken
      });
    }
  }

  return issues;
}

function checkHtml(filePath, content) {
  const issues = [];
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/g;

  for (const match of content.matchAll(hrefRegex)) {
    const rawTarget = match[1];

    if (isDisallowedHtmlLink(rawTarget)) {
      issues.push({
        filePath,
        line: getLineNumber(content, match.index ?? 0),
        kind: "html",
        target: rawTarget
      });
    }
  }

  return issues;
}

function main() {
  if (!fs.existsSync(DOCS_ROOT)) {
    console.error("docs/ が見つかりません。");
    process.exit(1);
  }

  const files = walk(DOCS_ROOT);
  const issues = [];

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== ".md" && ext !== ".html") continue;

    const content = fs.readFileSync(filePath, "utf8");
    if (ext === ".md") issues.push(...checkMarkdown(filePath, content));
    if (ext === ".html") issues.push(...checkHtml(filePath, content));
  }

  if (issues.length === 0) {
    console.log("✅ OK: internal links do not use '*.html' (except index.html).");
    return;
  }

  console.error("❌ Found disallowed internal '*.html' links (permalink: pretty で404になり得ます)\n");
  for (const issue of issues) {
    const rel = path.relative(REPO_ROOT, issue.filePath);
    console.error(`- ${rel}:${issue.line} (${issue.kind}) ${issue.target}`);
  }

  process.exit(1);
}

main();
