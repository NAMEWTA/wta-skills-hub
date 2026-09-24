import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { discoverSkills } from "../lib/discover-skills.mjs";
import { parseArgs, usage } from "../lib/parse-args.mjs";
import {
  buildSkillsAddArgv,
  npxCommand,
  runSkillsCli,
  skillsCliSpec,
  winQuote,
} from "../lib/run-skills-cli.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(ROOT, "bin", "wta-skills-hub.mjs");

describe("parseArgs", () => {
  it("defaults to an empty install request", () => {
    const { error, options } = parseArgs([]);
    assert.equal(error, null);
    assert.deepEqual(options, {
      help: false,
      list: false,
      all: false,
      project: false,
      yes: false,
      skills: [],
      agents: [],
    });
  });

  it("treats install as a no-op subcommand", () => {
    const { error, options } = parseArgs(["install", "herdr", "-a", "grok"]);
    assert.equal(error, null);
    assert.deepEqual(options.skills, ["herdr"]);
    assert.deepEqual(options.agents, ["grok"]);
  });

  it("maps list and help subcommands", () => {
    assert.equal(parseArgs(["list"]).options.list, true);
    assert.equal(parseArgs(["help"]).options.help, true);
  });

  it("collects repeated skill and agent flags plus positionals", () => {
    const { options } = parseArgs([
      "--skill",
      "herdr",
      "windows-dev-disk-cleanup",
      "-a",
      "grok",
      "--agent",
      "cursor,codex",
      "-y",
    ]);
    assert.deepEqual(options.skills, ["herdr", "windows-dev-disk-cleanup"]);
    assert.deepEqual(options.agents, ["grok", "cursor", "codex"]);
    assert.equal(options.yes, true);
  });

  it("sets yes when --all is passed", () => {
    const { options } = parseArgs(["--all"]);
    assert.equal(options.all, true);
    assert.equal(options.yes, true);
  });

  it("rejects unknown flags and missing values", () => {
    assert.equal(parseArgs(["--nope"]).error, "unknown option: --nope");
    assert.equal(parseArgs(["--skill"]).error, "--skill needs a value");
    assert.equal(parseArgs(["-a"]).error, "-a needs a value");
  });
});

describe("buildSkillsAddArgv", () => {
  const cli = "skills@1.5.26";

  it("defaults to global install of the packaged root", () => {
    assert.deepEqual(
      buildSkillsAddArgv("/pkg", parseArgs([]).options, cli),
      ["--yes", cli, "add", "/pkg", "-g"]
    );
  });

  it("omits -g for --project", () => {
    const argv = buildSkillsAddArgv(
      "/pkg",
      parseArgs(["--project", "--skill", "herdr"]).options,
      cli
    );
    assert.deepEqual(argv, [
      "--yes",
      cli,
      "add",
      "/pkg",
      "--skill",
      "herdr",
    ]);
  });

  it("expands --all to every skill and agent", () => {
    assert.deepEqual(
      buildSkillsAddArgv("/pkg", parseArgs(["--all"]).options, cli),
      ["--yes", cli, "add", "/pkg", "-g", "--skill", "*", "--agent", "*", "-y"]
    );
  });

  it("forwards named skills and agents", () => {
    const argv = buildSkillsAddArgv(
      "/pkg",
      parseArgs(["herdr", "-a", "grok", "-a", "cursor", "-y"]).options,
      cli
    );
    assert.deepEqual(argv, [
      "--yes",
      cli,
      "add",
      "/pkg",
      "-g",
      "--skill",
      "herdr",
      "-a",
      "grok",
      "-a",
      "cursor",
      "-y",
    ]);
  });
});

describe("skillsCliSpec / npxCommand", () => {
  it("reads the pin from package.json", () => {
    assert.equal(skillsCliSpec({ skillsCli: "skills@1.5.26" }), "skills@1.5.26");
    assert.equal(skillsCliSpec({}), "skills");
  });

  it("uses npx.cmd on Windows", () => {
    assert.equal(npxCommand("win32"), "npx.cmd");
    assert.equal(npxCommand("linux"), "npx");
  });

  it("quotes Windows command strings", () => {
    assert.equal(winQuote("skills@1.5.26"), "skills@1.5.26");
    assert.equal(winQuote("C:\\Program Files\\x"), '"C:\\Program Files\\x"');
    assert.equal(winQuote('say "hi"'), '"say ""hi"""');
  });

  it("spawns a quoted shell command on Windows", () => {
    let captured;
    runSkillsCli(["--yes", "skills", "add", "C:\\Program Files\\pkg", "-g"], {
      platform: "win32",
      spawn: (cmd, opts) => {
        captured = { cmd, opts };
        return { status: 0 };
      },
    });
    assert.equal(
      captured.cmd,
      'npx.cmd --yes skills add "C:\\Program Files\\pkg" -g'
    );
    assert.equal(captured.opts.shell, true);
  });

  it("spawns without shell on POSIX", () => {
    let captured;
    runSkillsCli(["--yes", "skills", "add", "/pkg", "-g"], {
      platform: "linux",
      spawn: (cmd, argv, opts) => {
        captured = { cmd, argv, opts };
        return { status: 0 };
      },
    });
    assert.equal(captured.cmd, "npx");
    assert.deepEqual(captured.argv, ["--yes", "skills", "add", "/pkg", "-g"]);
    assert.equal(captured.opts.shell, undefined);
  });
});

describe("discoverSkills", () => {
  it("finds the packaged skills", () => {
    const { skills, errors } = discoverSkills(ROOT);
    assert.deepEqual(errors, []);
    assert.deepEqual(
      skills.map((s) => s.name),
      [
        "gitea-repo",
        "github-repo-steward",
        "grok-bot-team-steward",
        "herdr",
        "job-application",
        "vscode-fullstack",
        "windows-dev-disk-cleanup",
      ]
    );
  });
});

describe("CLI", () => {
  it("prints help without spawning the skills installer", () => {
    const result = spawnSync(process.execPath, [BIN, "--help"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /npx @namewta\/skills-hub/);
    assert.match(result.stdout, /--skill/);
    assert.equal(
      usage("@namewta/skills-hub").includes("npx @namewta/skills-hub"),
      true
    );
  });

  it("lists packaged skills", () => {
    const result = spawnSync(process.execPath, [BIN, "--list"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /@namewta\/skills-hub 0\.0\.4/);
    assert.match(result.stdout, /gitea-repo/);
    assert.match(result.stdout, /github-repo-steward/);
    assert.match(result.stdout, /grok-bot-team-steward/);
    assert.match(result.stdout, /herdr/);
    assert.match(result.stdout, /job-application/);
    assert.match(result.stdout, /windows-dev-disk-cleanup/);
    assert.match(result.stdout, /vscode-fullstack/);
  });

  it("exits 2 on unknown options", () => {
    const result = spawnSync(process.execPath, [BIN, "--nope"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown option: --nope/);
  });
});
