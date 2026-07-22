'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const EXCEPTIONS_PATH = path.join(__dirname, 'public-link-audit-exceptions.json');

const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));
const sleep = (milliseconds) => {
  Atomics.wait(sleepBuffer, 0, 0, milliseconds);
};

function combineDiagnostics(stderr, error) {
  const parts = [stderr?.trimEnd(), error?.message].filter(Boolean);
  return parts.length ? `${parts.join('\n')}\n` : '';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dateValue(value, field) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    throw new Error(`${field} must use YYYY-MM-DD`);
  }
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} is not a valid date`);
  }
  return parsed;
}

function parseExceptions(manifest, today = new Date()) {
  if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.exceptions)) {
    throw new Error('link exception manifest must use schemaVersion 1 and an exceptions array');
  }

  const todayValue = Date.parse(today.toISOString().slice(0, 10) + 'T00:00:00Z');
  const seen = new Set();
  return manifest.exceptions.map((entry, index) => {
    const prefix = `exceptions[${index}]`;
    const keys = Object.keys(entry || {}).sort();
    const expectedKeys = ['reason', 'recheckAfter', 'url', 'verifiedAt'];
    if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
      throw new Error(`${prefix} must contain only ${expectedKeys.join(', ')}`);
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(entry.url);
    } catch {
      throw new Error(`${prefix}.url must be an absolute URL`);
    }
    if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
      throw new Error(`${prefix}.url must be an HTTPS URL without credentials`);
    }
    if (parsedUrl.href !== entry.url || parsedUrl.pathname === '/') {
      throw new Error(`${prefix}.url must be a canonical resource URL, not a host-wide pattern`);
    }
    if (seen.has(entry.url)) throw new Error(`${prefix}.url is duplicated`);
    seen.add(entry.url);
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 20) {
      throw new Error(`${prefix}.reason must explain the runner-specific exception`);
    }

    const verifiedAt = dateValue(entry.verifiedAt, `${prefix}.verifiedAt`);
    const recheckAfter = dateValue(entry.recheckAfter, `${prefix}.recheckAfter`);
    if (verifiedAt > todayValue) {
      throw new Error(`${prefix}.verifiedAt cannot be in the future`);
    }
    if (recheckAfter <= verifiedAt) {
      throw new Error(`${prefix}.recheckAfter must be later than verifiedAt`);
    }
    if (todayValue >= recheckAfter) {
      throw new Error(`${prefix} expired on ${entry.recheckAfter}; re-audit before renewing or removing it`);
    }

    return { ...entry, skipPattern: `^${escapeRegExp(entry.url)}$` };
  });
}

function collectMarkdown(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return collectMarkdown(target);
    return entry.isFile() && entry.name.endsWith('.md') ? [fs.readFileSync(target, 'utf8')] : [];
  });
}

function requirePublishedReferences(exceptions, sourceDocuments, publishedDocuments) {
  for (const exception of exceptions) {
    if (!sourceDocuments.some((document) => document.includes(exception.url))) {
      throw new Error(`link exception is not referenced by canonical source: ${exception.url}`);
    }
    if (!publishedDocuments.some((document) => document.includes(exception.url))) {
      throw new Error(`link exception is not referenced by published docs: ${exception.url}`);
    }
  }
}

function loadExceptions(manifestPath = EXCEPTIONS_PATH, today = new Date()) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const exceptions = parseExceptions(manifest, today);
  requirePublishedReferences(
    exceptions,
    collectMarkdown(path.resolve(__dirname, '..', 'src')),
    collectMarkdown(path.resolve(__dirname, '..', 'docs')),
  );
  return exceptions;
}

function exceptionEvidence(exceptions) {
  return {
    schemaVersion: 1,
    exceptions: exceptions.map(({ skipPattern: _skipPattern, ...entry }) => entry),
  };
}

function runWithRetries(runAttempt, { maxAttempts = 3, wait = sleep } = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('maxAttempts must be a positive integer');
  }

  const attempts = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = runAttempt(attempt);
    attempts.push({ attempt, ...result });
    if (result.exitCode === 0) break;
    if (attempt < maxAttempts) wait(attempt * 2000);
  }
  return { attempts, final: attempts.at(-1) };
}

function runLinkinator(rootUrl, version, attempt, exceptions = []) {
  const args = [
    '--yes', `linkinator@${version}`, rootUrl,
    '--recurse',
    '--skip', 'localhost|127.0.0.1',
    '--timeout', '30000',
    '--concurrency', '10',
    '--retry-errors',
    '--retry-errors-count', '2',
    '--retry-errors-jitter', '250',
    '--status-code', '429:warn',
    '--format', 'json',
  ];
  for (const exception of exceptions) args.push('--skip', exception.skipPattern);
  const result = spawnSync('npx', args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const stderr = combineDiagnostics(result.stderr, result.error);
  const exitCode = Number.isInteger(result.status) ? result.status : 2;
  fs.writeFileSync(`links-attempt-${attempt}.json`, result.stdout || '');
  fs.writeFileSync(`links-attempt-${attempt}.stderr`, stderr);
  return { exitCode, stdout: result.stdout || '', stderr };
}

function main() {
  const [rootUrl] = process.argv.slice(2);
  const version = process.env.LINKINATOR_VERSION;
  if (!rootUrl || !/^https:\/\//.test(rootUrl)) throw new Error('usage: run-public-link-check.js HTTPS_ROOT_URL');
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error('LINKINATOR_VERSION must be an exact version');

  const exceptions = loadExceptions();
  fs.writeFileSync(
    'links-exceptions.json',
    `${JSON.stringify(exceptionEvidence(exceptions), null, 2)}\n`,
  );
  const result = runWithRetries((attempt) => runLinkinator(rootUrl, version, attempt, exceptions));
  fs.writeFileSync('links.json', result.final.stdout);
  fs.writeFileSync('links.stderr', result.final.stderr);
  fs.writeFileSync(
    'links-attempts.json',
    `${JSON.stringify({ attempts: result.attempts.map(({ attempt, exitCode }) => ({ attempt, exitCode })) }, null, 2)}\n`,
  );

  const lines = result.attempts.map(({ attempt, exitCode }) => `- attempt ${attempt}: exit ${exitCode}`).join('\n');
  process.stdout.write(`${lines}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### link scan attempts\n\n${lines}\n`);
    const exceptionLines = exceptions.map((entry) => (
      `- ${entry.url} — ${entry.reason} Recheck before ${entry.recheckAfter}.`
    )).join('\n') || '- none';
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n### exact link audit exceptions\n\n${exceptionLines}\n`,
    );
  }
  process.exitCode = result.final.exitCode;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    fs.writeFileSync('links.json', `${JSON.stringify({ error: error.message }, null, 2)}\n`);
    fs.writeFileSync('links.stderr', `${error.stack || error.message}\n`);
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 2;
  }
}

module.exports = {
  combineDiagnostics,
  escapeRegExp,
  exceptionEvidence,
  loadExceptions,
  parseExceptions,
  requirePublishedReferences,
  runWithRetries,
};
