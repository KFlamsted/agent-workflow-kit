# Agent Prompt Consolidation Implementation Plan

## Objective

Consolidate the shared code-implementer and code-reviewer system prompts into canonical text files while retaining harness-specific agent metadata as separate source files. Reorganize all harness sources under a single `agents/` directory and make `copy-skills.js` inject a matching shared prompt only into files copied to configured agent target directories.

The implementation must remain extensible: prompt selection is based on exact, case-sensitive filename-stem matching, not on hardcoded `code-implementer` or `code-reviewer` names.

## Confirmed Decisions

- Use the plural parent directory `agents/`.
- Use the Pi/Claude prompt wording and Markdown formatting as the canonical prompt content.
- Rename the Pi agent directories and files to the short `code-implementer` and `code-reviewer` names now.
- Match prompt and agent configuration files by exact, case-sensitive filename stem, independent of `.txt`, `.md`, or `.toml` extension.
- Copy configurations without a matching prompt unchanged.
- Generate Codex instructions as a valid TOML multiline `developer_instructions` value.
- Keep checked-in harness configuration files prompt-free; inject prompts only into copies written to configured target directories.
- Do not copy the shared `.txt` files themselves to harness targets.
- Preserve the existing `copy-agents` command, agent CLI flags, and environment variable names.
- Delete the Pi `subagent-example.md` file.
- Leave `.legacy-skills/` unchanged.
- Add only a small, focused test suite using Node's built-in test runner.
- Do not use a repository-local staging directory. Transform destination files after copying so no `.gitignore` change is needed.

## Target Source Layout

Replace the four root-level `*-agents/` directories with this structure:

```text
agents/
├── code-implementer.txt
├── code-reviewer.txt
├── claude/
│   ├── code-implementer.md
│   └── code-reviewer.md
├── codex/
│   ├── code-implementer.toml
│   └── code-reviewer.toml
├── opencode/
│   ├── code-implementer.md
│   └── code-reviewer.md
└── pi/
    ├── code-implementer/
    │   └── code-implementer.md
    └── code-reviewer/
        └── code-reviewer.md
```

The resulting copied target files remain harness-native:

- Claude and OpenCode receive flat `.md` files.
- Codex receives flat `.toml` files containing generated `developer_instructions` values.
- Pi receives one directory per agent, but those target directories are now named `code-implementer/` and `code-reviewer/`.

## Relevant Files

### Files to add

