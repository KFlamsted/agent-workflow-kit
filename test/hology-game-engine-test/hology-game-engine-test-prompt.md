# Run the Hology skill test suite

1. Verify that the `hology-game-engine` skill exists and can be loaded or invoked. Load it before testing; if this fails, stop and report the suite as failed.
2. Find `test_files/NN_*.md` and process them in filename order, one at a time.
3. For each task `NN`, spawn a fresh subagent from the suite root so the root `AGENTS.md` / `CLAUDE.md` instructions and installed skills remain discoverable. Its prompt must contain only `Write all files exclusively within output/task_NN/.` followed by the prompt text under the task's `## Prompt` heading. Do not send the whole task file, pass criteria, or fail signals.
4. Wait for the subagent and save its response in `output/task_NN/response.md`. Assess its work against the task file's pass criteria and fail signals, run any practical compile or validation checks, and write the verdict with a brief reason to `output/task_NN/evaluation.md` before continuing.
5. Write `output/results.md` with a per-test result list and overall totals.
