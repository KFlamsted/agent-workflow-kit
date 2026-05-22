---
name: code-quality-review
description: Explicitly invoked workflow for reviewing branch changes for targeted code-quality concerns.
---

# Code Quality Review

Review changes only. Do not modify code.

## Process
1. Compare the current branch against `master` unless the user specifies another base.
2. Review only changed code and directly related context.
3. Focus on:
   - Functions that should be moved to utilities.
   - Similar logic within this branch that should be merged.
   - Poor or misleading names for variables, constants, functions, or methods.
   - Reusable test values.
   - Unused variables or constants.
   - Places where a short "why" comment would help, while preferring self-documenting code.
4. Be thorough, but avoid nitpicks.

## Output
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
