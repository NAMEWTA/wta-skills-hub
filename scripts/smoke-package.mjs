/** Run via npm run smoke:package after building. --network resolves production deps via npm;
 * default is strictly offline and reuses an isolated copy of already-installed runtime deps. */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Use npm run smoke:package [-- --network]');
const network = process.argv.slice(2).includes('--network');
if (process.argv.slice(2).some((arg) => arg !== '--network')) throw new Error('Unknown smoke-test argument');
const temp = mkdtempSync(join(tmpdir(), 'wta-tarball-'));
function run(exe, args, options = {}) {
  const result = spawnSync(exe, args, { cwd: root, encoding: 'utf8', timeout: 120_000, ...options });
  assert.equal(result.status, 0, `${exe}: ${result.error?.message ?? ''}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
try {
  const output = JSON.parse(run(process.execPath, [npm, 'pack', '--json', '--ignore-scripts', '--pack-destination', temp]));
  const packed = (Array.isArray(output) ? output : Object.values(output)).find((entry) => entry?.filename && entry.files);
  assert.ok(packed, 'supported npm pack JSON response');
  const archive = join(temp, packed.filename);
  let installed;
  if (network) {
    const prefix = join(temp, 'consumer');
    mkdirSync(prefix);
    writeFileSync(join(prefix, 'package.json'), JSON.stringify({ private: true, name: 'wta-package-smoke', version: '1.0.0' }));
    run(process.execPath, [npm, 'install', '--prefix', prefix, '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', archive]);
    installed = join(prefix, 'node_modules', '@namewta', 'skills-hub');
  } else {
    run('tar', ['-xzf', archive, '-C', temp]);
    installed = join(temp, 'package');
    // Copy only the production dependency closure. The package is not linked to source.
    const packages = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')).packages;
    for (const [path, meta] of Object.entries(packages)) {
      if (path.startsWith('node_modules/') && !meta.dev) cpSync(join(root, path), join(installed, path), { recursive: true, dereference: true });
    }
  }
  assert.ok(!existsSync(join(installed, 'src')), 'consumer must run built distribution');
  assert.ok(!existsSync(join(installed, 'test')), 'test harness must not ship');
  const project = join(temp, '项目 with spaces');
  const home = join(temp, 'isolated-home');
  mkdirSync(project); mkdirSync(home);
  // Explicit Node binary, empty executable PATH: skill installation cannot secretly invoke npx/git.
  const env = { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: '', PATH: '', Path: '', NODE_PATH: '' };
  const cli = join(installed, 'bin', 'wta-skills-hub.mjs');
  const listed = JSON.parse(run(process.execPath, [cli, '--list', '--json'], { cwd: project, env }));
  assert.equal(listed.skills.length, 14);
  for (const scope of ['project', 'global']) {
    const args = [cli, '--all', '-a', 'codex,claude-code,agents', `--${scope}`, '--yes', '--json'];
    const first = JSON.parse(run(process.execPath, args, { cwd: project, env }));
    assert.equal(first.results.length, 28, 'Codex and generic paths must be deduplicated');
    assert.ok(first.results.every((entry) => entry.status === 'installed'));
    const second = JSON.parse(run(process.execPath, args, { cwd: project, env }));
    assert.ok(second.results.every((entry) => entry.status === 'identical'));
    const anchor = scope === 'project' ? project : home;
    for (const { name } of listed.skills) for (const config of ['.agents', '.claude']) {
      assert.ok(existsSync(join(anchor, config, 'skills', name, 'SKILL.md')));
      assert.ok(existsSync(join(anchor, config, 'skills', name, 'LICENSE')));
    }
  }
  // Explicit test invocation AFTER installation: the installer never runs skill code.
  let configurationDoctors = 0;
  for (const anchor of [project, home]) for (const config of ['.agents', '.claude']) {
    const skillCli = join(anchor, config, 'skills', 'optimize-codex-config', 'scripts', 'ai-cli-config.mjs');
    const codexHome = join(temp, 'absent-codex');
    const claudeHome = join(temp, 'absent-claude');
    const report = JSON.parse(run(process.execPath, [skillCli, 'doctor', '--client', 'all',
      '--codex-home', codexHome, '--claude-home', claudeHome], { cwd: project, env }));
    assert.equal(report.commands, 'not-run');
    assert.equal(report.credential_contents, 'not-read');
    assert.equal(report.clients.length, 2);
    assert.ok(!existsSync(codexHome) && !existsSync(claudeHome), 'doctor must not initialize user config');
    configurationDoctors++;
  }
  console.log(JSON.stringify({ passed: true, configurationDoctors, dependencyMode: network ? 'fresh-npm-production-install' : 'offline-copied-production-closure',
    version: listed.version, skills: 14, targetDirectories: 56, scopes: ['project', 'global'], duplicatePass: 'identical', sha512: packed.integrity }, null, 2));
} finally { rmSync(temp, { recursive: true, force: true }); }
