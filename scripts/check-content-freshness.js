#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = 'content-freshness.json';
const ALLOWED_KINDS = new Set(['historical_snapshot', 'current_recommendation']);
// Keep the network trust boundary in reviewed code. A content-only manifest
// change must not be able to make the checker request an internal host.
const ALLOWED_PRIMARY_SOURCE_HOSTS = new Set([
  'appium.io',
  'cursor.com',
  'developers.openai.com',
  'docs.aws.amazon.com',
  'docs.cursor.com',
  'docs.cypress.io',
  'docs.devin.ai',
  'docs.github.com',
  'docs.sentry.io',
  'docs.sonarsource.com',
  'docs.tabnine.com',
  'docs.windsurf.com',
  'nodejs.org',
  'opentelemetry.io',
  'playwright.dev',
  'survey.stackoverflow.co',
  'www.selenium.dev'
]);
const MAX_REDIRECTS = 5;

function countOccurrences(text, needle) {
  if (!needle) return 0;
  return text.split(needle).length - 1;
}

function parseIsoDate(value, label, errors) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    errors.push(`${label} must use YYYY-MM-DD: ${value}`);
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    errors.push(`${label} is not a valid calendar date: ${value}`);
    return null;
  }
  return date;
}

function currentDateInTokyo(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function docsPathFor(sourcePath) {
  if (!sourcePath.startsWith('src/')) return null;
  return `docs/${sourcePath.slice('src/'.length)}`;
}

function resolveRepositoryPath(root, relative, label, errors) {
  if (typeof relative !== 'string' || relative.length === 0 || path.isAbsolute(relative)) {
    errors.push(`${label} must be a non-empty repository-relative path`);
    return null;
  }
  const rootPath = path.resolve(root);
  const resolved = path.resolve(rootPath, relative);
  const relation = path.relative(rootPath, resolved);
  if (relation === '..' || relation.startsWith(`..${path.sep}`) || path.isAbsolute(relation)) {
    errors.push(`${label} escapes the repository root: ${relative}`);
    return null;
  }
  return resolved;
}

function validatePrimarySourceUrl(source, label, errors) {
  let url;
  try {
    url = new URL(source);
  } catch {
    errors.push(`${label}: invalid primary source URL ${source}`);
    return null;
  }
  if (url.protocol !== 'https:') errors.push(`${label}: primary source must use HTTPS: ${source}`);
  if (url.username || url.password) errors.push(`${label}: primary source must not contain credentials: ${source}`);
  if (url.port && url.port !== '443') errors.push(`${label}: primary source must use the default HTTPS port: ${source}`);
  if (!ALLOWED_PRIMARY_SOURCE_HOSTS.has(url.hostname)) errors.push(`${label}: primary source host is not allowlisted: ${url.hostname}`);
  return url;
}

function stripNonProse(line) {
  return line
    .replace(/`[^`]*`/g, '')
    .replace(/\]\(https?:\/\/[^)]+\)/g, ']()')
    .replace(/https?:\/\/\S+/g, '');
}

function scanVolatileClaims(root, config, errors) {
  const patterns = (config.policy.volatilePatterns || []).map((pattern) => {
    try {
      return { source: pattern, regex: new RegExp(pattern, 'iu') };
    } catch (error) {
      errors.push(`invalid volatile pattern ${pattern}: ${error.message}`);
      return null;
    }
  }).filter(Boolean);
  const windowLines = config.policy.claimWindowLines;
  const markersByPath = new Map();
  for (const claim of config.claims) {
    const markers = markersByPath.get(claim.sourcePath) || [];
    markers.push(claim.marker);
    markersByPath.set(claim.sourcePath, markers);
  }

  for (const relative of config.policy.trackedPaths || []) {
    const full = resolveRepositoryPath(root, relative, 'policy.trackedPaths entry', errors);
    if (!full) continue;
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    let inFence = false;
    for (let index = 0; index < lines.length; index += 1) {
      const raw = lines[index];
      if (/^\s*(```|~~~)/.test(raw)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const prose = stripNonProse(raw);
      const matched = patterns.filter(({ regex }) => regex.test(prose)).map(({ source }) => source);
      if (matched.length === 0) continue;
      const start = Math.max(0, index - windowLines);
      const context = lines.slice(start, index + 1).join('\n');
      const registered = (markersByPath.get(relative) || []).some((marker) => context.includes(marker));
      if (!registered) {
        errors.push(`${relative}:${index + 1} volatile expression (${matched.join(', ')}) lacks a nearby registered claim marker`);
      }
    }
  }
}

