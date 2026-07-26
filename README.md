# Example Prompts

This repository is a temporary collection of example prompts used for development and experimentation.

The current files should be reviewed, refined, and reworked into proper skills so they can be reused more consistently and maintained more easily.

The project is expected to be migrated into actual AI skills rather than using copy+paste .txt files.

## CLI support and notes
The agents and skills are mostly tested in OpenCode (see `base-prompts` and `configs` for same setup) however I test most of the skills/agents in other agent harness.  
Here are notes regarding the differet agents  usage:
- Codex CLI does not support spawning custom agents (per 21-07-2026) even though their docs claim that they do.
- In Copilot CLI if running auto mode the orchestrator agent will answer questions it self (when using `end-to-end-orchestrator` and similar)
- For subagents in Pi: It is the [pi-subagents extension by Nico Bailon](https://github.com/nicobailon/pi-subagents) that is supported

## Copy skills and agents

Configure the target folders in `.env`:

```env
SKILL_TARGET_FOLDERS=["/path/to/skills-folder1", "/path/to/skills-folder2"]
PI_AGENTS_TARGET_FOLDER=["/path/to/pi-agents-folder1", "/path/to/pi-agents-folder2"]
CODEX_AGENTS_TARGET_FOLDER=["/path/to/codex-agents-folder1", "/path/to/codex-agents-folder2"]
CLAUDE_AGENTS_TARGET_FOLDER=["/path/to/claude-agents-folder1", "/path/to/claude-agents-folder2"]
OPENCODE_AGENTS_TARGET_FOLDER=["/path/to/opencode-agents-folder1", "/path/to/opencode-agents-folder2"]
COPILOT_AGENTS_FOLDER=["/path/to/copilot-agents-folder1", "/path/to/copilot-agents-folder2"]
```

JSON arrays are preferred. Relative paths are resolved from the `.env` file's folder, `~` resolves to your home directory, and Windows drive paths are supported. In JSON strings, escape backslashes:

```env
SKILL_TARGET_FOLDERS=["C:\\Users\\me\\.codex\\skills"]
SKILL_TARGET_FOLDERS=["C:/Users/me/.codex/skills"]
SKILL_TARGET_FOLDERS=["%USERPROFILE%\\.codex\\skills"]
```

`%USERPROFILE%` is supported at the beginning of a target path.
Unescaped Windows backslashes in bracketed `.env` values are also tolerated for convenience, for example `SKILL_TARGET_FOLDERS=["C:\Users\me\.codex\skills"]`.

Then run:

```bash
npm run copy-skills
npm run copy-agents
```

To archive a local skill and optionally remove its installed copies, run:

```bash
npm run remove-skill <SKILL_NAME>
# The conventional explicit npm argument separator is also supported:
npm run remove-skill -- <SKILL_NAME>
```

The skill folder is moved from `skills/<SKILL_NAME>` to
`.legacy-skill/<SKILL_NAME>`. The command stops rather than overwriting an
existing archive. It then asks whether the same named folder should be removed
from every `SKILL_TARGET_FOLDERS` location; answer `Y` and Enter to remove them,
or `N` and Enter to leave target folders unchanged.

You can also run the script directly:

```bash
node scripts/copy-skills.js
node scripts/copy-skills.js --pi-agents
node scripts/copy-skills.js --codex-agents
node scripts/copy-skills.js --claude-agents
node scripts/copy-skills.js --opencode-agents
node scripts/copy-skills.js --copilot-agents
node scripts/copy-skills.js --pi-agents --codex-agents --claude-agents --opencode-agents --copilot-agents
```

On Linux/WSL, the executable form also works:

```bash
./scripts/copy-skills.js
```

To use a custom `.env` file path:

```bash
npm run copy-skills -- /path/to/.env
npm run copy-agents -- /path/to/.env
# or
node scripts/copy-skills.js /path/to/.env
node scripts/copy-skills.js --pi-agents /path/to/.env
node scripts/copy-skills.js --codex-agents /path/to/.env
node scripts/copy-skills.js --claude-agents /path/to/.env
node scripts/copy-skills.js --opencode-agents /path/to/.env
node scripts/copy-skills.js --copilot-agents /path/to/.env
node scripts/copy-skills.js --pi-agents --codex-agents --claude-agents --opencode-agents --copilot-agents /path/to/.env
```

The script copies every skill folder from `./skills` into each configured `SKILL_TARGET_FOLDERS` folder, every Pi agent folder from `./agents/pi` into each configured `PI_AGENTS_TARGET_FOLDER` folder, every Codex agent file from `./agents/codex` into each configured `CODEX_AGENTS_TARGET_FOLDER` folder, every Claude agent `.md` file from `./agents/claude` into each configured `CLAUDE_AGENTS_TARGET_FOLDER` folder, every OpenCode agent `.md` file from `./agents/opencode` into each configured `OPENCODE_AGENTS_TARGET_FOLDER` folder, and every Copilot agent `.md` file from `./agents/copilot` into each configured `COPILOT_AGENTS_FOLDER` folder. Existing entries with the same name are overwritten.

Direct `.txt` files in `./agents` are shared raw Markdown prompt bodies. When copying agent configurations, the script matches each configuration's filename stem to a prompt filename stem using exact, case-sensitive matching. Checked-in harness configuration files contain metadata only; matching copied Markdown files receive the raw prompt body, while matching copied TOML files receive it as a `developer_instructions` multiline value. Shared `.txt` files are not copied to agent targets.

`npm run copy-agents` runs all agent copy modes: `--pi-agents --codex-agents --claude-agents --opencode-agents --copilot-agents`.
When running multiple copy modes, modes without configured target folders are skipped.

## Status

Temporary project. Content is subject to change.
