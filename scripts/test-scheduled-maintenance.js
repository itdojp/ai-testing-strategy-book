'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const {
  combineDiagnostics,
  escapeRegExp,
  exceptionEvidence,
  loadExceptions,
  parseExceptions,
  requirePublishedReferences,
  runWithRetries,
} = require('./run-public-link-check');
const {
  classifyCommandOutput,
  classifyMaintenanceState,
  chooseIssueAction,
  renderIssueBody,
} = require('./maintenance-state');

const cleanCommand = { outcome: 'success', found: false, infrastructureFailure: false };
const base = {
  install: 'success',
  validation: 'success',
  build: 'success',
  contract: 'success',
  outdated: cleanCommand,
  audit: cleanCommand,
  links: cleanCommand,
};

const clean = classifyMaintenanceState(base);
assert.equal(clean.issueRequired, false);
assert.equal(clean.infrastructureFailure, false);

const finding = classifyMaintenanceState({
  ...base,
  outdated: { outcome: 'success', found: true, infrastructureFailure: false },
});
assert.equal(finding.issueRequired, true);
assert.deepEqual(finding.findings, ['outdated']);

const buildFailure = classifyMaintenanceState({ ...base, build: 'failure' });
assert.equal(buildFailure.infrastructureFailure, true);
assert.deepEqual(buildFailure.infrastructure, ['build']);

const installFailure = classifyMaintenanceState({
  ...base,
  install: 'failure',
  validation: 'skipped',
  build: 'skipped',
});
assert.deepEqual(installFailure.infrastructure, ['install']);

const unexpectedBuildSkip = classifyMaintenanceState({ ...base, build: 'skipped' });
assert.deepEqual(unexpectedBuildSkip.infrastructure, ['build']);

const commandFailure = classifyMaintenanceState({
  ...base,
  links: { outcome: 'success', found: false, infrastructureFailure: true },
});
assert.deepEqual(commandFailure.infrastructure, ['links-command']);

const commandCrash = classifyMaintenanceState({
  ...base,
  audit: { outcome: 'failure', found: false, infrastructureFailure: false },
});
assert.deepEqual(commandCrash.infrastructure, ['audit-command']);

const upstreamSkip = classifyMaintenanceState({
  ...base,
  install: 'failure',
  validation: 'skipped',
  build: 'skipped',
  outdated: { outcome: 'skipped', found: false, infrastructureFailure: false },
  audit: { outcome: 'skipped', found: false, infrastructureFailure: false },
  links: { outcome: 'skipped', found: false, infrastructureFailure: false },
});
assert.deepEqual(upstreamSkip.infrastructure, ['install']);

const duplicate = classifyMaintenanceState({
  ...base,
  outdated: { outcome: 'success', found: true, infrastructureFailure: false },
});
assert.equal(duplicate.fingerprint, finding.fingerprint);
assert.match(renderIssueBody(finding, 'https://example.test/run'), /maintenance-fingerprint/);
assert.equal(chooseIssueAction(finding, false), 'create');
assert.equal(chooseIssueAction(duplicate, true), 'update');
assert.equal(chooseIssueAction(clean, true), 'recover');
assert.equal(chooseIssueAction(clean, false), 'none');

assert.deepEqual(classifyCommandOutput('outdated', 1, '{"pkg":{"current":"1","latest":"2"}}'), {
  found: true,
  infrastructureFailure: false,
  reason: 'findings detected',
});
assert.deepEqual(classifyCommandOutput('outdated', 1, '{"error":{"code":"EAI_AGAIN"}}'), {
  found: false,
  infrastructureFailure: true,
  reason: 'npm outdated returned an error envelope',
});
assert.equal(classifyCommandOutput('audit', 0, '{"metadata":{"vulnerabilities":{"total":0}}}').found, false);
assert.equal(classifyCommandOutput('links', 1, '{"passed":false,"links":[{"state":"BROKEN"}]}').found, true);
assert.equal(classifyCommandOutput('links', 0, '{"passed":true,"links":[{"state":"SKIPPED"}]}').found, false);
const wrongDirectory = classifyCommandOutput('links', 1, '');
assert.equal(wrongDirectory.found, false);
assert.equal(wrongDirectory.infrastructureFailure, true);

const missingCliArgument = spawnSync(
  process.execPath,
  [path.join(__dirname, 'classify-maintenance-command.js'), 'links', '1', 'payload.json', 'output', 'summary', 'result'],
  { encoding: 'utf8' },
);
assert.notEqual(missingCliArgument.status, 0);
assert.match(missingCliArgument.stderr, /usage: classify-maintenance-command/);

