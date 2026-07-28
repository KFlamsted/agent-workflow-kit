# Run the Hology skill test suite

1. Verify that the `hology-game-engine` skill exists and can be loaded or invoked. Load it before testing; if this fails, stop and report the suite as failed.
2. Find the numbered test task files matching `NN_*.md` and process them in filename order, one at a time.
3. For each task, spawn a fresh subagent using **only the prompt text under that task's `## Prompt` heading** as its prompt. Do not send the whole task file, pass criteria, or fail signals to the subagent.
4. Wait for the subagent, then assess its output against that task file's pass criteria and fail signals. Run any practical compile or validation checks. Record success or failure with a brief reason before continuing.
5. Finish with a per-test result list and overall totals.
