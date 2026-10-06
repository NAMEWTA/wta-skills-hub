import * as p from '@clack/prompts';
import { defineCommand, parseArgs as parseCittyArgs, renderUsage, type ArgsDef } from 'citty';
import { parseArgs as tokenize } from 'node:util';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { CATEGORIES, discoverSkills, type Skill } from '../lib/discover-skills.mjs';
import { AGENTS, applyInstall, planInstall, resolveTargets, type Agent, type Existing, type Scope } from './installer.js';

export class Cancelled extends Error { constructor() { super('已取消，没有安装任何技能。'); } }
export function choice<T>(value: T): Exclude<T, symbol> { if (p.isCancel(value)) throw new Cancelled(); return value as Exclude<T, symbol>; }
export const ARGS = {
  skill: { type: 'string', alias: 's', description: '技能名，可重复或逗号分隔' },
  agent: { type: 'string', alias: 'a', description: 'codex,claude-code,agents；可重复或逗号分隔' },
  global: { type: 'boolean', alias: 'g', description: '安装到当前用户（不是系统所有用户）' },
  project: { type: 'boolean', description: '安装到当前项目目录' },
  cwd: { type: 'string', description: '明确指定已存在的项目目录（仅 --project）' },
  all: { type: 'boolean', description: '选全部技能；仍需选择工具和作用域' },
  yes: { type: 'boolean', alias: 'y', description: '跳过最终确认，不授权覆盖或补全选择' },
  overwrite: { type: 'boolean', description: '将同名目录备份后替换' },
  existing: { type: 'string', description: '冲突策略 error / skip / backup' },
  'dry-run': { type: 'boolean', description: '只显示计划，不创建任何目录' },
  json: { type: 'boolean', description: '非交互 JSON 输出' },
  list: { type: 'boolean', alias: 'l', description: '列出包内所有技能' },
  version: { type: 'boolean', alias: 'v', description: '显示版本' },
  help: { type: 'boolean', alias: 'h', description: '帮助' },
} as const satisfies ArgsDef;
function split(value: unknown): string[] { return typeof value === 'string' ? value.split(',').map((item) => item.trim()).filter(Boolean) : []; }
export function parseOptions(raw: string[]) {
  // Node validates flags and preserves repeats; Citty remains the shared command/usage definition.
  const definitions = Object.fromEntries(Object.entries(ARGS).map(([name, def]) => [name, {
    type: def.type, ...('alias' in def ? { short: def.alias } : {}), ...(def.type === 'string' ? { multiple: true } : {}) } ]));
  const tokens = tokenize({ args: raw, options: definitions, strict: true, allowPositionals: true });
  const canonical: string[] = [];
  for (const [key, value] of Object.entries(tokens.values)) {
    if (Array.isArray(value)) {
      if (!['skill', 'agent'].includes(key) && value.length > 1) throw new Error(`--${key} 不能重复`);
      canonical.push(`--${key}=${value.join(',')}`);
    } else if (value === true) canonical.push(`--${key}`);
  }
  const parsed = parseCittyArgs(canonical, ARGS);
  if (parsed.global && parsed.project) throw new Error('--global 与 --project 不能同时使用');
  if (parsed.cwd && !parsed.project) throw new Error('--cwd 必须配合 --project');
  if (parsed.overwrite && parsed.existing && parsed.existing !== 'backup') throw new Error('--overwrite 与 --existing 冲突');
  if (parsed.existing && !['error','skip','backup'].includes(parsed.existing)) throw new Error('--existing 只能是 error、skip 或 backup');
  const skills = [...new Set([...split(parsed.skill), ...tokens.positionals])];
  const agents = [...new Set(split(parsed.agent).map((agent) => agent === 'universal' ? 'agents' : agent === 'claude' ? 'claude-code' : agent))];
  for (const agent of agents) if (!AGENTS.includes(agent as Agent)) throw new Error(`不支持工具 ${agent}；仅支持 ${AGENTS.join(', ')}`);
  if (parsed.all && skills.length) throw new Error('--all 与具名技能选择不能同时使用');
  return { parsed, skills, agents: agents as Agent[], scope: (parsed.global ? 'global' : parsed.project ? 'project' : undefined) as Scope | undefined };
}
const LABELS: Record<Agent, string> = { codex: 'Codex', 'claude-code': 'Claude Code', agents: '通用 .agents/skills' };
/** Dependency-injected prompts let tests cancel at every stage without a real terminal. */
export async function selectInstall(skills: Skill[], selected: string[], agents: Agent[], scope: Scope | undefined, prompts = p) {
  if (!selected.length) selected = choice(await prompts.multiselect({ message: '选择要安装的 skills（空格选择，回车继续）',
    options: skills.map((skill) => ({ value: skill.name, label: `${CATEGORIES[skill.category]} / ${skill.name}`, hint: skill.description })), required: true }));
  if (!agents.length) agents = choice(await prompts.multiselect({ message: '选择 AI CLI（可多选）',
    options: AGENTS.map((agent) => ({ value: agent, label: LABELS[agent], hint: agent === 'claude-code' ? '.claude/skills' : '.agents/skills，Codex 与通用目标自动去重' })), required: true }));
  if (!scope) scope = choice(await prompts.select({ message: '选择安装作用域', initialValue: 'global', options: [
    { value: 'global' as const, label: '全局 · 当前用户的所有项目' },
    { value: 'project' as const, label: '项目 · 当前工作目录' },
  ] }));
  return { selected, agents, scope };
}
export async function main(raw: string[], root: string): Promise<number> {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
  let json = raw.includes('--json');
  try {
    const commandArgs = raw[0] === 'help' ? ['--help', ...raw.slice(1)] : raw[0] === 'install' ? raw.slice(1) : raw[0] === 'list' ? ['--list', ...raw.slice(1)] : raw;
    const { parsed, skills: selectedSkills, agents: selectedAgents, scope: selectedScope } = parseOptions(commandArgs);
    json = !!parsed.json;
    if (parsed.help) {
      console.log(await renderUsage(defineCommand({ meta: { name: 'wta-skills-hub', version: pkg.version,
        description: '交互式安装 WTA Skills。无参数启动菜单；install/list 子命令可选。' }, args: ARGS })));
      console.log('\n示例: wta-skills-hub -s herdr -a codex,claude-code --global --yes\n所有命令默认不联网、不运行技能脚本、不修改客户端权限。');
      return 0;
    }
    if (parsed.version) { console.log(json ? JSON.stringify({ version: pkg.version }) : pkg.version); return 0; }
    const catalog = discoverSkills(root);
    if (catalog.errors.length) throw new Error(catalog.errors.join('\n'));
    const skills = catalog.skills;
    if (parsed.list) {
      if (json) console.log(JSON.stringify({ version: pkg.version, skills: skills.map(({ name, category, description }) => ({ name, category, description })) }, null, 2));
      else for (const [category, label] of Object.entries(CATEGORIES)) {
        console.log(`\n${label} (${category})`);
        const group = skills.filter((s) => s.category === category);
        console.log(group.length ? group.map((s) => `  ${s.name}\n    ${s.description}`).join('\n') : '  待扩展');
      }
      return 0;
    }
    let selected = parsed.all ? skills.map((s) => s.name) : selectedSkills;
    let agents = selectedAgents, scope = selectedScope;
    for (const name of selected) if (!skills.some((s) => s.name === name)) throw new Error(`未知技能: ${name}`);
    const interactive = !!process.stdin.isTTY && !!process.stdout.isTTY && !json;
    if ((!selected.length || !agents.length || !scope) && (!interactive || parsed.yes)) throw new Error('非交互/--yes 模式需要 --skill（或 --all）、--agent、--global 或 --project；--yes 不会代选。');
    if (interactive) {
      p.intro(`WTA Skills Hub · ${pkg.version}`);
      ({ selected, agents, scope } = await selectInstall(skills, selected, agents, scope));
    }
    if (!scope) throw new Error('缺少安装作用域');
    // Explicit current directory, not a guessed git ancestor. No .codex/config.toml modifications.
    if (scope === 'global' && agents.includes('claude-code') && process.env.CLAUDE_CONFIG_DIR && resolve(process.env.CLAUDE_CONFIG_DIR) !== join(homedir(), '.claude')) {
      throw new Error('检测到自定义 CLAUDE_CONFIG_DIR；本版本只支持默认全局 .claude，拒绝写错配置。可选择 --project。');
    }
    const targets = resolveTargets(agents, scope, homedir(), resolve(parsed.cwd || process.cwd()));
    const plan = planInstall(skills.filter((s) => selected.includes(s.name)), targets);
    const preview = plan.map(({ name, destination, action, target }) => ({ name, destination, action, agents: target.agents }));
    if (parsed['dry-run']) { console.log(json ? JSON.stringify({ dryRun: true, scope, plan: preview }, null, 2) : preview.map((e) => `${e.action}: ${e.destination} [${e.agents.join(', ')}]`).join('\n')); return 0; }
    if (!json) {
      const text = preview.map((e) => `${e.action}: ${e.destination}`).join('\n');
      if (interactive) p.note(text, '安装预览（Codex 与通用目标已去重）'); else console.log(text);
    }
    let existing: Existing = parsed.overwrite ? 'backup' : (parsed.existing || 'error') as Existing;
    if (plan.some((e) => e.action === 'conflict') && !parsed.overwrite && !parsed.existing && interactive && !parsed.yes) {
      existing = choice(await p.select({ message: '存在内容不同的同名技能', initialValue: 'skip', options: [
        { value: 'skip' as const, label: '保留已有技能，仅安装缺少项' },
        { value: 'backup' as const, label: '保存完整备份，再替换同名技能' },
        { value: 'error' as const, label: '停止，不做修改' },
      ] }));
    }
    if (plan.some((e) => e.action === 'conflict') && existing === 'error') throw new Error('存在冲突，未安装。请显式选择 --existing skip 或 --overwrite');
    if (!parsed.yes) {
      if (!interactive) throw new Error('非交互写入需要 --yes；只查看使用 --dry-run');
      const approved = choice(await p.confirm({ message: existing === 'backup' ? '确认安装？同名目录会备份后替换。' : '确认安装？', initialValue: false }));
      if (!approved) throw new Cancelled();
    }
    const results = applyInstall(plan, existing, pkg.version);
    if (json) console.log(JSON.stringify({ version: pkg.version, scope, results }, null, 2));
    else {
      console.log(results.map((r) => `${r.status}: ${r.destination}${r.backup ? `\n  备份: ${r.backup}` : ''}`).join('\n'));
      if (interactive) p.outro('安装完成。文件已写入；客户端发现/实际执行仍需在对应会话验证。');
    }
    return 0;
  } catch (error) {
    const cancelled = error instanceof Cancelled;
    const message = (error as Error).message;
    if (json) console.log(JSON.stringify({ error: message, cancelled }));
    else if (cancelled) p.cancel(message);
    else console.error(`错误: ${message}`);
    return cancelled ? 130 : 2;
  }
}
