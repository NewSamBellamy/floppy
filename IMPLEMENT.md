# Autonomous execution

1. Read `STATUS.md`, the current section of `PLAN.md`, and only the source/tests needed for that milestone. Inspect the relevant UI and Git diff before editing. Preserve user data and pre-existing changes.
2. Reproduce the issue or document the missing behavior. Keep working paths intact. Fix the root cause with the smallest coherent change; avoid stacking patches or introducing a new product model.
3. Run relevant unit tests, syntax checks, and an isolated browser journey. Fix failures caused by the change. Verify refresh and existing-project behavior when persistence is touched. Do not use a real Gemini key during ordinary tests.
4. Perform every acceptance check for the milestone. Do not stop when the code merely compiles. If a check cannot be run, record exactly what remains unverified.
5. Update `STATUS.md` with evidence, known risks, decisions, and the next action. Review the diff, then make a stable checkpoint commit for completed work. Preserve unrelated user edits and backups.
6. Continue within the milestone until its acceptance criteria pass. Stop for a genuinely ambiguous product choice, destructive operation, missing credential needed for a required live check, external blocker, or failure that cannot safely be resolved. Present the concrete state and decision needed.

When UI judgment is required, prefer simplicity, focus, progressive disclosure, and the current product language over adding components.
