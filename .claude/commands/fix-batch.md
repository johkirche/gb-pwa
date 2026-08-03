---
description: Work one batch (A-F) of the bug backlog tracked in issue #31
---

Work Batch **$ARGUMENTS** of the bug backlog in this repo — a German hymnal /
church-service PWA used live during services, often on a phone or tablet with no
signal.

Branch: `dev`. Repo: `johkirche/gb-pwa`. CI runs on push to `dev`.

> **Guard:** `$ARGUMENTS` must be a single batch letter A–F. If it is empty or
> anything else, stop and ask which batch.

## 1. Read the tracking issue first

```bash
gh issue view 31 --repo johkirche/gb-pwa
```

Issue #31 is the source of truth for batch contents, ordering and collisions.
Find your batch, then check five things before touching code:

- **Is it claimed?** If its Status row is not `unclaimed`, stop and say so.
- **Is it blocked?** Batch F may only start once A and E are closed. Check the
  Status table and the checkboxes.
- **Is it "ONE agent"?** Then *some* of its issues edit the same function — the
  batch's Collision note says exactly which. Do those in one pass; the rest can
  be separate commits within the batch.
- **Is it ordered?** E: #13 first, and #6 before #10. C: #19 last.
- **Is it partly done?** Reconcile before starting:
  ```bash
  gh issue list --repo johkirche/gb-pwa --state closed --limit 50
  ls test/known-issues/
  ```
  An issue that is closed **and** whose `issue-<N>-*.test.ts` is gone is done —
  skip it. Closed but spec still present means the promote step was missed:
  finish it. Open but spec missing means someone was mid-flight — re-verify
  before assuming anything.

Then read each issue: `gh issue view <N> --repo johkirche/gb-pwa`. Each has the
verified mechanism, caller evidence, user impact and a suggested fix. Trust it,
but confirm against the source — line numbers may have drifted.

Batch A is listed in #31 as safe to parallelise one-agent-per-issue. That is a
throughput hint for whoever dispatches work — you may simply work it serially,
one issue and one commit at a time.

## 2. Claim the batch

```bash
gh issue comment 31 --repo johkirche/gb-pwa --body "claiming Batch $ARGUMENTS"
```

Then set that batch's Status row to `in progress` and fill in the Owner column
(see §5).

## 3. The two-suite contract — the part that is easy to get wrong

| Command | Meaning | Must be |
| --- | --- | --- |
| `pnpm test` | Did I break something? | **green, always** |
| `pnpm test:known-issues` | Which filed bugs are still open? | red until fixed |

`test/known-issues/issue-<N>-*.test.ts` asserts the behaviour the app SHOULD
have. It fails on purpose and is NOT run by `pnpm test`. Read `TESTING.md` before
writing code — but note #31 and this file are authoritative where they differ.

**#10, #12, #13, #19 and #30 have no spec** — view-level, config, or not
meaningfully unit-testable. Write one if you find a clean way, otherwise fix and
verify by hand and state exactly how. Do not invent a test to fill the grid.

## 4. The loop

Per issue:

1. Fix the code in `src/`.
2. `pnpm test:known-issues` — that issue's failing assertions now pass.
3. **Promote the spec**: move it out of `test/known-issues/` into the main suite,
   merging into the module's existing spec file if there is one. Strip the
   "EXPECTED TO FAIL" header; reword as a regression guard. Then check whether
   `vitest.config.ts` mentions the spec you just moved — the `useJwtUtils.ts`
   threshold comment references issue #11's spec by name and must be updated
   along with its number.
4. `pnpm test` — green, now including the promoted tests.
5. `pnpm ci:verify` — exit 0. CI additionally runs `pnpm build-only`; run that
   too if you touched imports, assets or vite config.
6. `git pull --rebase origin dev`, re-run `pnpm test`, then commit and push.
7. Close the issue:
   ```bash
   gh issue close <N> --repo johkirche/gb-pwa --comment "Fixed in <sha>. <one line>"
   ```

Step 3 is not optional — a green file left in `test/known-issues/` will rot.

**For a ONE-agent batch (B, C, D, E):** do steps 1–2 for the whole batch, then
promote all its specs, then one `pnpm ci:verify`, one commit, one push. Close
each issue against that same sha with its own one-line comment. This avoids
rewriting the same function once per issue.

