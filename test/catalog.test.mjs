import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { CATEGORIES, discoverSkills, parseFrontmatter } from "../lib/discover-skills.mjs";
import { checkLinks, validateCatalog } from "../lib/validate-catalog.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "wta-catalog-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function put(root, rel, content) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}
function skill(root, category, name, body = "") {
  return put(root, `skills/${category}/${name}/SKILL.md`, `---\nname: ${name}\ndescription: A real workflow\n---\n${body}`);
}

test("catalog is categorized, complete and excludes the bundled Grok template", () => {
  const result = validateCatalog(ROOT);
  assert.deepEqual(result.errors, []);
  assert.equal(result.skills.length, 10);
  assert.equal(result.skills.filter((s) => s.category === "coding").length, 3);
  assert.equal(result.skills.filter((s) => s.category === "system").length, 4);
  assert.equal(result.skills.filter((s) => s.category === "automation").length, 2);
  assert.deepEqual(result.skills.filter((s) => s.category === "design").map((s) => s.name), ["photo-retouch"]);
});

test("discovery stops at skill roots, even for malformed embedded templates", (t) => {
  const root = fixture(t);
  skill(root, "automation", "example");
  put(root, "skills/automation/example/templates/child/SKILL.md", "not a skill");
  put(root, "skills/writing/.gitkeep", "");
  const result = discoverSkills(root);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.skills.map((s) => [s.name, s.category]), [["example", "automation"]]);
});

test("duplicate names across categories and unsupported layouts are rejected", (t) => {
  const root = fixture(t);
  skill(root, "coding", "same");
  skill(root, "system", "same");
  put(root, "skills/flat/SKILL.md", "---\nname: flat\ndescription: flat\n---\n");
  const errors = discoverSkills(root).errors.join("\n");
  assert.match(errors, /duplicate name/);
  assert.match(errors, /known category/);
});

test("frontmatter supports quoted and multiline YAML plus nested metadata", () => {
  const fm = parseFrontmatter('---\nname: demo\ndescription: >-\n  Edit a profile:\n  preserve user settings.\nmetadata:\n  author: "A: B"\n---\n');
  assert.equal(fm.description, "Edit a profile: preserve user settings.");
  assert.equal(fm.metadata.author, "A: B");
  assert.throws(() => parseFrontmatter("---\nname: x\nname: y\n---\n"));
  assert.throws(() => parseFrontmatter("---\n- item\n---\n"), /mapping/);
});

test("invalid YAML and non-string descriptions produce diagnostics", (t) => {
  const root = fixture(t);
  put(root, "skills/coding/bad/SKILL.md", "---\nname: bad\ndescription: [\n---\n");
  put(root, "skills/coding/wrong/SKILL.md", "---\nname: wrong\ndescription: false\n---\n");
  const errors = discoverSkills(root).errors.join("\n");
  assert.match(errors, /invalid YAML/);
  assert.match(errors, /description is required/);
});

test("groupings reject stale, duplicate, missing, misplaced and empty entries", (t) => {
  const root = fixture(t);
  skill(root, "coding", "demo");
  skill(root, "system", "missing");
  put(root, "skills.sh.json", JSON.stringify({ groupings: [
    { title: CATEGORIES.system, skills: ["demo", "demo", "ghost"] },
    { title: CATEGORIES.writing, skills: [] },
  ] }));
  const errors = validateCatalog(root).errors.join("\n");
  for (const pattern of [/belongs to/, /duplicate skill/, /unknown skill/, /ungrouped skill/, /must not be empty/]) assert.match(errors, pattern);
});

test("resource validation resolves relative links and ignores illustrative code", (t) => {
  const root = fixture(t);
  put(root, "references/existing.md", "ok");
  const file = put(root, "SKILL.md", "[existing](references/existing.md#part)\n[missing](references/lost.md)\n[web](https://example.com)\n```md\n[example](not-a-real-file.md)\n```\n");
  assert.deepEqual(checkLinks(file, root), ["SKILL.md: missing local resource references/lost.md"]);
});

test("CLI lists Chinese categories while preserving selectable skill names", () => {
  const result = spawnSync(process.execPath, [join(ROOT, "bin/wta-skills-hub.mjs"), "--list"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  for (const label of Object.values(CATEGORIES)) assert.ok(result.stdout.includes(label));
  assert.match(result.stdout, /proxy-region-locale/);
  assert.match(result.stdout, /writing[\s\S]*待扩展/);
});


test("portable frontmatter rejects host-only keys, oversized fields and non-string metadata", (t) => {
  const root = fixture(t);
  const variants = [
    ['host', 'disable-model-invocation: true', /non-portable frontmatter/],
    ['compat', `compatibility: ${'x'.repeat(501)}`, /compatibility/],
    ['meta', 'metadata:\n  reviewed: true', /string/],
    ['policy', 'metadata:\n  wta-explicit-only: "yes"', /true.*false/],
    ['synced', '', /reserved/],
  ];
  for (const [name, extra, expected] of variants) {
    const local = join(root, name);
    put(local, `skills/coding/${name}/SKILL.md`, `---\nname: ${name}\ndescription: Valid task description\n${extra}\n---\nBody\n`);
    assert.match(discoverSkills(local).errors.join('\n'), expected);
  }
});

test("standalone link validation refuses existing resources in sibling skills", (t) => {
  const root = fixture(t);
  const own = join(root, 'skills/coding/own');
  put(root, 'skills/coding/other/reference.md', 'must not require another installation');
  const file = put(root, 'skills/coding/own/SKILL.md', '[sibling](../other/reference.md)');
  assert.match(checkLinks(file, root, own).join('\n'), /escapes standalone/);
});

test("all skill UI strings are quoted and behavioral cases cover four distinct routing conditions", () => {
  const { skills } = discoverSkills(ROOT);
  const cases = JSON.parse(readFileSync(join(ROOT, 'evals/quality-cases.json'), 'utf8'));
  assert.equal(cases.status, 'not-run');
  assert.equal(new Set(cases.cases.map((entry) => entry.id)).size, 40);
  for (const skill of skills) {
    const text = readFileSync(join(dirname(skill.file), 'agents/openai.yaml'), 'utf8');
    for (const key of ['display_name', 'short_description', 'default_prompt']) assert.match(text, new RegExp(`  ${key}: "[^\\n]+"`));
    const group = cases.cases.filter((entry) => entry.skill === skill.name);
    assert.deepEqual(group.map((entry) => entry.kind).sort(), ['boundary', 'failure', 'negative', 'positive']);
    for (const entry of group) { assert.equal(entry.status, 'not-run'); assert.ok(entry.prompt && entry.assertions.length); }
    assert.equal(group.find((entry) => entry.kind === 'negative').expected_activation, false);
  }
});
