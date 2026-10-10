import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, realpath, mkdir, writeFile, readFile, rm, symlink, chmod, readdir, cp, open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseDocument, patchDocument } from '../skills/system/optimize-codex-config/scripts/lib/document.mjs';
import { inspect, publicReport, rulesFor, selectedClients } from '../skills/system/optimize-codex-config/scripts/lib/inspect.mjs';
import { createPlan, savePlan, loadPlan } from '../skills/system/optimize-codex-config/scripts/lib/plan.mjs';
import { apply, rollback, verify } from '../skills/system/optimize-codex-config/scripts/lib/transaction.mjs';
import { metadata } from '../skills/system/optimize-codex-config/scripts/lib/io.mjs';
import { observeWriters } from '../skills/system/optimize-codex-config/scripts/lib/writers.mjs';
import { render, normalize, metric } from '../skills/system/optimize-codex-config/scripts/statusline/claude-statusline.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skill = join(root, 'skills/system/optimize-codex-config');
const entry = join(skill, 'scripts/ai-cli-config.mjs');
const statusline = join(skill, 'scripts/statusline/claude-statusline.mjs');
const clear = async () => ({ state: 'clear', method: 'test-fixture-only' });
async function fixture(t, client = 'all') {
  const directory = await mkdtemp(join(await realpath(tmpdir()), 'wta-ai-config-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const spec = { client, scope: 'user', codex_home: join(directory, 'codex'), claude_home: join(directory, 'claude'),
    evidence: join(directory, 'capabilities.json'), mode: 'local-private' };
  const clients = {};
  for (const selected of selectedClients(spec)) {
    const { rules } = await rulesFor(spec, selected);
    clients[selected] = { version: 'fixture-9.9.9', verification: 'manual-local', higher_precedence_reviewed: true,
      scopes: ['user', 'project'], keys: rules.map(r => r.path.join('.')),
      status_items: ['model-with-reasoning', 'context-used', 'five-hour-limit', 'weekly-limit', 'context-window-size'] };
  }
  await writeFile(spec.evidence, JSON.stringify({ schema_version: 1, reviewed_at: new Date().toISOString(), clients }));
  return { directory, spec };
}
async function put(path, text) { await mkdir(dirname(path), { recursive: true, mode: 0o700 }); await writeFile(path, text); }
async function planFixture(t, client = 'all') { const f = await fixture(t, client); return { ...f, plan: await createPlan(f.spec, { env: {} }) }; }
const options = plan => ({ confirm: plan.id, quiescent: true, observe: clear, env: {} });

for (const [name, source] of [
  ['standard', '# personal comment\nmodel="kept"\n[otel]\nlog_user_prompt=true # marker\n[other]\nx=42\n'],
  ['dotted', 'model="kept"\notel.log_user_prompt=true # marker\n'],
  ['inline', 'model="kept"\notel={log_user_prompt=true, nested={value="kept"}}\n'],
  ['quoted', '"otel"."log_user_prompt"=true\n["unrelated.dot"]\na="kept"\n'],
]) test('TOML range patch preserves unrelated content: ' + name, () => {
  const output = patchDocument(source, 'toml', [{ path: ['otel', 'log_user_prompt'], value: false }]);
  assert.equal(parseDocument(output, 'toml').value.otel.log_user_prompt, false);
  assert.ok(output.includes('kept'));
  assert.equal(patchDocument(output, 'toml', [{ path: ['otel', 'log_user_prompt'], value: false }]), output);
});
for (const source of [
  '[otel.metrics_exporter.otlp-http]\nendpoint="secret"\nheaders={Authorization="secret"}\n[unrelated]\nvalue="kept"\n',
  '[otel]\nmetrics_exporter={otlp-http={endpoint="secret"}}\n# kept\n',
  'otel.metrics_exporter.otlp-http.endpoint="secret"\n# kept\n',
]) test('table exporter migration is legal and confined to exporter subtree', () => {
  const out = patchDocument(source, 'toml', [{ path: ['otel', 'metrics_exporter'], value: 'none' }]);
  assert.equal(parseDocument(out, 'toml').value.otel.metrics_exporter, 'none');
  assert.match(out, /kept/); assert.doesNotMatch(out, /secret/);
});
test('complex TOML arrays, multiline strings, dates and nested quoted tables survive', () => {
  const source = `# retained\ntext='''line\nline'''\ntime=1979-05-27T07:32:00Z\nbig=9223372036854775807\n[[agents.fixture]]\nname="kept"\n[model_providers."private.id"]\nhttp_headers={"X-Private"="never-print"}\n`;
  const out = patchDocument(source, 'toml', [{ path: ['tui', 'status_line'], value: ['context-used', 'five-hour-limit', 'weekly-limit'] }]);
  assert.ok(out.endsWith(source));
  assert.deepEqual(parseDocument(out, 'toml').value.tui.status_line, ['context-used', 'five-hour-limit', 'weekly-limit']);
});
test('strict JSON edits preserve secrets in file but reject duplicates, comments and unsafe keys', () => {
  const source = '{\n  "apiKey": "secret",\n  "env": {"CUSTOM": "retained"}\n}\n';
  const out = patchDocument(source, 'json', [{ path: ['env', 'DISABLE_TELEMETRY'], value: '1' }]);
  assert.match(out, /"apiKey": "secret"/); assert.match(out, /"CUSTOM": "retained"/);
  for (const input of ['{"x":1,"x":2}', '{/*x*/}', '{"x":1,}', '{"__proto__":{}}', '[]']) assert.throws(() => parseDocument(input, 'json'));
  assert.throws(() => parseDocument('__proto__.x=1', 'toml'));
  assert.throws(() => patchDocument('otel=false', 'toml', [{ path: ['otel', 'exporter'], value: 'none' }]), /parent_type_conflict/);
  assert.throws(() => parseDocument('x="secret', 'toml'), error => !error.message.includes('secret'));
});
test('doctor accepts missing homes without creating them or reading credentials', async t => {
  const { spec } = await fixture(t);
  const snapshot = await inspect(spec, { env: {} });
  assert.equal(snapshot.clients.length, 2);
  assert.equal((await metadata(spec.codex_home)).exists, false);
  assert.equal((await metadata(spec.claude_home)).exists, false);
  assert.equal(publicReport(snapshot).credential_contents, 'not-read');
});
test('doctor and plans never expose source config values, credentials or URLs', async t => {
  const { spec } = await fixture(t);
  const secret = 'UNIQUE-NEVER-OUTPUT-SECRET';
  await put(join(spec.codex_home, 'config.toml'), `model="${secret}"\n[model_providers.private]\nbase_url="https://${secret}.invalid"\n[otel.metrics_exporter.otlp-http]\nendpoint="${secret}"\n`);
  await put(join(spec.codex_home, 'auth.json'), secret);
  await put(join(spec.claude_home, 'settings.json'), JSON.stringify({ env: { API_KEY: secret }, apiKeyHelper: secret }));
  await put(join(spec.claude_home, '.credentials.json'), secret);
  const output = JSON.stringify(publicReport(await inspect(spec, { env: {} }))) + JSON.stringify(await createPlan(spec, { env: {} }));
  assert.ok(!output.includes(secret)); assert.ok(!output.includes('model_providers.private'));
  const value = publicReport(await inspect(spec, { env: {} })).clients[0].configuration;
  assert.equal(Object.hasOwn(value, 'text'), false); assert.equal(Object.hasOwn(value, 'value'), false); assert.equal(Object.hasOwn(value, 'path'), false);
});
test('unknown version, expired and incomplete attestations block writes, not reports', async t => {
  const { spec } = await fixture(t, 'claude');
  for (const evidence of [null, {schema_version:1,reviewed_at:'2000-01-01',clients:{}}, {schema_version:1,reviewed_at:new Date().toISOString(),clients:{claude:{version:'x'}}}]) {
    const input = { ...spec, evidence: evidence ? spec.evidence : null };
    if (evidence) await writeFile(spec.evidence, JSON.stringify(evidence));
    const plan = await createPlan(input, { env: {} });
    assert.equal(plan.ready, false);
    await assert.rejects(apply(plan, options(plan)), /plan_blocked/);
  }
});
test('environment conflicts are detected without logging the raw value', async t => {
  const { spec } = await fixture(t, 'claude');
  const plan = await createPlan(spec, { env: { CLAUDE_CODE_ENABLE_TELEMETRY: 'secret-value' } });
  assert.equal(plan.ready, false); assert.doesNotMatch(JSON.stringify(plan), /secret-value/);
  assert.ok(plan.findings.some(f => f.code === 'inherited_environment_conflict'));
  const nonempty = await createPlan(spec, { env: { DISABLE_TELEMETRY: 'false' } });
  assert.ok(!nonempty.findings.some(f => f.code === 'inherited_environment_conflict'));
});
test('existing callback needs explicit replacement; disabled hooks stay disabled', async t => {
  const { spec } = await fixture(t, 'claude');
  await put(join(spec.claude_home, 'settings.json'), '{"statusLine":{"type":"command","command":"custom-private"}}');
  assert.equal((await createPlan(spec, { env: {} })).ready, false);
  assert.equal((await createPlan({ ...spec, replace_statusline: true }, { env: {} })).ready, true);
  await put(join(spec.claude_home, 'settings.json'), '{"disableAllHooks":true}');
  const blocked = await createPlan({ ...spec, replace_statusline: true }, { env: {} });
  assert.equal(blocked.ready, false); assert.match(JSON.stringify(blocked.findings), /disableAllHooks/);
});
test('higher-precedence project settings and Codex profile selection are not silently ignored', async t => {
  const { spec, directory } = await fixture(t);
  const project = join(directory, 'project');
  await put(join(project, '.claude/settings.json'), '{"env":{"DISABLE_TELEMETRY":""}}');
  const plan = await createPlan({ ...spec, project }, { env: {} });
  assert.match(JSON.stringify(plan.findings), /higher_precedence_override/);
  await put(join(spec.codex_home, 'config.toml'), 'profile="personal"');
  assert.match(JSON.stringify((await createPlan(spec, { env: {} })).findings), /profile_selection_requires_operator_review/);
});
test('project Claude writes are local to the project; Codex machine privacy stays blocked', async t => {
  const { spec, directory } = await fixture(t);
  const project = join(directory, 'project'); await mkdir(project);
  const claude = await createPlan({ ...spec, client: 'claude', scope: 'project', project }, { env: {} });
  assert.equal(claude.ready, true); assert.ok(claude.entries.every(e => e.path.startsWith(project)));
  assert.ok(claude.entries.some(e => e.path.endsWith('settings.local.json')));
  const codex = await createPlan({ ...spec, client: 'codex', scope: 'project', project }, { env: {} });
  assert.equal(codex.ready, false); assert.match(JSON.stringify(codex.findings), /requires_user_scope:otel/);
});
test('two-client initialization, private backups, verification and no-op second plan', async t => {
  const { plan, spec } = await planFixture(t);
  assert.equal(plan.ready, true, JSON.stringify(plan.findings));
  assert.equal((await apply(plan, options(plan))).status, 'applied');
  assert.equal((await verify(plan)).passed, true);
  assert.equal((await apply(plan, options(plan))).status, 'already-applied');
  const again = await createPlan(spec, { env: {} });
  assert.ok(again.entries.every(e => e.noop));
  assert.equal((await apply(again, options(again))).status, 'no-change');
  assert.equal((await rollback(plan, options(plan))).status, 'rolled-back');
  for (const entry of plan.entries) assert.equal((await metadata(entry.path)).exists, false);
});
test('existing configs retain unrelated settings and restore exact original bytes', async t => {
  const { spec } = await fixture(t);
  const toml = '# hand-edited\nmodel="kept"\n[otel.metrics_exporter.otlp-http]\nendpoint="secret"\n';
  const json = '{\n  "env": {"SECRET":"keep"},\n  "permissions": {"allow": ["Read(*)"]}\n}\n';
  await put(join(spec.codex_home, 'config.toml'), toml); await put(join(spec.claude_home, 'settings.json'), json);
  const plan = await createPlan(spec, { env: {} });
  await apply(plan, options(plan));
  const c = JSON.parse(await readFile(join(spec.claude_home, 'settings.json'), 'utf8'));
  assert.equal(c.env.SECRET, 'keep'); assert.deepEqual(c.permissions, { allow: ['Read(*)'] });
  if (process.platform !== 'win32') {
    const backup = join(spec.codex_home, '.wta-ai-cli-config/transactions', plan.id, '0.pre-optimize.bak');
    assert.equal((await metadata(backup)).mode, 0o600);
  }
  await rollback(plan, options(plan));
  assert.equal(await readFile(join(spec.codex_home, 'config.toml'), 'utf8'), toml);
  assert.equal(await readFile(join(spec.claude_home, 'settings.json'), 'utf8'), json);
});
test('confirmation, busy/unknown writers and stale plans fail before changing config', async t => {
  const { spec } = await fixture(t, 'codex');
  const target = join(spec.codex_home, 'config.toml'); await put(target, '# original\n');
  let plan = await createPlan(spec, { env: {} });
  await assert.rejects(apply(plan, {}), /exact_confirmation/);
  for (const state of ['busy', 'unknown']) await assert.rejects(apply(plan, { ...options(plan), observe: async () => ({ state }) }));
  assert.equal(await readFile(target, 'utf8'), '# original\n');
  await writeFile(target, '# edited\n');
  await assert.rejects(apply(plan, options(plan)), /plan_stale/);
  assert.equal(await readFile(target, 'utf8'), '# edited\n');
});
test('failure after a commit rolls back the batch', async t => {
  const { plan } = await planFixture(t);
  await assert.rejects(apply(plan, { ...options(plan), checkpoint: async (event, i) => { if (event === 'committed' && i === 0) throw new Error('injected'); } }), e => e.rollback === 'restored');
  for (const entry of plan.entries) assert.equal((await metadata(entry.path)).exists, false);
});
test('rollback refuses later user edits', async t => {
  const { plan } = await planFixture(t);
  await apply(plan, options(plan));
  await writeFile(plan.entries[0].path, '# later user edit\n');
  await assert.rejects(rollback(plan, options(plan)), /rollback_target_changed/);
  assert.equal(await readFile(plan.entries[0].path, 'utf8'), '# later user edit\n');
});
test('no-replace creation catches another writer after staging', async t => {
  const { plan } = await planFixture(t, 'codex');
  await assert.rejects(apply(plan, { ...options(plan), checkpoint: async event => {
    if (event === 'staged') await writeFile(plan.entries[0].path, '# external\n');
  } }), /plan_stale/);
  assert.equal(await readFile(plan.entries[0].path, 'utf8'), '# external\n');
});
test('plan artifacts are exclusive, integrity-bound and cannot inject a new command', async t => {
  const { plan, directory } = await planFixture(t, 'claude');
  const path = join(directory, 'review.plan.json'); await savePlan(plan, path);
  const loaded = await loadPlan(path); assert.equal(loaded.id, plan.id);
  await assert.rejects(savePlan(plan, path));
  const damaged = JSON.parse(await readFile(path, 'utf8')); damaged.entries[0].path = join(directory, 'auth.json');
  await writeFile(path, JSON.stringify(damaged)); await assert.rejects(loadPlan(path), /plan_integrity/);
});
test('symlink targets and damaged syntax are blocked without a destructive fallback', async t => {
  const { spec, directory } = await fixture(t, 'codex');
  const external = join(directory, 'external'); await mkdir(external);
  const sentinel = join(external, 'keep.txt');
  await writeFile(sentinel, 'external fixture must survive link cleanup');
  await symlink(external, spec.codex_home, process.platform === 'win32' ? 'junction' : 'dir');
  const linked = await createPlan(spec, { env: {} }); assert.equal(linked.ready, false);
  // Directory links/junctions need recursive rm on some supported Node versions.
  // Prove the link target is not followed or removed by the fixture cleanup.
  await rm(spec.codex_home, { recursive: true });
  assert.equal(await readFile(sentinel, 'utf8'), 'external fixture must survive link cleanup');
  await mkdir(spec.codex_home);
  await put(join(spec.codex_home, 'config.toml'), 'broken = "secret');
  const broken = await createPlan(spec, { env: {} }); assert.equal(broken.ready, false);
  assert.doesNotMatch(JSON.stringify(broken), /secret/);
});
test('stale locks are not stolen', async t => {
  const { plan } = await planFixture(t, 'codex');
  await mkdir(join(plan.entries[0].root, '.wta-ai-cli-config/lock'), { recursive: true, mode: 0o700 });
  await assert.rejects(apply(plan, options(plan)), /transaction_lock_exists/);
});
test('unknown and zero quota semantics; reset timestamps are seconds, not milliseconds', () => {
  const now = 1800000000000;
  assert.equal(metric(0, null, now).remaining, 100);
  assert.equal(metric(100, null, now).remaining, 0);
  for (const value of [null, undefined, -1, 101, NaN, Infinity, '0']) assert.equal(metric(value, null, now).remaining, null);
  assert.equal(metric(20, now / 1000 - 1, now).state, 'stale');
  assert.equal(metric(20, now, now).state, 'invalid');
  const n = normalize({ context_window: { used_percentage: 50, current_usage: null } }, now);
  assert.notEqual(n.context.state, 'available');
});
test('renderer covers required metrics, narrow ASCII output, malformed strings and terminal injection', () => {
  const input = { model: { display_name: '\x1b[31mClaude\nunsafe\x1b]8;;https://evil\x07' }, context_window: { used_percentage: 0 },
    rate_limits: { five_hour: { used_percentage: 25 }, seven_day: { used_percentage: 100 } } };
  const output = render(input);
  assert.match(output, /CTX used 0%/); assert.match(output, /5h left 75%/); assert.match(output, /7d left 0%/);
  assert.doesNotMatch(output, /[\x00-\x1f\x7f]/);
  assert.ok(render(input, { width: 35 }).length <= 35);
  assert.match(render({}), /--/);
});
test('renderer bounded input and malformed JSON exit safely', () => {
  for (const input of ['bad json', 'x'.repeat(300000), '{}']) {
    const run = spawnSync(process.execPath, [statusline], { input, encoding: 'utf8', timeout: 3000 });
    assert.equal(run.status, 0, run.stderr); assert.ok(run.stdout.length < 500); assert.equal(run.stderr, '');
  }
});
test('standalone copied skill runs without repository dependencies, PATH commands or credentials', async t => {
  const { directory, spec } = await fixture(t, 'codex');
  const copy = join(directory, 'isolated-skill'); await cp(skill, copy, { recursive: true });
  await put(join(spec.codex_home, 'auth.json'), 'must-not-read');
  const run = spawnSync(process.execPath, [join(copy, 'scripts/ai-cli-config.mjs'), 'doctor', '--client', 'codex', '--codex-home', spec.codex_home], {
    cwd: directory, encoding: 'utf8', env: { PATH: '', HOME: directory, USERPROFILE: directory }, timeout: 5000,
  });
  assert.equal(run.status, 0, run.stderr); assert.equal(JSON.parse(run.stdout).commands, 'not-run');
});
test('parser bundle hash and licenses travel with the standalone skill', async () => {
  const path = join(skill, 'scripts/vendor');
  const manifest = JSON.parse(await readFile(join(path, 'manifest.json'), 'utf8'));
  const bytes = await readFile(join(path, 'parsers.mjs'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256);
  const notices = await readFile(join(path, 'THIRD-PARTY-NOTICES.txt'), 'utf8');
  assert.match(notices, /toml-eslint-parser/); assert.match(notices, /jsonc-parser/);
});
test('CLI rejects typos/incompatible mutation arguments and help does not inspect anything', () => {
  for (const args of [['--made-up'], ['doctor','--confirm','x'], ['plan','--scope','project'], ['apply','--client','codex']]) {
    const run = spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8' }); assert.equal(run.status, 2);
  }
  assert.equal(spawnSync(process.execPath, [entry, '--help'], { encoding: 'utf8' }).status, 0);
});
test('real Linux observer detects a controlled writable handle', { skip: process.platform !== 'linux' }, async t => {
  const { directory } = await fixture(t, 'codex');
  const file = join(directory, 'held.toml'); await writeFile(file, '# fixture');
  const child = spawn(process.execPath, ['-e', `const f=require('fs');f.openSync(process.argv[1],'r+');console.log('ready');setInterval(()=>{},1000)`, file], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  await new Promise((res, rej) => { child.stdout.once('data', res); child.once('error', rej); });
  assert.equal((await observeWriters(file)).state, 'busy');
});
test('Windows replacement is honestly blocked without a handle observer', { skip: process.platform !== 'win32' }, async t => {
  const { directory } = await fixture(t, 'codex');
  const path = join(directory, 'config.toml'); await writeFile(path, '# test');
  assert.equal((await observeWriters(path)).state, 'unknown');
});
test('doctor, plan and renderer make zero prohibited API calls even when failures would be caught', async t => {
  const { spec, directory } = await fixture(t);
  await put(join(spec.codex_home, 'auth.json'), 'secret');
  await put(join(spec.claude_home, '.credentials.json'), 'secret');
  // --import expects an ESM specifier; Windows drive paths are not URL schemes.
  const guard = pathToFileURL(join(root, 'test/fixtures/ai-cli-config/deny-runtime.mjs')).href;
  const cleanEnv = { PATH: '', HOME: directory, USERPROFILE: directory };
  for (const command of ['doctor', 'plan']) {
    const run = spawnSync(process.execPath, ['--import', guard, entry, command, '--client', 'all', '--codex-home', spec.codex_home, '--claude-home', spec.claude_home], {
      encoding: 'utf8', env: cleanEnv, timeout: 5000,
    });
    assert.equal(run.status, 0, run.stderr); assert.doesNotMatch(run.stdout, /secret/);
  }
  const bar = spawnSync(process.execPath, ['--import', guard, statusline], { input: '{}', env: cleanEnv, encoding: 'utf8', timeout: 5000 });
  assert.equal(bar.status, 0, bar.stderr);
});
test('verification notices changes to previously reviewed higher-precedence files', async t => {
  const { spec, directory } = await fixture(t, 'claude');
  const project = join(directory, 'project'); await mkdir(project);
  const plan = await createPlan({ ...spec, project }, { env: {} });
  await apply(plan, options(plan));
  await put(join(project, '.claude/settings.json'), '{"env":{"DISABLE_TELEMETRY":""}}');
  const result = await verify(plan, { env: {} });
  assert.equal(result.passed, false); assert.equal(result.dependencies, false);
});
test('late mutation blocks automatic rollback rather than overwriting the user', async t => {
  const { plan } = await planFixture(t, 'codex');
  await assert.rejects(apply(plan, { ...options(plan), checkpoint: async (event, index) => {
    if (event === 'committed') { await writeFile(plan.entries[index].path, '# user-edit'); throw new Error('injected'); }
  } }), error => error.rollback === 'blocked:rollback_target_changed');
  assert.equal(await readFile(plan.entries[0].path, 'utf8'), '# user-edit');
});
test('duplicate CLI options are rejected, not silently last-wins', () => {
  const run = spawnSync(process.execPath, [entry, 'plan', '--client', 'claude', '--client', 'codex'], { encoding: 'utf8' });
  assert.equal(run.status, 2); assert.match(run.stderr, /duplicate_option/);
});
test('Linux syscall filter permits offline workflows and traps a network negative control', { skip: process.platform !== 'linux' }, async t => {
  const { spec, directory } = await fixture(t, 'codex');
  const launcher = join(root, 'test/fixtures/ai-cli-config/no-network.py');
  const probe = spawnSync('python3', [launcher, process.execPath, '-e', 'process.stdout.write("ok")'], { encoding: 'utf8' });
  if (probe.error?.code === 'ENOENT' || probe.status === 77) { t.skip('Python3 or libseccomp unavailable'); return; }
  assert.equal(probe.status, 0, probe.stderr);
  // The denied socket is local and never reaches a service, even without this filter.
  const negative = spawnSync('python3', [launcher, process.execPath, '-e', 'require("node:net").createServer().listen(0,"127.0.0.1")'], { encoding: 'utf8', timeout: 5000 });
  assert.equal(negative.signal, 'SIGSYS');
  for (const command of ['doctor', 'plan']) {
    const run = spawnSync('python3', [launcher, process.execPath, entry, command, '--client', 'codex', '--codex-home', spec.codex_home], {
      cwd: directory, encoding: 'utf8', timeout: 5000,
    });
    assert.equal(run.status, 0, run.stderr);
  }
  const bar = spawnSync('python3', [launcher, process.execPath, statusline], { input: '{}', encoding: 'utf8', timeout: 5000 });
  assert.equal(bar.status, 0, bar.stderr);
});
