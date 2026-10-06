import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { parse } from "yaml";

export const CATEGORIES = Object.freeze({
  coding: "代码开发",
  system: "机器优化",
  automation: "智能体与自动化",
  design: "图像与设计",
  writing: "人生与文章写作",
});

export const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const NAME_MAX = 64;
export const DESC_MAX = 1024;
export const MAX_DEPTH = 3;

export function findSkillFiles(dir, depth = 0, out = []) {
  if (depth > MAX_DEPTH) return out;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    throw new Error(`Cannot read ${dir}: ${err.message}`);
  }
  // A skill is a package boundary; bundled templates are not installable skills.
  if (entries.some((ent) => ent.isFile() && ent.name === "SKILL.md")) {
    out.push(join(dir, "SKILL.md"));
    return out;
  }
  for (const ent of entries) {
    if (ent.name.startsWith(".") || ["node_modules", "__pycache__", "dist", "build"].includes(ent.name)) continue;
    const path = join(dir, ent.name);
    if (ent.isSymbolicLink()) throw new Error(`Symlinked skill/category is not allowed: ${path}`);
    if (ent.isDirectory()) {
      findSkillFiles(path, depth + 1, out);
    }
  }
  return out;
}

export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const fields = parse(match[1], { uniqueKeys: true });
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    throw new Error("frontmatter must be a YAML mapping");
  }
  return fields;
}

export function relativePosix(root, path) {
  return relative(root, path).replaceAll("\\", "/");
}

export function discoverSkills(root) {
  const skillsDir = join(root, "skills");
  const errors = [];
  const seen = new Map();
  const skills = [];
  let files = [];

  try {
    files = findSkillFiles(skillsDir);
  } catch (err) {
    errors.push(err.message);
    return { files, skills, errors, seen };
  }

  if (files.length === 0) {
    errors.push("No skills/<category>/<name>/SKILL.md files found under skills/");
  }

  for (const file of files) {
    const rel = relativePosix(root, file);
    const dirName = basename(dirname(file));
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch (err) {
      errors.push(`${rel}: cannot read (${err.message})`);
      continue;
    }
    const parts = rel.split("/");
    const category = parts[1];
    if (parts.length !== 4 || !Object.hasOwn(CATEGORIES, category)) {
      errors.push(`${rel}: expected skills/<category>/<name>/SKILL.md with a known category`);
    }
    let fm;
    try {
      fm = parseFrontmatter(text);
    } catch (err) {
      errors.push(`${rel}: invalid YAML: ${err.message}`);
      continue;
    }
    if (!fm) {
      errors.push(`${rel}: missing YAML frontmatter delimited by ---`);
      continue;
    }
    const allowed = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
    for (const key of Object.keys(fm)) if (!allowed.has(key)) errors.push(`${rel}: non-portable frontmatter field ${key}; use a consumer adapter`);
    for (const key of ["license", "compatibility", "allowed-tools"]) {
      if (fm[key] !== undefined && (typeof fm[key] !== "string" || !fm[key].trim())) errors.push(`${rel}: ${key} must be a nonempty string`);
    }
    if (typeof fm.compatibility === "string" && [...fm.compatibility].length > 500) errors.push(`${rel}: compatibility exceeds 500 characters`);
    if (fm.metadata !== undefined && (!fm.metadata || typeof fm.metadata !== "object" || Array.isArray(fm.metadata) || Object.values(fm.metadata).some((value) => typeof value !== "string"))) {
      errors.push(`${rel}: metadata must be a string-to-string mapping`);
    }
    if (fm.metadata?.["wta-explicit-only"] !== undefined && !["true", "false"].includes(fm.metadata["wta-explicit-only"])) errors.push(`${rel}: wta-explicit-only must be the string true or false`);
    if (text.split(/\r?\n/).length > 500) errors.push(`${rel}: SKILL.md exceeds repository budget of 500 lines`);
    const name = fm.name;
    const description = fm.description;
    if (typeof name !== "string" || name.length === 0) {
      errors.push(`${rel}: frontmatter name is required`);
    } else {
      if (!NAME_RE.test(name) || name.length > NAME_MAX) {
        errors.push(
          `${rel}: name "${name}" must match ${NAME_RE} and be 1–${NAME_MAX} characters`
        );
      }
      if (["synced", "anthropic-skills"].includes(name)) errors.push(`${rel}: name is reserved by Claude Code`);
      if (name !== dirName) {
        errors.push(
          `${rel}: name "${name}" must match parent directory "${dirName}"`
        );
      }
      const prev = seen.get(name);
      if (prev) {
        errors.push(`${rel}: duplicate name "${name}" (also ${prev})`);
      } else {
        seen.set(name, rel);
      }
    }
    if (typeof description !== "string" || description.trim().length === 0) {
      errors.push(`${rel}: frontmatter description is required`);
    } else if ([...description].length > DESC_MAX) {
      errors.push(
        `${rel}: description is ${description.length} characters (max ${DESC_MAX})`
      );
    }

    if (typeof name === "string" && name.length > 0 && !skills.some((s) => s.name === name)) {
      skills.push({
        name,
        dirName,
        file,
        rel,
        description: typeof description === "string" ? description : "",
        category,
        explicitOnly: fm.metadata?.["wta-explicit-only"] === "true",
      });
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  return { files, skills, errors, seen };
}
