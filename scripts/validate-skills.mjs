#!/usr/bin/env node
/**
 * Validate skills/<name>/SKILL.md for npx skills add / Agent Skills.
 * Rules aligned with vercel-labs/skills parseSkillMd() and agent-skills discovery.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSkills } from "../lib/discover-skills.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { files, errors, seen } = discoverSkills(ROOT);

if (errors.length > 0) {
  console.error(`validate-skills: ${errors.length} error(s)`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(`validate-skills: ${files.length} skill(s) ok`);
for (const name of [...seen.keys()].sort()) {
  console.log(`  - ${name}  (${seen.get(name)})`);
}
