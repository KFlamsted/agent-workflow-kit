---
name: code-review
description: Explicitly invoked workflow for thoroughly reviewing the current branch against master or main without making code changes.
---

# Code Review

Review `git diff master` or `git diff main` thoroughly. Do not modify code.

## Input
The main input is the current branch's code changes compared to master/main.  
The original implementation plan might be included, but not necessarily. 

## Process
1. Compare the current branch against `master`/`main` unless the user specifies another base.
2. Review only changed code and directly related context.
3. In this review focus on:
  - Bugs and edge cases.
  - Maintainability.
  - Code quality.
  - Coding standards.
  - Design and architecture.

Be thorough in your analysis, but do not be nitpicky in terms of issues you find.  
Do not find something just to find something.

## Output
If you find issues, report them clearly with file paths and recommendations.  

Use this format:

```md
## Findings

### 1. Short title
- Severity: low | medium | high
- File: `path/to/file`
- Issue: ...
- Recommendation: ...
```

If there are no findings, say so clearly.
