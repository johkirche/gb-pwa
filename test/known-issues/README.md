# Known issues

**This directory is currently empty. That is the goal state, not a mistake.**

One spec per filed GitHub issue lives here, each asserting the behaviour the app
**should** have. Specs here are red on purpose, and are kept out of `pnpm test`
so that red in the main suite keeps meaning "you just broke something" rather
than "one of the known bugs is still a known bug".

Run it with `pnpm test:known-issues` (config: `vitest.known-issues.config.ts`).

## Workflow

1. Bug found → file an issue, add `test/known-issues/issue-<N>-<slug>.test.ts`.
2. Bug fixed → that spec's red assertions go green.
3. **Promote** the spec into the main suite — merge it into the module's existing
   spec file, strip the "EXPECTED TO FAIL" header, reword as a regression guard —
   and close the issue.

Step 3 is not optional. A fully-green file left in this directory is no longer
describing an open defect, and will rot.

## Two rules that make it work

- **Fail by assertion, never by crashing.** A spec that is red because of a bad
  import or a missing mock is worthless — it would stay red after the fix. Every
  failure must be a real expected-vs-actual comparison.
- **Include a guard that passes.** Each file should also assert what must remain
  true after the fix (e.g. "a normal token is still reported valid"), so a fix
  cannot swing past the target. Partly-green files are correct and expected.

## Why the directory is empty

The bug backlog tracked in issue #31 (#5–#30) is closed: 26 of 26 fixed, every
spec promoted into the main suite. `passWithNoTests: true` in the config is what
lets that state read as green in CI instead of exiting 1 with "No test files
found".

Not every issue maps to a unit test — #10, #12, #13, #19 and #30 were view-level,
config, or not meaningfully testable in isolation, and were verified by hand
instead. Do not invent a spec just to fill the grid; fix it and say exactly how
you verified it.

See `TESTING.md` for the full testing contract.
