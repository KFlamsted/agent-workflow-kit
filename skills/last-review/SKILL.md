---
name: last-review
description: Explicitly invoked workflow for thoroughly reviewing the current branch against master without making code changes.
---

# Last Review

Review `git diff master` thoroughly. Do not modify code.

## Input
The main input is the current branch's code changes compared to master.  
The original implementation plan might be included, but not necessarily. 

## Process
1. Compare the current branch against `master` unless the user specifies another base.
2. Review only changed code and directly related context.
3. Focus on:
  - Bugs and edge cases.
  - Maintainability.
  - Code quality.
  - Coding standards.
  - Design and architecture.

Be thorough in your analysis, but do not be nitpicky in terms of issues you find.  
Do not find something just to find something. This is the last review before merging to master.

## Output
If you find issues, report them clearly with file paths and recommendations.
If there are no findings, say so clearly.