**Checking CI.** There are two jobs:

```bash
gh run list --repo johkirche/gb-pwa --branch dev --limit 1
gh run view <id> --repo johkirche/gb-pwa
```

`Lint, type-check, test, build` **must pass**. `Known issues (expected red)` is
`continue-on-error: true` and stays red until the whole backlog is closed — that
one failing is normal and is not your problem. Because CI cancels superseded runs
on the same branch, only wait on CI for your final push of the batch.

## 5. Update the tracking issue

State lives in the body (checkboxes, Status table); narrative goes in comments.

```bash
gh issue view 31 --repo johkirche/gb-pwa --json body --jq .body > tracking.local
# edit: "- [ ] #14" -> "- [x] #14", and your Status row
gh issue edit 31 --repo johkirche/gb-pwa --body-file tracking.local
rm tracking.local
```

`tracking.local` sits in the repo root and is already gitignored by the
`*.local` rule, so this works the same in any shell. Do not use `/tmp` — it
resolves differently between Git Bash and PowerShell on this machine.

**Re-read immediately before every write.** Another agent may be editing the same
body; a stale write silently clobbers their progress. Only change your batch's
lines.

```bash
gh issue comment 31 --repo johkirche/gb-pwa --body "Batch $ARGUMENTS done: <issue numbers>. <what landed>"
```

## 6. Hard rules

- **Never make a known-issues spec pass by editing the spec.** That is the
  obvious shortcut and it destroys the point of the suite. If you believe a spec
  asserts the wrong thing, stop and say so.
- Do not fix issues outside Batch $ARGUMENTS. You **may** need to update
  main-suite tests belonging to another batch's module when your fix legitimately
  changes behaviour — #31 warns this will happen for #6 and the songs store. That
  is allowed; say so in the commit message.
- Fix the root cause named in the issue. If the issue turns out to be wrong, say
  so and stop rather than fixing something adjacent.
- If an issue needs a **product decision** rather than a fix (#31 flags #25 that
  way), let the known-issues spec decide — implement what it asserts. If the spec
  does not settle it, stop and ask. Do not pick a direction yourself.
- Do not modify `test/setup.ts` or either vitest config. The one sanctioned
  exception is a coverage threshold in `vitest.config.ts`, and only with a comment
  explaining why — never to paper over coverage your own change lost.
- No real network requests in tests. Deterministic only: no real clock, no
  random, no ordering dependence.

## 7. When a main-suite test fails

Two different situations, and you must tell them apart:

- **Caused by your fix** — it was probably pinning the old behaviour. Read it,
  decide deliberately, explain the change in the commit message. Do not just
  delete it.
- **Unrelated** — re-run it alone, then `git stash` and re-run to prove it was
  already failing. Pre-existing: leave it, report it, do not fix it in this
  batch. Reproducible only with your change: it is yours.

## 8. Gotchas that will cost you an hour

- `vi.mock` factories hoist above top-level consts — anything they close over
  must live in `vi.hoisted()`.
- `useAuth`, `useOfflineDownload` and `useFavorites` hold module-level state:
  they need `vi.resetModules()` + dynamic import, importing `pinia` **after** the
  reset, or the store and `setActivePinia` land on different copies.
- Pinia stores in tests: `setActivePinia(createPinia())` in `beforeEach`.
- **Coverage.** The global thresholds are aggregate, not per-file
  (`perFile: false`). Five files have their own per-file thresholds set within
  about a point of actuals: `useAuth.ts`, `stores/auth.ts`, `useJwtUtils.ts`,
  `useOfflineDownload.ts`, `router/index.ts`. Promoting a spec only *raises*
  coverage — a failure there almost always means your fix added uncovered
  branches. Cover them rather than lowering the number.
- `storeToRefs` refs need `.value` in `<script setup>` but not in templates.
  `vue/no-ref-as-operand` is enabled but cannot see through `storeToRefs`, so the
  linter will not catch that class of bug. That is issue #13.

## 9. Report

Per issue: what changed, how you verified it, which spec you promoted and where,
and anything that contradicts the issue as written. Then confirm: `pnpm test`
green, `pnpm ci:verify` exit 0, the `Lint, type-check, test, build` CI job green,
and the tracking issue updated.