function validateRepository(root, options = {}) {
  const errors = [];
  const configFile = path.join(root, CONFIG_PATH);
  if (!fs.existsSync(configFile)) return [`missing ${CONFIG_PATH}`];

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } catch (error) {
    return [`invalid ${CONFIG_PATH}: ${error.message}`];
  }

  if (config.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!config.policy || typeof config.policy !== 'object') return [...errors, 'policy must be an object'];
  if (!Array.isArray(config.claims) || config.claims.length === 0) return [...errors, 'claims must be a non-empty array'];
  if (!Array.isArray(config.policy.trackedPaths) || config.policy.trackedPaths.length === 0) errors.push('policy.trackedPaths must be non-empty');
  if (!Number.isInteger(config.policy.currentMaximumAgeDays) || config.policy.currentMaximumAgeDays < 1) errors.push('policy.currentMaximumAgeDays must be a positive integer');
  if (!Number.isInteger(config.policy.claimWindowLines) || config.policy.claimWindowLines < 1) errors.push('policy.claimWindowLines must be a positive integer');

  const asOfValue = options.asOf || currentDateInTokyo();
  const asOf = parseIsoDate(asOfValue, 'as-of date', errors);
  const policyDate = parseIsoDate(config.policy.checkedOn, 'policy.checkedOn', errors);
  if (policyDate && asOf && policyDate > asOf) errors.push(`policy.checkedOn is in the future: ${config.policy.checkedOn}`);

  const trackedPaths = new Set(config.policy.trackedPaths || []);
  const ids = new Set();

  for (const claim of config.claims) {
    const label = `claim ${claim.id || '<missing-id>'}`;
    if (!claim.id || !/^[a-z0-9][a-z0-9-]*$/.test(claim.id)) errors.push(`${label}: id must use lowercase kebab-case`);
    if (ids.has(claim.id)) errors.push(`${label}: duplicate id`);
    ids.add(claim.id);
    if (!ALLOWED_KINDS.has(claim.kind)) errors.push(`${label}: invalid kind ${claim.kind}`);
    if (!trackedPaths.has(claim.sourcePath)) errors.push(`${label}: sourcePath is not listed in policy.trackedPaths`);
    if (claim.marker !== `<!-- freshness-claim: ${claim.id} -->`) errors.push(`${label}: marker must be canonical`);
    if (!claim.profile || typeof claim.profile !== 'string') errors.push(`${label}: profile is required`);
    if (!Array.isArray(claim.primarySources) || claim.primarySources.length === 0) errors.push(`${label}: primarySources must be non-empty`);

    const checkedOn = parseIsoDate(claim.checkedOn, `${label}.checkedOn`, errors);
    if (checkedOn && asOf) {
      const ageDays = Math.floor((asOf - checkedOn) / 86400000);
      if (ageDays < 0) errors.push(`${label}: checkedOn is in the future (${claim.checkedOn})`);
      if (claim.kind === 'current_recommendation' && ageDays > config.policy.currentMaximumAgeDays) {
        errors.push(`${label}: verification expired (${ageDays} days > ${config.policy.currentMaximumAgeDays})`);
      }
    }

    const docsPath = docsPathFor(claim.sourcePath);
    if (!docsPath) {
      errors.push(`${label}: sourcePath must be under src/`);
      continue;
    }
    for (const relative of [claim.sourcePath, docsPath]) {
      const full = resolveRepositoryPath(root, relative, `${label} path`, errors);
      if (!full) continue;
      if (!fs.existsSync(full)) {
        errors.push(`${label}: missing ${relative}`);
        continue;
      }
      const content = fs.readFileSync(full, 'utf8');
      if (countOccurrences(content, claim.marker) !== 1) errors.push(`${label}: ${relative} must contain marker exactly once`);
      if (!content.includes(claim.checkedOn)) errors.push(`${label}: ${relative} does not show checkedOn ${claim.checkedOn}`);
      if (!content.includes(claim.profile)) errors.push(`${label}: ${relative} does not show profile ${claim.profile}`);
      for (const source of claim.primarySources || []) {
        if (!content.includes(source)) errors.push(`${label}: ${relative} does not contain primary source ${source}`);
      }
    }

    for (const source of claim.primarySources || []) validatePrimarySourceUrl(source, label, errors);
  }

  scanVolatileClaims(root, config, errors);
  return errors;
}

