import { spawnSync } from "node:child_process";

export function skillsCliSpec(pkg) {
  return pkg?.skillsCli || "skills";
}

export function npxCommand(platform = process.platform) {
  return platform === "win32" ? "npx.cmd" : "npx";
}

export function buildSkillsAddArgv(packageRoot, options, skillsCli) {
  const argv = ["--yes", skillsCli, "add", packageRoot];
  if (!options.project) argv.push("-g");
  if (options.all) {
    argv.push("--skill", "*", "--agent", "*", "-y");
    return argv;
  }
  for (const skill of options.skills) {
    argv.push("--skill", skill);
  }
  for (const agent of options.agents) {
    argv.push("-a", agent);
  }
  if (options.yes) argv.push("-y");
  return argv;
}

export function runSkillsCli(argv, { spawn = spawnSync, cwd, env } = {}) {
  const result = spawn(npxCommand(), argv, {
    stdio: "inherit",
    cwd,
    env: env ?? process.env,
  });
  if (result.error) {
    console.error(`failed to run ${npxCommand()} ${argv.join(" ")}: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}
