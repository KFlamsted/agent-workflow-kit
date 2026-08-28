---
name: union-merge-loop
description: Explicitly invoked workflow for making a union merge from master/main into the current branch.
---

# Union merge loop
I want you to merge `master` or `main` into this branch, however there is a merge conflicts as we speak. If there's no merge conflict, then just merge in.
I want you to resolve the conflicts using a union merge method; ie. I want you to make sure that the functionality persist from both branches.
I want you to analyze what's necessary for the merge and then invoke the `implement-plan-loop` skill where you handover a brief merge/implementation plan.
If you run into conflicting functionality that you're unsure of during your analysis then please ask and let's figure it out together. Before you invoke the loop skill.
Furthermore if there's any other necessary clarifications, do not hesitate to ask.