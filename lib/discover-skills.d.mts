export interface Skill { name: string; dirName: string; file: string; rel: string; description: string; category: string; explicitOnly?: boolean; }
export const CATEGORIES: Readonly<Record<string, string>>;
export const NAME_RE: RegExp;
export function discoverSkills(root: string): { files: string[]; skills: Skill[]; errors: string[]; seen: Map<string,string> };
