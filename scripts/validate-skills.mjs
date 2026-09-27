#!/usr/bin/env node
/**
 * Validate categorized skill packages, metadata, links, and website groupings.
 * Rules aligned with vercel-labs/skills parseSkillMd() and agent-skills discovery.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalog } from "../lib/validate-catalog.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { files, errors, seen } = validateCatalog(ROOT);

if (errors.length > 0) {
  console.error(`validate-skills: ${errors.length} error(s)`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(`validate-skills: ${files.length} skill(s) ok`);
for (const name of [...seen.keys()].sort()) {
  console.log(`  - ${name}  (${seen.get(name)})`);
}
