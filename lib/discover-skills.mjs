import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

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
  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;
    const path = join(dir, ent.name);
    if (ent.isDirectory()) {
      findSkillFiles(path, depth + 1, out);
    } else if (ent.name === "SKILL.md" && depth >= 1) {
      out.push(path);
    }
  }
  return out;
}

export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    fields[kv[1]] = value;
  }
  return fields;
}

export function relativePosix(root, path) {
  return path.slice(root.length + 1).replaceAll("\\", "/");
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
    errors.push("No skills/*/SKILL.md files found under skills/");
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
    const fm = parseFrontmatter(text);
    if (!fm) {
      errors.push(`${rel}: missing YAML frontmatter delimited by ---`);
      continue;
    }
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
    } else if (description.length > DESC_MAX) {
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
      });
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  return { files, skills, errors, seen };
}
