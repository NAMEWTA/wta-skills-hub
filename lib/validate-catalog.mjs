import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parse } from "yaml";
import { CATEGORIES, discoverSkills, relativePosix } from "./discover-skills.mjs";

function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || ["templates", "node_modules", "__pycache__"].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith(".md") ? [path] : [];
  });
}

export function checkLinks(file, root) {
  const errors = [];
  const text = readFileSync(file, "utf8").replace(/^\s*(```|~~~)[\s\S]*?^\s*\1.*$/gm, "");
  for (const match of text.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, "").split(/\s+"/)[0];
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target) || /[${}<>]/.test(target)) continue;
    let local;
    try { local = decodeURIComponent(target.split("#")[0]); } catch { local = target; }
    if (local && !existsSync(resolve(dirname(file), local))) {
      errors.push(`${relativePosix(root, file)}: missing local resource ${target}`);
    }
  }
  return errors;
}

export function validateCatalog(root) {
  const discovered = discoverSkills(root);
  const errors = [...discovered.errors];
  const byName = new Map(discovered.skills.map((skill) => [skill.name, skill]));
  const grouped = new Set();
  try {
    const config = JSON.parse(readFileSync(join(root, "skills.sh.json"), "utf8"));
    if (!Array.isArray(config.groupings) || config.groupings.length === 0) throw new Error("groupings must be a nonempty array");
    const titles = new Set();
    for (const group of config.groupings) {
      if (titles.has(group.title)) errors.push(`skills.sh.json: duplicate group ${group.title}`);
      titles.add(group.title);
      if (!Array.isArray(group.skills) || group.skills.length === 0) {
        errors.push(`skills.sh.json: group ${group.title} must not be empty`);
        continue;
      }
      for (const name of group.skills) {
        const skill = byName.get(name);
        if (!skill) errors.push(`skills.sh.json: unknown skill ${name}`);
        else if (group.title !== CATEGORIES[skill.category]) errors.push(`skills.sh.json: ${name} belongs to ${CATEGORIES[skill.category]}`);
        if (grouped.has(name)) errors.push(`skills.sh.json: duplicate skill ${name}`);
        grouped.add(name);
      }
    }
    for (const name of byName.keys()) if (!grouped.has(name)) errors.push(`skills.sh.json: ungrouped skill ${name}`);
  } catch (err) {
    errors.push(`skills.sh.json: ${err.message}`);
  }
  for (const skill of discovered.skills) {
    const dir = dirname(skill.file);
    try {
      const metadata = parse(readFileSync(join(dir, "agents/openai.yaml"), "utf8"));
      for (const key of ["display_name", "short_description", "default_prompt"]) {
        if (typeof metadata?.interface?.[key] !== "string" || !metadata.interface[key].trim()) errors.push(`${skill.name}: interface.${key} is required`);
      }
      if (!metadata?.interface?.default_prompt?.includes(`$${skill.name}`)) errors.push(`${skill.name}: default_prompt must mention $${skill.name}`);
    } catch (err) {
      errors.push(`${skill.name}: agents/openai.yaml: ${err.message}`);
    }
    for (const file of markdownFiles(dir)) errors.push(...checkLinks(file, root));
  }
  if (existsSync(join(root, "README.md"))) errors.push(...checkLinks(join(root, "README.md"), root));
  return { ...discovered, errors };
}
