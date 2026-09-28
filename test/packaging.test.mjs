import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function findPackage(value) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value.files) && value.filename) return value;
  for (const child of Object.values(value)) {
    const found = findPackage(child);
    if (found) return found;
  }
  return null;
}

test("npm package contains eight categorized skills and no Python caches", () => {
  // npm_execpath is a JavaScript CLI entrypoint, avoiding .cmd shell differences.
  const npmCli = process.env.npm_execpath;
  assert.ok(npmCli, "run packaging tests via npm test");
  const result = spawnSync(process.execPath, [npmCli, "pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const pkg = findPackage(JSON.parse(result.stdout));
  assert.ok(pkg, "supported npm pack JSON shape");
  const paths = pkg.files.map((file) => file.path);
  assert.equal(paths.filter((path) => /^skills\/[^/]+\/[^/]+\/SKILL\.md$/.test(path)).length, 8);
  assert.ok(paths.includes("skills/automation/grok-bot-team-steward/templates/snapshot/skills/_SKILL/SKILL.md"));
  assert.ok(paths.includes("skills/system/proxy-region-locale/references/ubuntu-region.md"));
  for (const resource of [
    "agents/openai.yaml",
    "references/basic-retouch.md",
    "references/travel-creative.md",
    "references/social-effects.md",
    "references/formal-portrait.md",
    "references/product-photo.md",
    "references/repair-and-look.md",
    "references/object-and-canvas.md",
  ]) {
    assert.ok(paths.includes(`skills/design/photo-retouch/${resource}`));
  }
  assert.ok(!paths.some((path) => /(?:__pycache__|\.py[co]$|^temp\/)/.test(path)));
});
