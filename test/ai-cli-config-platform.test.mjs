import assert from 'node:assert/strict';
import { test } from 'node:test';
import { codexSystemPaths } from '../skills/system/optimize-codex-config/scripts/lib/inspect.mjs';

for (const [platform, root] of [['linux', '/etc/codex'], ['darwin', '/private/etc/codex']]) {
  test(`Codex ${platform} system reads use the platform's canonical root`, () => {
    assert.deepEqual(codexSystemPaths(platform), {
      defaults: [root + '/config.toml'],
      managed: [root + '/managed_config.toml', root + '/requirements.toml'],
    });
  });
}
test('Windows does not invent Unix system configuration paths', () => {
  assert.deepEqual(codexSystemPaths('win32'), { defaults: [], managed: [] });
});
