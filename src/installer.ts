import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync, realpathSync,
  renameSync, rmSync, rmdirSync, openSync, closeSync, chmodSync } from 'node:fs';
import { dirname, join, relative, resolve, sep, isAbsolute } from 'node:path';
import type { Skill } from '../lib/discover-skills.mjs';

export const AGENTS = ['codex', 'claude-code', 'agents'] as const;
export type Agent = typeof AGENTS[number];
export type Scope = 'global' | 'project';
export type Existing = 'error' | 'skip' | 'backup';
export type Target = { anchor: string; root: string; agents: Agent[]; variant: 'portable' | 'claude' };
export type FileData = { path: string; bytes: Buffer; mode: number };
export type Entry = { name: string; target: Target; destination: string; files: FileData[];
  digest: string; before: string | null; action: 'create' | 'identical' | 'conflict' };
export type Result = { name: string; destination: string; status: 'installed' | 'replaced' | 'identical' | 'skipped'; backup?: string };
const MARKER = '.wta-skills-hub.json';
const IGNORED = new Set(['.git', '.gitignore', '.npmignore', '.DS_Store', '__pycache__', 'node_modules', MARKER]);
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function stat(path: string) {
  try { return lstatSync(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
function childPath(anchor: string, path: string) {
  const rel = relative(anchor, path);
  if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`) || resolve(anchor, rel) !== path) throw new Error(`路径越界: ${path}`);
  return rel;
}
/** Resolve the trusted home/project anchor, then refuse links/reparse targets beneath it. */
export function safePath(anchor: string, path: string): void {
  const rel = childPath(anchor, path);
  let current = anchor;
  for (const part of rel.split(sep).filter(Boolean)) {
    current = join(current, part);
    const info = stat(current);
    if (info && (info.isSymbolicLink() || !info.isDirectory())) throw new Error(`拒绝符号链接或非目录路径: ${current}`);
  }
}
export function resolveTargets(agents: Agent[], scope: Scope, home: string, cwd: string): Target[] {
  if (!agents.length || !['global', 'project'].includes(scope)) throw new Error('必须选择工具和作用域');
  const anchor = realpathSync(scope === 'global' ? home : cwd);
  if (!stat(anchor)?.isDirectory()) throw new Error(`目标不是目录: ${anchor}`);
  const targets = new Map<string, Target>();
  for (const agent of agents) {
    if (!AGENTS.includes(agent)) throw new Error(`不支持的工具: ${agent}`);
    const root = join(anchor, agent === 'claude-code' ? '.claude' : '.agents', 'skills');
    const item = targets.get(root) ?? { anchor, root, agents: [], variant: agent === 'claude-code' ? 'claude' : 'portable' };
    if (!item.agents.includes(agent)) item.agents.push(agent);
    targets.set(root, item);
  }
  for (const target of targets.values()) safePath(target.anchor, target.root);
  return [...targets.values()].sort((a, b) => a.root.localeCompare(b.root));
}
/** Do not dereference links, devices, sockets, or special files from either side. */
export function readTree(root: string, source = false): FileData[] {
  const out: FileData[] = [];
  function walk(dir: string) {
    const info = stat(dir);
    if (!info?.isDirectory() || info.isSymbolicLink()) throw new Error(`拒绝非真实目录: ${dir}`);
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      // Installed user files participate in the conflict digest; only our marker is excluded.
      if (entry.name === MARKER || (source && (IGNORED.has(entry.name) || /\.py[co]$/.test(entry.name)))) continue;
      const item = lstatSync(path);
      if (item.isSymbolicLink()) throw new Error(`拒绝符号链接资源: ${path}`);
      if (item.isDirectory()) walk(path);
      else if (item.isFile()) out.push({ path: relative(root, path).split(sep).join('/'), bytes: readFileSync(path), mode: item.mode & 0o777 });
      else throw new Error(`拒绝特殊文件: ${path}`);
    }
  }
  walk(root);
  return out;
}
function digest(files: FileData[]): string {
  const hash = createHash('sha256');
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path).update('\0').update(String(file.bytes.length)).update('\0').update(file.bytes);
  }
  return hash.digest('hex');
}
function readDigest(path: string): string | null { return stat(path) ? digest(readTree(path)) : null; }

export function planInstall(skills: Skill[], targets: Target[]): Entry[] {
  if (!skills.length || !targets.length) throw new Error('安装计划不能为空');
  const entries: Entry[] = [];
  const seen = new Set<string>();
  for (const target of targets) for (const skill of skills) {
    if (!ID.test(skill.name) || skill.name.length > 64 || ['synced', 'anthropic-skills'].includes(skill.name)) throw new Error(`非法技能名称: ${skill.name}`);
    safePath(target.anchor, target.root);
    const destination = join(target.root, skill.name);
    safePath(target.anchor, destination);
    if (seen.has(destination)) continue;
    seen.add(destination);
    const files = readTree(dirname(skill.file), true);
    if (!files.some((file) => file.path === 'SKILL.md')) throw new Error(`${skill.name}: 缺少 SKILL.md`);
    if (target.variant === 'claude' && skill.explicitOnly) {
      const main = files.find((file) => file.path === 'SKILL.md')!;
      main.bytes = Buffer.from(main.bytes.toString('utf8').replace(/^---\r?\n/, '---\ndisable-model-invocation: true\n'));
    }
    const hash = digest(files);
    const before = readDigest(destination);
    entries.push({ name: skill.name, target, destination, files, digest: hash, before,
      action: before === null ? 'create' : before === hash ? 'identical' : 'conflict' });
  }
  return entries;
}
/** Synchronous commit window: prompts/cancellation happen before any write. Backups are never auto-deleted. */
export function applyInstall(entries: Entry[], existing: Existing, version: string,
  hooks: { beforeCommit?: (entry: Entry, index: number) => void } = {}): Result[] {
  if (!['error', 'skip', 'backup'].includes(existing)) throw new Error('非法冲突策略');
  if (existing === 'error' && entries.some((e) => e.action === 'conflict')) throw new Error('存在同名目录；使用 --existing skip 或 --overwrite（备份后替换）');
  const pending = entries.filter((entry) => entry.action !== 'identical' && !(entry.action === 'conflict' && existing === 'skip'));
  for (const entry of entries) {
    safePath(entry.target.anchor, entry.destination);
    if (readDigest(entry.destination) !== entry.before) throw new Error(`预览后目标已变化，请重新运行: ${entry.destination}`);
  }
  if (!pending.length) return entries.map((entry) => ({ name: entry.name, destination: entry.destination, status: entry.action === 'identical' ? 'identical' : 'skipped' }));
  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
  const locks: string[] = [], created: string[] = [];
  const journal: { entry: Entry; stage: string; backup: string | null; written: boolean }[] = [];
  function ensureDir(target: Target, path: string) {
    safePath(target.anchor, path);
    let current = target.anchor;
    for (const part of childPath(target.anchor, path).split(sep).filter(Boolean)) {
      current = join(current, part);
      if (!stat(current)) { mkdirSync(current, { mode: 0o700 }); created.push(current); }
      safePath(target.anchor, current);
    }
  }
  try {
    // Fixed ordering avoids cross-target deadlocks; an existing lock fails immediately.
    for (const target of [...new Map(pending.map((entry) => [entry.target.root, entry.target])).values()].sort((a,b) => a.root.localeCompare(b.root))) {
      ensureDir(target, target.root);
      const lock = join(target.root, '.wta-skills-hub.lock');
      let fd: number;
      try { fd = openSync(lock, 'wx', 0o600); } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`安装锁已存在: ${lock}。确认没有安装进程后再手工移除，不能自动抢锁。`);
        throw error;
      }
      locks.push(lock);
      try { writeFileSync(fd, JSON.stringify({ pid: process.pid, id })); } finally { closeSync(fd); }
    }
    // Stage all payloads before mutating any installed skill.
    for (const entry of pending) {
      safePath(entry.target.anchor, entry.destination);
      if (readDigest(entry.destination) !== entry.before) throw new Error(`预览后目标已变化，请重新运行: ${entry.destination}`);
      const stage = join(dirname(entry.target.root), `.wta-stage-${id}-${entry.name}`);
      mkdirSync(stage, { mode: 0o700 });
      journal.push({ entry, stage, backup: null, written: false });
      for (const file of entry.files) {
        const dest = resolve(stage, file.path);
        childPath(stage, dest);
        mkdirSync(dirname(dest), { recursive: true, mode: 0o700 });
        writeFileSync(dest, file.bytes, { flag: 'wx', mode: file.mode & 0o700 });
        // Preserve executable scripts; strip group/world access to avoid leaking user backups.
        chmodSync(dest, (file.mode & 0o100) ? 0o700 : 0o600);
      }
      writeFileSync(join(stage, MARKER), JSON.stringify({ schemaVersion: 1, package: '@namewta/skills-hub', version,
        skill: entry.name, variant: entry.target.variant, digest: entry.digest,
        installedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    }
    for (const [index, item] of journal.entries()) {
      const { entry } = item;
      hooks.beforeCommit?.(entry, index);
      safePath(entry.target.anchor, entry.destination);
      if (readDigest(entry.destination) !== entry.before) throw new Error(`提交前目标已变化: ${entry.destination}`);
      if (entry.before !== null) {
        const backupRoot = join(entry.target.anchor, '.wta-skills-hub', 'backups', entry.target.variant, id);
        ensureDir(entry.target, backupRoot);
        const backup = join(backupRoot, entry.name);
        if (stat(backup)) throw new Error(`备份已存在: ${backup}`);
        renameSync(entry.destination, backup);
        item.backup = backup;
      }
      renameSync(item.stage, entry.destination);
      item.written = true;
      if (readDigest(entry.destination) !== entry.digest) throw new Error(`写后校验失败: ${entry.destination}`);
    }
    return entries.map((entry) => {
      const item = journal.find((j) => j.entry === entry);
      return { name: entry.name, destination: entry.destination,
        status: item ? item.backup ? 'replaced' : 'installed' : entry.action === 'identical' ? 'identical' : 'skipped',
        ...(item?.backup ? { backup: item.backup } : {}) };
    });
  } catch (error) {
    const failures: string[] = [];
    for (const item of [...journal].reverse()) {
      try {
        safePath(item.entry.target.anchor, item.entry.destination);
        if (item.written) {
          // Never destroy edits made by another actor during rollback.
          if (readDigest(item.entry.destination) !== item.entry.digest) throw new Error('目标已被外部修改；保留目标及备份');
          rmSync(item.entry.destination, { recursive: true });
        }
        if (item.backup) {
          if (stat(item.entry.destination)) throw new Error('恢复目标被占用；保留备份');
          renameSync(item.backup, item.entry.destination);
        }
      } catch (failure) { failures.push(`${item.entry.destination}: ${(failure as Error).message}; backup=${item.backup ?? '无'}`); }
    }
    if (failures.length) throw new Error(`${(error as Error).message}\n回滚需人工处理:\n${failures.join('\n')}`);
    throw error;
  } finally {
    for (const item of journal) rmSync(item.stage, { recursive: true, force: true });
    for (const lock of locks.reverse()) rmSync(lock, { force: true });
    for (const path of created.reverse()) { try { rmdirSync(path); } catch { /* Only remove empty directories we created. */ } }
  }
}