- `agents/code-implementer.txt`
- `agents/code-reviewer.txt`
- `test/copy-agents.test.js` (or the repository's equivalent singular test directory name chosen during implementation)

### Files/directories to move and edit

- `opencode-agents/` -> `agents/opencode/`
- `claude-agents/` -> `agents/claude/`
- `codex-agents/` -> `agents/codex/`
- `pi-agents/` -> `agents/pi/`
- `agents/pi/code-implementation-loop-code-implementer/` -> `agents/pi/code-implementer/`
- `agents/pi/code-implementer/code-implementation-loop-code-implementer.md` -> `agents/pi/code-implementer/code-implementer.md`
- `agents/pi/code-implementation-loop-code-reviewer/` -> `agents/pi/code-reviewer/`
- `agents/pi/code-reviewer/code-implementation-loop-code-reviewer.md` -> `agents/pi/code-reviewer/code-reviewer.md`
- `copy-skills.js`
- `README.md`
- `.env.example`
- `package.json`

### File to delete

- `pi-agents/subagent-example.md` as part of the directory migration (do not recreate it under `agents/pi/`)

### Files explicitly left unchanged

- `.legacy-skills/code-implementation-loop-code-implementer/SKILL.md`
- `.legacy-skills/code-implementation-loop-code-reviewer/SKILL.md`
- `skills/code-implementation-loop-orchestrator/SKILL.md`
- The ignored local `.env`
- Existing CLI flag names and environment variable names
- `.gitignore`, because generation will not use a repository-local temporary directory

## Implementation Steps

### 1. Reorganize the harness source directories

1. Create the `agents/` parent directory.
2. Move each existing harness directory beneath it and remove the redundant `-agents` suffix:
   - `opencode-agents` -> `agents/opencode`
   - `claude-agents` -> `agents/claude`
   - `codex-agents` -> `agents/codex`
   - `pi-agents` -> `agents/pi`
3. Delete the moved `agents/pi/subagent-example.md` template.
4. Rename both Pi agent directories and their contained Markdown files to the exact short stems `code-implementer` and `code-reviewer`.
5. Preserve Pi front matter, including `name: code-implementer`/`code-reviewer` and `package: code-implementation-loop`. This keeps the logical package-qualified identifiers used by the orchestration skill while changing only source and copied directory/file names.
6. Confirm no obsolete root-level `opencode-agents/`, `claude-agents/`, `codex-agents/`, or `pi-agents/` directory remains.

### 2. Create canonical shared prompt files

1. Add `agents/code-implementer.txt` containing the complete Markdown system prompt from `# Code Implementer` through the final instruction that the reviewer decides approval.
2. Add `agents/code-reviewer.txt` containing the Pi/Claude reviewer variant, including the wording “Review only. Do not modify files and do not spawn subagents.”
3. Preserve the existing Markdown hierarchy, lists, code spans, punctuation, and blank lines. Use the Pi/Claude em-dash formatting rather than Codex's two ASCII-hyphen variants.
4. Give each text file a single final newline so copied outputs are deterministic.
5. Keep these files as raw Markdown despite their `.txt` extension; do not add YAML front matter or TOML delimiters.

### 3. Remove embedded prompts from harness source files

1. For every OpenCode, Claude, and Pi `.md` source, retain its complete harness-specific YAML front matter and closing `---`, but remove the Markdown system-prompt body below it.
2. For each Codex `.toml` source, retain fields such as `name`, `description`, `model`, `model_reasoning_effort`, and reviewer `sandbox_mode`, but remove the complete `developer_instructions = '''...'''` assignment.
3. Do not normalize unrelated metadata differences between harnesses. In particular, retain each harness's models, tool permissions, effort/thinking values, descriptions, and Pi package/context settings.
4. Ensure prompt-free Markdown and TOML source files remain syntactically well-formed and end consistently with a newline.

### 4. Point copy modes at the new source layout

Update the agent mode definitions in `copy-skills.js` so their source paths resolve to:

- `agents/pi`
- `agents/codex`
- `agents/claude`
- `agents/opencode`

Represent these as paths relative to the repository/script directory rather than assuming every mode source is a single root-level directory name. Leave the `skills` mode source unchanged.

Do not rename:

- `--pi-agents`, `--codex-agents`, `--claude-agents`, or `--opencode-agents` and their current aliases;
- `PI_AGENTS_TARGET_FOLDER`, `CODEX_AGENTS_TARGET_FOLDER`, `CLAUDE_AGENTS_TARGET_FOLDER`, or `OPENCODE_AGENTS_TARGET_FOLDER`;
- the `copy-agents` npm script.

### 5. Discover shared prompts generically

Add prompt discovery to `copy-skills.js` with these rules:

1. Read direct, non-hidden regular files under `agents/` whose extension is exactly lowercase `.txt`.
2. Build a map keyed by the exact filename stem (for example, `code-implementer`), with the entire file content as the value.
3. Preserve case sensitivity by using direct string/map lookup; do not lowercase or otherwise normalize names.
4. Do not define a list of known agent names anywhere in the script. Adding `agents/new-agent.txt` must automatically make `new-agent.md` and `new-agent.toml` eligible for prompt injection in any harness.
5. Load this map only for agent-copy modes. The skills-copy path must continue to operate independently of `agents/` prompt processing.

### 6. Inject prompts only into copied destinations

Retain the existing high-level copy behavior: discover each mode's eligible direct children, remove the corresponding destination entry, and copy the source entry to every configured target. After each agent entry is copied, recursively process regular files in that copied destination entry so Pi's nested Markdown files and flat harness files use one matching mechanism.

For each copied regular file:

1. Compute its filename stem using its final extension.
2. Look up that stem in the shared prompt map using exact, case-sensitive matching.
3. If no prompt matches, leave the copied file byte-for-byte unchanged.
4. If a prompt matches:
   - For `.md`, append one blank-line separator followed by the raw shared Markdown prompt. The result must contain one prompt copy and retain valid YAML front matter.
   - For `.toml`, append a `developer_instructions` multiline literal assignment after the metadata, with the shared Markdown inside the triple-single-quote delimiters. Preserve a newline before the closing delimiter and at end of file.
5. Do not write the transformed content back to the checked-in source file.
6. Do not copy root `.txt` prompt files into any target.
7. Leave matched files with unsupported extensions unchanged rather than guessing an output syntax. Current supported agent configurations are `.md` and `.toml`.

Keep renderer selection based on file format/extension only. Agent names must never control how content is generated.

For TOML safety, reject a matched prompt containing the literal multiline terminator `'''` with a clear error before writing malformed output, unless implementation uses an equivalently safe TOML encoding. The current canonical prompts do not contain that sequence.

### 7. Preserve existing copy semantics outside prompt injection

Verify that the refactor does not unintentionally alter:

- Source entry discovery: Pi copies direct child directories; Claude/OpenCode copy direct `.md` files; Codex retains its current direct-file discovery behavior.
- Recursive copying of selected Pi directories.
- Multiple configured targets.
- Destination replacement before copying.
- Single-mode missing-target errors and multi-mode missing-target skips.
- `.env` parsing, relative target resolution, tilde/Windows path support, and command aliases.
- Default skills mode behavior.

Because destination entries are replaced from prompt-free sources on every invocation, repeated `copy-agents` runs must not duplicate appended prompts.

### 8. Update documentation and examples

1. Update `README.md` references from the four root `*-agents/` source directories to `agents/pi`, `agents/codex`, `agents/claude`, and `agents/opencode`.
2. Document that direct `.txt` files in `agents/` are shared prompt bodies and are matched to harness configurations by exact filename stem during copying.
3. Clarify that checked-in harness files contain metadata only and copied target files receive the prompt appropriate to their format.
4. Retain all existing command examples, flag names, environment variable names, and overwrite behavior unless wording must change to describe prompt injection.
5. Update source-directory comments in `.env.example` to the new nested paths while leaving keys and example target values unchanged.
6. Add a `test` script to `package.json` using Node's built-in runner (for example, `node --test`) without adding dependencies.

## Minimal Test Plan

Add one focused end-to-end test file using `node:test`, `node:assert/strict`, `fs`, `os`, `path`, and `child_process`. Avoid third-party packages and avoid the repository's real ignored `.env`, which may point at live user configuration directories.

The test should:

1. Create an isolated directory with `fs.mkdtemp()` under the operating system's temporary directory and register cleanup.
2. Copy `copy-skills.js` and the new `agents/` source tree into that sandbox so the script resolves sources relative to the sandbox.
3. Add one prompt-free, unmatched `.md` configuration to a sandbox harness source. This fixture exists only at test runtime and does not add another production agent.
4. Write a sandbox `.env` whose four agent target variables point to separate directories inside the sandbox.
5. Spawn the script with all four existing agent mode flags and the sandbox environment file.
6. Assert representative behavior without duplicating every implementation detail:
   - OpenCode or Claude Markdown output preserves its front matter and ends with the exact matching shared prompt once.
   - Codex output contains one validly delimited `developer_instructions` assignment with the exact shared prompt.
   - Pi output is written under the renamed `code-implementer/` and `code-reviewer/` directories, with prompts appended to the nested Markdown files; old qualified directory names are absent.
   - The unmatched configuration is copied unchanged.
   - No `code-implementer.txt` or `code-reviewer.txt` appears in a harness target.
   - The sandbox source metadata files remain prompt-free after the command.
7. Keep this as a compact integration scenario rather than creating exhaustive tests for pre-existing environment parsing and CLI alias behavior.

## Validation Commands

Run from the repository root:

```bash
node --check copy-skills.js
npm test
git diff --check
```

Also audit stale source-path references and agent-name hardcoding:

```bash
rg -n 'opencode-agents|pi-agents|claude-agents|codex-agents' --glob '!.git/**'
rg -n 'code-implementer|code-reviewer' copy-skills.js
```

Interpret the first audit carefully: existing CLI flags, npm command arguments, and environment variable names intentionally retain `-agents`; only references claiming those are source directory names should be removed. The second command should find no agent-name-specific generation logic.

For final output inspection, use only the temporary destinations created by the automated test or a separate disposable `.env`. Do not run `npm run copy-agents` against the repository's ignored `.env` during validation because it may overwrite live local agent installations.

## Acceptance Criteria

- All harness sources live under `agents/<harness>/`; no root `*-agents/` source directory remains.
- `agents/code-implementer.txt` and `agents/code-reviewer.txt` contain the canonical Pi/Claude Markdown prompts.
- Harness `.md` and `.toml` source files contain metadata only and no duplicated system-prompt body.
- Pi source and copied paths use short `code-implementer` and `code-reviewer` directory/file names.
- The Pi example file is removed.
- Existing copy commands, flags, environment keys, target parsing, and skills copying remain compatible.
- Prompt lookup uses exact, case-sensitive filename stems and contains no hardcoded agent names.
- Matching copied Markdown and TOML files receive correctly formatted prompts only at their target locations.
- Unmatched configurations are copied unchanged, and shared `.txt` files are never copied as target agents.
- Repeated runs produce one prompt copy rather than accumulating duplicates.
- Documentation reflects the new layout and generation behavior.
- The focused Node integration test and syntax/whitespace checks pass.

## Risks and Mitigations

- **Pi installation path change:** Renaming Pi directories changes their copied filesystem paths. Preserve `name` and `package` front matter so logical package-qualified agent identifiers remain stable; verify both new paths and orchestration references during testing/review.
- **Invalid generated TOML:** Raw Markdown must not be appended outside a TOML value. Keep TOML generation in a format-specific renderer and guard the multiline delimiter.
- **Accidental source mutation:** Transform only after copying to the destination. The integration test must verify sandbox source files remain prompt-free.
- **Prompt duplication on reruns:** Preserve destination removal and always copy from clean metadata-only sources before injection.
- **Over-broad matching:** Use direct root `.txt` discovery and exact case-sensitive stems. Do not use substring, prefix, or suffix matching.
- **Live configuration overwrite during validation:** Use OS-temporary targets and never the developer's existing ignored `.env`.
- **Unrelated behavior regression:** Keep mode selection, environment parsing, target handling, and skills copying structurally separate from the new prompt-injection path.

## Assumptions

- Supported generated agent formats are Markdown (`.md`) and TOML (`.toml`).
- Shared prompts remain raw Markdown and do not contain TOML's `'''` multiline literal terminator.
- Harness-specific metadata remains intentionally different across platforms.
- Pi's `package: code-implementation-loop` metadata, rather than its source directory name, preserves the package-qualified agent identifiers used by the orchestrator.
- The existing Node.js runtime supports `node:test`, `fs.cp`, and the other built-in APIs already used by the script.
- No temporary generation directory or `.gitignore` update is required because transformation occurs directly in disposable/configured target locations.
