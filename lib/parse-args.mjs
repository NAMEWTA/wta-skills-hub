const COMMANDS = new Set(["install", "list", "help"]);

function takeValue(argv, i, flag) {
  const value = argv[i + 1];
  if (value === undefined || value.startsWith("-")) {
    return { error: `${flag} needs a value` };
  }
  return { value, next: i + 1 };
}

export function parseArgs(argv) {
  const options = {
    help: false,
    list: false,
    all: false,
    project: false,
    yes: false,
    skills: [],
    agents: [],
  };

  const tokens = [...argv];
  if (tokens[0] && COMMANDS.has(tokens[0])) {
    const command = tokens.shift();
    if (command === "help") options.help = true;
    if (command === "list") options.list = true;
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }
    if (token === "--list" || token === "-l") {
      options.list = true;
      continue;
    }
    if (token === "--all") {
      options.all = true;
      options.yes = true;
      continue;
    }
    if (token === "--project") {
      options.project = true;
      continue;
    }
    if (token === "--yes" || token === "-y") {
      options.yes = true;
      continue;
    }
    if (token === "--skill" || token === "-s") {
      const result = takeValue(tokens, i, token);
      if (result.error) return { error: result.error, options };
      options.skills.push(result.value);
      i = result.next;
      continue;
    }
    if (token === "--agent" || token === "-a") {
      const result = takeValue(tokens, i, token);
      if (result.error) return { error: result.error, options };
      for (const part of result.value.split(",")) {
        const id = part.trim();
        if (id) options.agents.push(id);
      }
      i = result.next;
      continue;
    }
    if (token.startsWith("-")) {
      return { error: `unknown option: ${token}`, options };
    }
    options.skills.push(token);
  }

  return { error: null, options };
}

export function usage(packageName = "wta-skills-hub") {
  return `${packageName} — install packaged agent skills into coding agents

Usage:
  npx ${packageName}
  npx ${packageName} --skill herdr --agent grok
  npx ${packageName} --skill windows-dev-disk-cleanup -a grok -a cursor
  npx ${packageName} --all
  npx ${packageName} --list

Options:
  --skill, -s <name>   Skill to install (repeatable; positional names also work)
  --agent, -a <id>     Target agent id (repeatable; comma lists ok; * = all)
  --all                All skills → all detected agents, skip prompts
  --project            Install into the current project instead of global dirs
  --yes, -y            Skip confirmation prompts
  --list, -l           List packaged skills and exit
  --help, -h           Show this help

Default scope is global (each detected agent's user-level skills directory).
`;
}