async function fetchSafeUrl(source, fetchImpl = fetch) {
  let current = new URL(source);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const validationErrors = [];
    validatePrimarySourceUrl(current.href, 'remote source', validationErrors);
    if (validationErrors.length > 0) throw new Error(validationErrors.join('; '));
    const response = await fetchImpl(current.href, {
      redirect: 'manual',
      headers: { 'user-agent': 'ai-testing-strategy-book-freshness-check/1.0' },
      signal: AbortSignal.timeout(20000)
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (response.body) await response.body.cancel();
      if (!location) throw new Error(`HTTP ${response.status} without Location`);
      if (redirects === MAX_REDIRECTS) throw new Error(`more than ${MAX_REDIRECTS} redirects`);
      current = new URL(location, current);
      continue;
    }
    return { response, finalUrl: current.href };
  }
  throw new Error(`more than ${MAX_REDIRECTS} redirects`);
}

async function checkRemoteSources(root, options = {}) {
  const config = JSON.parse(fs.readFileSync(path.join(root, CONFIG_PATH), 'utf8'));
  const sources = [...new Set(config.claims.flatMap((claim) => claim.primarySources || []))];
  const failures = [];
  const fetchImpl = options.fetchImpl || fetch;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(4, sources.length) }, async () => {
    while (cursor < sources.length) {
      const source = sources[cursor];
      cursor += 1;
      try {
        const { response, finalUrl } = await fetchSafeUrl(source, fetchImpl);
        console.log(`${response.status} ${source}${finalUrl === source ? '' : ` -> ${finalUrl}`}`);
        if (response.status < 200 || response.status >= 300) failures.push(`${source}: HTTP ${response.status}`);
        if (response.body) await response.body.cancel();
      } catch (error) {
        failures.push(`${source}: ${error.message}`);
      }
    }
  });
  await Promise.all(workers);
  return failures;
}

function parseArgs(argv) {
  const options = { root: process.cwd(), checkRemote: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') options.root = path.resolve(argv[++index]);
    else if (arg === '--as-of') options.asOf = argv[++index];
    else if (arg === '--check-remote') options.checkRemote = true;
    else if (arg === '--help') options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    console.log('Usage: node scripts/check-content-freshness.js [--root PATH] [--as-of YYYY-MM-DD] [--check-remote]');
    return;
  }
  const errors = validateRepository(options.root, options);
  if (options.checkRemote && errors.length === 0) errors.push(...await checkRemoteSources(options.root));
  if (errors.length > 0) {
    console.error('Content freshness check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Content freshness check passed (${options.asOf || currentDateInTokyo()} Asia/Tokyo).`);
}

if (require.main === module) main();

module.exports = {
  ALLOWED_PRIMARY_SOURCE_HOSTS,
  checkRemoteSources,
  currentDateInTokyo,
  fetchSafeUrl,
  resolveRepositoryPath,
  stripNonProse,
  validateRepository
};
