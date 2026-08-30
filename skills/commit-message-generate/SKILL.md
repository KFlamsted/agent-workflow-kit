---
name: commit-message-generate
description: Generates a concise commit message from provided changes without running git commands.
disable-model-invocation: false
---

# Commit Message Generate

Generate a proper commit message only. Do not run git commands.

## Input
- A change summary, diff, file list, or user-provided context describing the changes.

## Process
1. Use only the context already provided by the user or visible in the conversation.
2. Do not run `git` commands, including `git status`, `git diff`, or `git log`.
3. If the changes are unclear or no change context is available, ask the user to provide a summary or diff.
4. Use Conventional Commits format: `type(scope): summary` (omit the scope when unnecessary).
5. Keep the subject concise. For larger changes, add a brief body as a bullet list describing the key changes.

## Output
- Return only the commit message.
- Be very concise.