const transientLinkScan = runWithRetries(
  (attempt) => ({ exitCode: attempt === 1 ? 1 : 0 }),
  { wait: () => {} },
);
assert.deepEqual(transientLinkScan.attempts.map(({ exitCode }) => exitCode), [1, 0]);
assert.equal(transientLinkScan.final.exitCode, 0);

const persistentLinkScan = runWithRetries(
  () => ({ exitCode: 1 }),
  { wait: () => {} },
);
assert.deepEqual(persistentLinkScan.attempts.map(({ exitCode }) => exitCode), [1, 1, 1]);
assert.equal(persistentLinkScan.final.exitCode, 1);
assert.equal(combineDiagnostics('command stderr\n', new Error('spawn failed')), 'command stderr\nspawn failed\n');

const exceptionUrl = 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/use-data-monitoring-committees-clinical-trials';
const exceptionManifest = {
  schemaVersion: 1,
  exceptions: [{
    url: exceptionUrl,
    reason: 'GitHub-hosted runners receive a false 404 for this official URL.',
    verifiedAt: '2026-07-22',
    recheckAfter: '2026-08-15',
  }],
};
const exceptions = parseExceptions(exceptionManifest, new Date('2026-07-22T12:00:00Z'));
assert.equal(exceptions.length, 1);
assert.equal(exceptions[0].skipPattern, `^${escapeRegExp(exceptionUrl)}$`);
assert.match(exceptionUrl, new RegExp(exceptions[0].skipPattern));
assert.doesNotMatch(`${exceptionUrl}?wide=true`, new RegExp(exceptions[0].skipPattern));
assert.doesNotThrow(() => requirePublishedReferences(exceptions, [exceptionUrl], [exceptionUrl]));
const evidence = exceptionEvidence(exceptions);
assert.deepEqual(Object.keys(evidence.exceptions[0]).sort(), ['reason', 'recheckAfter', 'url', 'verifiedAt']);
assert.doesNotThrow(() => parseExceptions(evidence, new Date('2026-07-22T12:00:00Z')));
assert.throws(() => requirePublishedReferences(exceptions, ['missing'], [exceptionUrl]), /canonical source/);
assert.throws(() => requirePublishedReferences(exceptions, [exceptionUrl], ['missing']), /published docs/);
assert.throws(
  () => parseExceptions(exceptionManifest, new Date('2026-08-15T00:00:00Z')),
  /expired on 2026-08-15/,
);
assert.throws(
  () => parseExceptions({ ...exceptionManifest, exceptions: [...exceptionManifest.exceptions, exceptionManifest.exceptions[0]] }, new Date('2026-07-22T00:00:00Z')),
  /duplicated/,
);
assert.throws(
  () => parseExceptions({
    ...exceptionManifest,
    exceptions: [{ ...exceptionManifest.exceptions[0], url: 'http://www.fda.gov/resource' }],
  }, new Date('2026-07-22T00:00:00Z')),
  /HTTPS URL/,
);
assert.throws(
  () => parseExceptions({
    ...exceptionManifest,
    exceptions: [{ ...exceptionManifest.exceptions[0], url: 'https://www.fda.gov/' }],
  }, new Date('2026-07-22T00:00:00Z')),
  /not a host-wide pattern/,
);
assert.throws(
  () => parseExceptions({
    ...exceptionManifest,
    exceptions: [{ ...exceptionManifest.exceptions[0], recheckAfter: '2026-07-22' }],
  }, new Date('2026-07-22T00:00:00Z')),
  /later than verifiedAt/,
);
assert.throws(
  () => parseExceptions({
    ...exceptionManifest,
    exceptions: [{ ...exceptionManifest.exceptions[0], verifiedAt: '2026-02-31' }],
  }, new Date('2026-07-22T00:00:00Z')),
  /not a valid date/,
);
assert.throws(
  () => parseExceptions({
    ...exceptionManifest,
    exceptions: [{ ...exceptionManifest.exceptions[0], verifiedAt: '2026-07-23' }],
  }, new Date('2026-07-22T00:00:00Z')),
  /cannot be in the future/,
);
assert.equal(loadExceptions().length, 1);

console.log('scheduled maintenance contract tests passed (clean/finding/infrastructure/duplicate/recovery)');
