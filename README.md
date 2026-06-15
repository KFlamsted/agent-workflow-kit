# Example Prompts

This repository is a temporary collection of example prompts used for development and experimentation.

The current files should be reviewed, refined, and reworked into proper skills so they can be reused more consistently and maintained more easily.

The project is expected to be migrated into actual AI skills rather than using copy+paste .txt files.

## Copy skills and agents

Configure the target folders in `.env`:

```env
SKILL_TARGET_FOLDERS=["/path/to/skills-folder1", "/path/to/skills-folder2"]
AGENTS_TARGET_FOLDER=["/path/to/agents-folder1", "/path/to/agents-folder2"]
CODEX_AGENTS_TARGET_FOLDER=["/path/to/codex-agents-folder1", "/path/to/codex-agents-folder2"]
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

You can also run the script directly:

```bash
node copy-skills.js
node copy-skills.js --agents
node copy-skills.js --codex-agents
node copy-skills.js --agents --codex-agents
```

On Linux/WSL, the executable form also works:

```bash
./copy-skills.js
```

To use a custom `.env` file path:

```bash
npm run copy-skills -- /path/to/.env
npm run copy-agents -- /path/to/.env
# or
node copy-skills.js /path/to/.env
node copy-skills.js --agents /path/to/.env
node copy-skills.js --codex-agents /path/to/.env
node copy-skills.js --agents --codex-agents /path/to/.env
```

The script copies every skill folder from `./skills` into each configured `SKILL_TARGET_FOLDERS` folder, every agent folder from `./agents` into each configured `AGENTS_TARGET_FOLDER` folder, and every Codex agent file from `./codex-agents` into each configured `CODEX_AGENTS_TARGET_FOLDER` folder. Existing entries with the same name are overwritten.

`npm run copy-agents` runs both agent copy modes: `--agents --codex-agents`.

## Status

Temporary project. Content is subject to change.
