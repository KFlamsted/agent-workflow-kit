# Simple skills and agents

A collection of reusable skills and agents for AI coding tools. The repository includes workflows for planning, implementation, code review, and orchestration, along with scripts that install them into local tool directories.

Supported agent formats include Pi, Codex CLI, Claude Code, OpenCode, and GitHub Copilot CLI. Skills are copied in the common `SKILL.md` directory format.

## Repository structure

- `skills/` contains the reusable skills.
- `agents/` contains shared prompt bodies and tool-specific agent configurations.
- `scripts/` contains the copy and removal utilities.
- `base-prompts/` and `configs/` contain my personal OpenCode config and the system prompts for custom primary agents also in OpenCode.

## Requirements

- Node.js 18 or newer
- npm
- Write access to the configured target directories

The repository has no package dependencies, so no install step is required.

## Setup

Copy `.env.example` to `.env`, then configure one or more target directories:

```env
SKILL_TARGET_FOLDERS=["/path/to/skills"]
PI_AGENTS_TARGET_FOLDER=["/path/to/pi-agents"]
CODEX_AGENTS_TARGET_FOLDER=["/path/to/codex-agents"]
CLAUDE_AGENTS_TARGET_FOLDER=["/path/to/claude-agents"]
OPENCODE_AGENTS_TARGET_FOLDER=["/path/to/opencode-agents"]
COPILOT_AGENTS_FOLDER=["/path/to/copilot-agents"]
```

JSON arrays are preferred and may contain multiple destinations. Relative paths are resolved from the `.env` file's directory. Paths beginning with `~` or `%USERPROFILE%`, as well as Windows drive paths, are supported.

## Usage

Copy all skills or all configured agents:

```bash
npm run copy-skills
npm run copy-agents
```

Agent targets that are not configured are skipped. Existing entries with the same name are replaced.

To copy agents for selected tools, run the script directly:

```bash
node scripts/copy-skills.js --pi-agents
node scripts/copy-skills.js --codex-agents
node scripts/copy-skills.js --claude-agents
node scripts/copy-skills.js --opencode-agents
node scripts/copy-skills.js --copilot-agents
```

Flags can be combined. To use a different environment file, pass its path positionally or with `--env`:

```bash
npm run copy-skills -- /path/to/.env
npm run copy-agents -- /path/to/.env
node scripts/copy-skills.js --pi-agents --env /path/to/.env
```

### Remove a skill

```bash
npm run remove-skill -- <SKILL_NAME>
```

This moves the skill from `skills/` to `.legacy-skills/` and asks whether matching installed copies should also be removed. Existing archives are not overwritten.

## Agent configuration

Shared agent prompts live in `agents/*.txt`. Tool-specific files under `agents/<tool>/` provide the required metadata. The copy script matches files by their case-sensitive filename stem and combines the prompt with the target tool's configuration format.

## Compatibility notes

- Codex CLI does not currently support spawning the custom agents included here.
- In Copilot CLI auto mode, orchestrator agents may answer questions themselves instead of returning control to the user.
- Pi support uses the [pi-subagents extension](https://github.com/nicobailon/pi-subagents).

The skills and agents are primarily tested with OpenCode. Support for other tools may vary as their agent APIs evolve.

## Development

Run the test suite with:

```bash
npm test
```

## Status

This project is evolving and its skills, agents, and compatibility may change.

## License

[MIT](LICENSE)
