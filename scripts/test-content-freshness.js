#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { currentDateInTokyo, fetchSafeUrl, parseArgs, validateRepository } = require('./check-content-freshness');

const root = path.resolve(__dirname, '..');
const tempParent = path.join(root, '.codex-local', 'tmp');

function makeFixture() {
  fs.mkdirSync(tempParent, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(tempParent, 'freshness-regression-'));
  const config = JSON.parse(fs.readFileSync(path.join(root, 'content-freshness.json'), 'utf8'));
  const paths = new Set(['content-freshness.json']);
  for (const sourcePath of config.policy.trackedPaths) {
    paths.add(sourcePath);
    paths.add(`docs/${sourcePath.slice('src/'.length)}`);
  }
  for (const relative of paths) {
    const source = path.join(root, relative);
    const destination = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  return fixture;
}

function withFixture(run) {
  const fixture = makeFixture();
  try {
    run(fixture);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

test('accepts the committed freshness contract', () => {
  assert.deepEqual(validateRepository(root, { asOf: '2026-07-19' }), []);
});

test('expires current recommendations but preserves historical snapshots', () => {
  const errors = validateRepository(root, { asOf: '2027-02-01' });
  assert(errors.some((error) => error.includes('verification expired')), errors.join('\n'));
  assert(!errors.some((error) => error.includes('chapter1-ai-adoption-2024-snapshot') && error.includes('expired')), errors.join('\n'));
});

test('uses the manuscript timezone for the default calendar date', () => {
  assert.equal(currentDateInTokyo(new Date('2026-07-19T15:30:00Z')), '2026-07-20');
});

test('rejects a missing primary source in published content', () => withFixture((fixture) => {
  const target = path.join(fixture, 'docs/chapters/chapter-01-ai-driven-development.md');
  fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace('https://survey.stackoverflow.co/2024/', 'https://example.invalid/'));
  const errors = validateRepository(fixture, { asOf: '2026-07-19' });
  assert(errors.some((error) => error.includes('does not contain primary source')), errors.join('\n'));
}));

test('rejects source/docs marker drift', () => withFixture((fixture) => {
  const target = path.join(fixture, 'docs/appendices/appendix-c-tool-comparison.md');
  fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace('<!-- freshness-claim: appendix-node-runtime-profile -->', ''));
  const errors = validateRepository(fixture, { asOf: '2026-07-19' });
  assert(errors.some((error) => error.includes('must contain marker exactly once')), errors.join('\n'));
}));

test('rejects an unregistered volatile assertion added only to published docs', () => withFixture((fixture) => {
  const target = path.join(fixture, 'docs/appendices/appendix-c-tool-comparison.md');
  fs.appendFileSync(target, '\n最新モデルを公開時の標準として採用する。\n');
  const errors = validateRepository(fixture, { asOf: '2026-07-19' });
  assert(errors.some((error) => error.includes('tracked source/docs reader content differs')), errors.join('\n'));
}));

test('rejects an unregistered volatile assertion', () => withFixture((fixture) => {
  const target = path.join(fixture, 'src/chapters/chapter-01-ai-driven-development.md');
  fs.appendFileSync(target, '\n## Regression fixture\n最新モデルを現在の標準として採用する。\n');
  const errors = validateRepository(fixture, { asOf: '2026-07-19' });
  assert(errors.some((error) => error.includes('lacks a nearby registered claim marker')), errors.join('\n'));
}));

test('rejects repository paths that escape the root', () => withFixture((fixture) => {
  const configPath = path.join(fixture, 'content-freshness.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.policy.trackedPaths.push('../outside.md');
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const errors = validateRepository(fixture, { asOf: '2026-07-19' });
  assert(errors.some((error) => error.includes('escapes the repository root')), errors.join('\n'));
}));

test('rejects a missing tracked path instead of skipping it', () => withFixture((fixture) => {
  const configPath = path.join(fixture, 'content-freshness.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.policy.trackedPaths.push('src/appendices/missing.md');
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const errors = validateRepository(fixture, { asOf: '2026-07-19' });
  assert(errors.some((error) => error.includes('policy.trackedPaths entry is missing')), errors.join('\n'));
}));

test('manifest cannot extend the code-owned remote host allowlist', () => withFixture((fixture) => {
  const configPath = path.join(fixture, 'content-freshness.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.policy.allowedPrimarySourceHosts = ['127.0.0.1'];
  config.claims[0].primarySources = ['https://127.0.0.1/private'];
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const errors = validateRepository(fixture, { asOf: '2026-07-19' });
  assert(errors.some((error) => error.includes('host is not allowlisted')), errors.join('\n'));
}));

test('remote checker rejects a redirect to an unallowlisted host before requesting it', async () => {
  const requested = [];
  const fakeFetch = async (url) => {
    requested.push(url);
    return {
      status: 302,
      headers: { get: (name) => name.toLowerCase() === 'location' ? 'https://127.0.0.1/private' : null },
      body: null
    };
  };
  await assert.rejects(
    fetchSafeUrl('https://docs.github.com/copilot', fakeFetch),
    /host is not allowlisted/
  );
  assert.deepEqual(requested, ['https://docs.github.com/copilot']);
});

test('CLI value flags fail closed when their value is missing', () => {
  assert.throws(() => parseArgs(['--root']), /--root requires a value/);
  assert.throws(() => parseArgs(['--as-of', '--check-remote']), /--as-of requires a value/);
});
