# Example Prompts

This repository is a temporary collection of example prompts used for development and experimentation.

The current files should be reviewed, refined, and reworked into proper skills so they can be reused more consistently and maintained more easily.

The project is expected to be migrated into actual AI skills rather than using copy+paste .txt files.

## Copy skills

Configure the target folders in `.env`:

```env
SKILL_TARGET_FOLDERS=["/path/to/folder1", "/path/to/folder2"]
```

Then run:

```bash
npm run copy-skills
```

You can also run the script directly:

```bash
node copy-skills.js
```

On Linux/WSL, the executable form also works:

```bash
./copy-skills.js
```

To use a custom `.env` file path:

```bash
npm run copy-skills -- /path/to/.env
# or
node copy-skills.js /path/to/.env
```

The script copies every skill from `./skills` into each configured target folder and overwrites skills with the same name.

## Status

Temporary project. Content is subject to change.
