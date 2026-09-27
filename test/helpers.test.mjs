import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

test("bundled helpers pass offline Python/mock regression tests", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const result = spawnSync(process.platform === "win32" ? "python" : "python3", ["-B", "-m", "unittest", "discover", "-s", "test", "-p", "test_helpers.py", "-v"], {
    cwd: root, encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
});
