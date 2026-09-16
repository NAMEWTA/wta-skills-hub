import { spawnSync } from "node:child_process";

export function skillsCliSpec(pkg) {
  return pkg?.skillsCli || "skills";
}

export function npxCommand(platform = process.platform) {
  return platform === "win32" ? "npx.cmd" : "npx";
}

export function winQuote(arg) {
  if (arg.length === 0) return '""';
  if (!/[\s&<>()^|"]/.test(arg)) return arg;
  return `"${String(arg).replace(/"/g, '""')}"`;
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

export function runSkillsCli(
  argv,
  { spawn = spawnSync, cwd, env, platform = process.platform } = {}
) {
  const cmd = npxCommand(platform);
  const stdioOpts = {
    stdio: "inherit",
    cwd,
    env: env ?? process.env,
  };

  // Windows: Node cannot spawn .cmd without a shell. Pass one quoted command
  // string so arguments are not concatenated unescaped (DEP0190).
  const result =
    platform === "win32"
      ? spawn([cmd, ...argv.map(winQuote)].join(" "), {
          ...stdioOpts,
          shell: true,
        })
      : spawn(cmd, argv, stdioOpts);

  if (result.error) {
    console.error(`failed to run ${cmd} ${argv.join(" ")}: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}
