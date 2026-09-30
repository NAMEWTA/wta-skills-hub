import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
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
  assert.match(result.stdout, /writing.*待扩展/);
});

test("project install delegates with caller cwd and package source", { skip: process.platform === "win32" }, (t) => {
  const root = fixture(t);
  const capture = join(root, "captured.json");
  const fakeBin = join(root, "bin");
  put(root, "bin/npx", `#!/usr/bin/env node\nrequire('fs').writeFileSync(process.env.WTA_TEST_CAPTURE,JSON.stringify({cwd:process.cwd(),argv:process.argv.slice(2)}));\n`);
  const chmod = spawnSync("chmod", ["+x", join(fakeBin, "npx")]);
  assert.equal(chmod.status, 0);
  const result = spawnSync(process.execPath, [join(ROOT, "bin/wta-skills-hub.mjs"), "--project", "--skill", "herdr", "-a", "codex", "-y"], {
    cwd: root, encoding: "utf8", env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, WTA_TEST_CAPTURE: capture },
  });
  assert.equal(result.status, 0, result.stderr);
  const actual = JSON.parse(readFileSync(capture, "utf8"));
  assert.equal(actual.cwd, root);
  assert.equal(resolve(actual.argv[3]), ROOT);
  assert.ok(!actual.argv.includes("-g"));
});
