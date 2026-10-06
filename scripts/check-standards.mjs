/** Explicit network maintenance command, never imported by the installer.
 * Checks availability, critical markers, and review age; it does NOT prove semantic compatibility. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const HOSTS = new Set(['agentskills.io', 'code.claude.com', 'developers.openai.com', 'learn.chatgpt.com', 'docs.npmjs.com', 'raw.githubusercontent.com']);
function trusted(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || !HOSTS.has(url.hostname)) throw new Error(`Untrusted standards URL: ${url.origin}`);
  return url;
}
async function fetchText(source, fetcher) {
  let url = trusted(source.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    for (let hop = 0; hop < 5; hop++) {
      const response = await fetcher(url.href, { signal: controller.signal, redirect: 'manual', headers: { 'User-Agent': 'wta-skills-hub-standards-review/1.0' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) throw new Error('Redirect without Location');
        url = trusted(new URL(location, url).href);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      let size = 0;
      const chunks = [];
      for await (const chunk of response.body ?? []) {
        size += chunk.length;
        if (size > 4 * 1024 * 1024) { controller.abort(); throw new Error('Standards page exceeds 4 MiB'); }
        chunks.push(Buffer.from(chunk));
      }
      return { url: url.href, text: Buffer.concat(chunks).toString('utf8') };
    }
    throw new Error('Too many redirects');
  } finally { clearTimeout(timeout); }
}
export async function checkStandards(config, { fetcher = fetch, now = new Date() } = {}) {
  if (!Number.isInteger(config.reviewEveryDays) || config.reviewEveryDays < 1 || !Array.isArray(config.sources) || !config.sources.length) throw new Error('Invalid standards source configuration');
  const reviewed = Date.parse(`${config.reviewedAt}T00:00:00Z`);
  if (!Number.isFinite(reviewed)) throw new Error('Invalid review date');
  const ageDays = Math.floor((now.getTime() - reviewed) / 86400000);
  const reviewDue = ageDays < 0 || ageDays >= config.reviewEveryDays;
  const results = [];
  for (const source of config.sources) {
    try {
      if (!source.id || !Array.isArray(source.markers) || !source.markers.length || source.markers.some((value) => typeof value !== 'string' || !value)) throw new Error('Invalid source markers');
      const page = await fetchText(source, fetcher);
      const text = page.text.replace(/<[^>]*>/g, ' ').replace(/&quot;/g, '"').replace(/&#x2F;|&#47;/gi, '/');
      const missing = source.markers.filter((marker) => !text.toLowerCase().includes(marker.toLowerCase()));
      results.push({ id: source.id, url: page.url, ok: !missing.length, missing });
    } catch (error) { results.push({ id: source.id, url: source.url, ok: false, error: error.message }); }
  }
  return { checkedAt: now.toISOString(), reviewedAt: config.reviewedAt, reviewDue, ageDays,
    ok: !reviewDue && results.every((result) => result.ok),
    limitation: 'Availability and marker checks are not a semantic review. Read current official pages and update tests before changing reviewedAt.', results };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const report = await checkStandards(JSON.parse(readFileSync(resolve(root, 'docs/standards-sources.json'), 'utf8')));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
