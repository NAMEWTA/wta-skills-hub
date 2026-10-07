import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parse } from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
test("proxy and platform helpers pass isolated offline regressions", () => {
  const result = spawnSync(process.platform === "win32" ? "python" : "python3",
    ["-B", "-m", "unittest", "discover", "-s", "test", "-p", "test_proxy_doctor.py", "-v"],
    { cwd: root, encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
});
test("default proxy templates are conservative, valid fragments", () => {
  const base = join(root, "skills/system/clash-client-profile/templates");
  const rules = parse(readFileSync(join(base, "ai-rules.yaml"), "utf8"));
  assert.ok(rules.prepend.length > 0);
  assert.ok(rules.prepend.every((rule) => rule.startsWith("DOMAIN-SUFFIX,")));
  assert.deepEqual(rules.append, []);
  assert.deepEqual(rules.delete, []);
  const dns = parse(readFileSync(join(base, "dns.yaml"), "utf8"));
  assert.deepEqual(dns, { dns: { enable: true } });
});

test("UI metadata follows the current OpenAI consumer contract", () => {
  const groups = JSON.parse(readFileSync(join(root, "skills.sh.json"), "utf8")).groupings;
  const categories = { "代码开发": "coding", "机器优化": "system", "智能体与自动化": "automation", "图像与设计": "design", "人生与文章写作": "writing" };
  for (const group of groups) for (const name of group.skills) {
    const metadata = parse(readFileSync(join(root, "skills", categories[group.title], name, "agents/openai.yaml"), "utf8")).interface;
    const length = [...metadata.short_description].length;
    assert.ok(length >= 25 && length <= 64, `${name}: short_description length ${length}`);
    assert.ok(metadata.default_prompt.includes(`$${name}`));
  }
});


test("DNS plans, effective-policy audits and DoH wire probes pass offline regressions", () => {
  const result = spawnSync(process.platform === "win32" ? "python" : "python3",
    ["-B", "-m", "unittest", "discover", "-s", "test", "-p", "test_dns_guard.py", "-v"],
    { cwd: root, encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
});

test("DNS request example is explicitly scoped, not a deployable profile", () => {
  const request = JSON.parse(readFileSync(join(root, "skills/system/clash-client-profile/templates/dns-request.example.json"), "utf8"));
  assert.equal(request.schema_version, 1);
  assert.equal(request.bootstrap.mode, "deny");
  assert.equal(request.replace_existing_dns_policies, false);
  assert.ok(request.targets.length > 0);
  assert.ok(!Object.hasOwn(request, "tun"));
});
