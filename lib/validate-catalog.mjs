import { existsSync, readFileSync, readdirSync, lstatSync, realpathSync } from "node:fs";
import { dirname, join, resolve, relative, sep } from "node:path";
import { parse } from "yaml";
import { CATEGORIES, discoverSkills, relativePosix } from "./discover-skills.mjs";

function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || ["templates", "node_modules", "__pycache__"].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) return [];
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith(".md") ? [path] : [];
  });
}

export function checkLinks(file, root, skillRoot = null) {
  const errors = [];
  const text = readFileSync(file, "utf8").replace(/^\s*(```|~~~)[\s\S]*?^\s*\1.*$/gm, "");
  for (const match of text.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, "").split(/\s+"/)[0];
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target) || /[${}<>]/.test(target)) continue;
    let local;
    try { local = decodeURIComponent(target.split("#")[0]); } catch { local = target; }
    if (local && skillRoot) {
      const candidate = resolve(dirname(file), local);
      const resolved = existsSync(candidate) ? realpathSync(candidate) : candidate;
      const rel = relative(realpathSync(skillRoot), resolved);
      if (rel === ".." || rel.startsWith(`..${sep}`)) {
        errors.push(`${relativePosix(root, file)}: resource escapes standalone skill: ${target}`);
        continue;
      }
    }
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
      const metadata = parse(readFileSync(join(dir, "agents/openai.yaml"), "utf8"), { uniqueKeys: true });
      for (const key of ["display_name", "short_description", "default_prompt"]) {
        if (typeof metadata?.interface?.[key] !== "string" || !metadata.interface[key].trim()) errors.push(`${skill.name}: interface.${key} is required`);
      }
      const short = metadata?.interface?.short_description;
      if (typeof short === "string" && ([...short].length < 25 || [...short].length > 64)) errors.push(`${skill.name}: short_description must be 25–64 characters (repository UI budget)`);
      if (metadata?.policy?.allow_implicit_invocation !== undefined && typeof metadata.policy.allow_implicit_invocation !== "boolean") errors.push(`${skill.name}: allow_implicit_invocation must be boolean`);
      if (skill.explicitOnly && metadata?.policy?.allow_implicit_invocation !== false) errors.push(`${skill.name}: explicit-only skill needs Codex implicit invocation disabled`);
      if (!metadata?.interface?.default_prompt?.includes(`$${skill.name}`)) errors.push(`${skill.name}: default_prompt must mention $${skill.name}`);
    } catch (err) {
      errors.push(`${skill.name}: agents/openai.yaml: ${err.message}`);
    }
    if (!existsSync(join(dir, "LICENSE"))) errors.push(`${skill.name}: missing bundled LICENSE for standalone distribution`);
    function auditTree(current) {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        if (["__pycache__", "node_modules", ".git"].includes(entry.name)) continue;
        const path = join(current, entry.name);
        const info = lstatSync(path);
        if (info.isSymbolicLink()) errors.push(`${relativePosix(root, path)}: symlink resource is not portable`);
        else if (info.isDirectory()) auditTree(path);
        else if (!info.isFile()) errors.push(`${relativePosix(root, path)}: unsupported file type`);
      }
    }
    auditTree(dir);
    for (const file of markdownFiles(dir)) errors.push(...checkLinks(file, root, dir));
  }
  if (existsSync(join(root, "README.md"))) errors.push(...checkLinks(join(root, "README.md"), root));
  return { ...discovered, errors };
}
