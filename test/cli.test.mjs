import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANCEL_SYMBOL } from '@clack/prompts';
import { parseOptions, choice, Cancelled, selectInstall } from '../dist/cli.js';
import { discoverSkills } from '../lib/discover-skills.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = join(ROOT,'bin/wta-skills-hub.mjs');
function temp(t) { const root = mkdtempSync(join(tmpdir(),'wta cli 中文 ')); t.after(()=>rmSync(root,{recursive:true,force:true})); return root; }
function cli(args, cwd=ROOT, extra={}) { return spawnSync(process.execPath,[BIN,...args],{cwd,encoding:'utf8',timeout:15000,env:{...process.env,CLAUDE_CONFIG_DIR:'',...extra}}); }

test('Citty-backed options preserve repeats, CSV, aliases and positional names',()=>{
 const a=parseOptions(['--skill','herdr','-s','photo-retouch,herdr','gitea-repo','-a','codex','--agent','claude,universal','--project','-y']);
 assert.deepEqual(a.skills,['herdr','photo-retouch','gitea-repo']);assert.deepEqual(a.agents,['codex','claude-code','agents']);assert.equal(a.scope,'project');assert.equal(a.parsed.yes,true);
});
for (const args of [['--wat'],['--skill'],['--global','--project'],['--cwd','x'],['--existing','erase'],['--overwrite','--existing','skip'],['--agent','cursor'],['--all','herdr'],['--cwd','x','--cwd','y','--project']]) test(`invalid options fail: ${args.join(' ')}`,()=>assert.throws(()=>parseOptions(args)));
test('--all chooses skills only and does not assume tools, scope, or consent',()=>{const a=parseOptions(['--all']);assert.equal(a.parsed.all,true);assert.equal(a.parsed.yes,undefined);assert.deepEqual(a.agents,[]);assert.equal(a.scope,undefined);});
test('help, version, text listing, JSON listing need no TTY or client tools',()=>{
 for(const args of [['--help'],['--version'],['--list'],['list','--json']]) {const result=cli(args);assert.equal(result.status,0,result.stderr);}
 const list=JSON.parse(cli(['--list','--json']).stdout);assert.equal(list.skills.length,12);assert.ok(list.skills.every(s=>s.name&&s.description));
});
test('non-TTY incomplete arguments fail without creating any directories',(t)=>{
 const root=temp(t);for(const args of [[],['--all','--yes'],['-s','herdr','--global','--yes'],['-s','herdr','-a','codex','--project']]) {const result=cli(args,root);assert.equal(result.status,2,result.stderr);assert.deepEqual(readdirSync(root),[]);}
});
test('JSON errors are valid JSON and never launch prompts',(t)=>{const result=cli(['--wat','--json'],temp(t));assert.equal(result.status,2);assert.ok(JSON.parse(result.stdout).error);assert.equal(result.stderr,'');});
test('dry-run creates nothing and deduplicates Codex and universal',(t)=>{
 const root=temp(t);const result=cli(['--all','-a','codex,agents,claude-code','--project','--dry-run','--json'],root);
 assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).plan.length,24);assert.deepEqual(readdirSync(root),[]);
});
test('project installation uses the caller path with spaces and Unicode, never an npx child',(t)=>{
 const root=temp(t);const result=cli(['install','herdr','-a','codex,agents,claude-code','--project','-y','--json'],root,{PATH:''});
 assert.equal(result.status,0,result.stderr||result.stdout);const results=JSON.parse(result.stdout).results;assert.equal(results.length,2);
 for(const prefix of ['.agents','.claude']) assert.ok(existsSync(join(root,prefix,'skills/herdr/SKILL.md')));
 assert.ok(!existsSync(join(root,'.codex')));
 assert.match(readFileSync(join(root,'.claude/skills/herdr/SKILL.md'),'utf8'),/disable-model-invocation: true/);
 assert.doesNotMatch(readFileSync(join(root,'.agents/skills/herdr/SKILL.md'),'utf8'),/disable-model-invocation/);
});
test('--cwd controls project scope instead of the package or git root',(t)=>{
 const caller=temp(t), project=temp(t);const result=cli(['-s','photo-retouch','-a','agents','--project','--cwd',project,'-y'],caller);
 assert.equal(result.status,0,result.stderr);assert.deepEqual(readdirSync(caller),[]);assert.ok(existsSync(join(project,'.agents/skills/photo-retouch/LICENSE')));
});
test('yes does not authorize overwriting a customized skill',(t)=>{
 const root=temp(t);const dest=join(root,'.agents/skills/herdr');mkdirSync(dest,{recursive:true});writeFileSync(join(dest,'SKILL.md'),'user original');
 const result=cli(['-s','herdr','-a','codex','--project','--yes','--json'],root);
 assert.equal(result.status,2);assert.equal(readFileSync(join(dest,'SKILL.md'),'utf8'),'user original');assert.ok(JSON.parse(result.stdout).error);
});
test('cancellation is recognized by the real Clack symbol',()=>{assert.throws(()=>choice(CANCEL_SYMBOL),Cancelled);assert.equal(choice('chosen'),'chosen');});
for(let cancelledAt=0;cancelledAt<3;cancelledAt++) test(`wizard cancellation at step ${cancelledAt+1} aborts before installation`,async()=>{
 let calls=0;const answers=[['herdr'],['codex'],'project'];const next=async()=>{const index=calls++;return index===cancelledAt?CANCEL_SYMBOL:answers[index];};
 await assert.rejects(selectInstall(discoverSkills(ROOT).skills,[],[],undefined,{multiselect:next,select:next}),Cancelled);assert.equal(calls,cancelledAt+1);
});
test('wizard returns selected skills, multiple agents and explicit scope',async()=>{
 let calls=0;const answers=[['herdr','photo-retouch'],['codex','claude-code'],'project'];const next=async()=>answers[calls++];
 const value=await selectInstall(discoverSkills(ROOT).skills,[],[],undefined,{multiselect:next,select:next});assert.deepEqual(value,{selected:answers[0],agents:answers[1],scope:'project'});
});
