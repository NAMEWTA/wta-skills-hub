#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSkills } from "../lib/discover-skills.mjs";
import { parseArgs, usage } from "../lib/parse-args.mjs";
import {
  buildSkillsAddArgv,
  runSkillsCli,
  skillsCliSpec,
} from "../lib/run-skills-cli.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadPackage() {
  return JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
}

function printList(pkg, skills) {
  console.log(`${pkg.name} ${pkg.version}`);
  if (skills.length === 0) {
    console.log("  (no skills found)");
    return;
  }
  for (const skill of skills) {
    console.log(`  ${skill.name}`);
  }
}

function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    console.error(parsed.error);
    console.error(usage());
    return 2;
  }

  const { options } = parsed;
  const pkg = loadPackage();

  if (options.help) {
    process.stdout.write(usage(pkg.name));
    return 0;
  }

  const discovered = discoverSkills(ROOT);
  if (discovered.errors.length > 0) {
    console.error(`validate-skills: ${discovered.errors.length} error(s)`);
    for (const err of discovered.errors) console.error(`  - ${err}`);
    return 1;
  }

  if (options.list) {
    printList(pkg, discovered.skills);
    return 0;
  }

  const addArgv = buildSkillsAddArgv(ROOT, options, skillsCliSpec(pkg));
  return runSkillsCli(addArgv, { cwd: ROOT });
}

const exitCode = main(process.argv.slice(2));
if (exitCode) process.exit(exitCode);
