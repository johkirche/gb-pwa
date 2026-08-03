# Testing

There are **two** suites, because they answer different questions.

| | Question it answers | State | Gates merges |
| --- | --- | --- | --- |
| `pnpm test` | Did this change break something? | 628 green | Yes |
| `pnpm test:known-issues` | Which filed bugs are still open? | 75 red / 56 green | No |

```bash
pnpm test               # main suite, ~7s
pnpm test:watch         # watch mode while developing
pnpm test:coverage      # main suite + coverage thresholds
pnpm test:known-issues  # the open-bug suite — EXPECTED to fail
pnpm ci:verify          # what CI gates on: lint → type-check → test + coverage
```

## The known-issues suite

`test/known-issues/` holds one spec per filed GitHub issue, each asserting the
behaviour the app **should** have. It is red on purpose.

This exists because the alternative is worse. Tests that assert a bug as if it
were correct — `"loses one of two concurrent adds"`, `"writes anyway when the
song is not in the playlist"` — look like ordinary passing tests in a green run.
They read as coverage while quietly blessing the defect, and nobody finds them
without opening that exact file. Around a dozen such tests existed and have been
removed or rewritten; where one was removed there is a comment pointing here.

**Workflow**

1. Bug found → file an issue, add `test/known-issues/issue-<N>-<slug>.test.ts`.
2. Bug fixed → that spec's red assertions go green.
3. Promote the spec into the main suite and close the issue.

Step 3 is not optional: a fully-green file in that directory is no longer
describing an open defect.

**Two rules that make it work**

- *Fail by assertion, never by crashing.* A spec that is red because of a bad
  import or a missing mock is worthless — it would stay red after the fix. Every
  failure must be a real expected-vs-actual comparison. All 75 current failures
  are; none is a crash, timeout or import error.
- *Include a guard that passes.* Each file also asserts what must remain true
  after the fix (e.g. "a normal token is still reported valid"), so a fix cannot
  swing past the target. Partly-green files are correct and expected.

Not every issue maps to a unit test. Five have no spec — **#10, #12, #13, #19
and #30** — because they are view-level, config, or not meaningfully testable in
isolation. They are tracked in issue #31 instead.

Issue #31 also carries the dependency graph and the work batches: several issues
edit the same function and must be fixed together. Start there, not from the
issue list.

## Why the split

A single permanently-red suite cannot gate anything: with ~75 known failures, a
PR that breaks a 76th thing looks identical to one that breaks nothing, and
branch protection stops meaning anything. Splitting keeps "red means you just
broke it" in the main suite while making the open bugs loudly visible as their
own CI check on every PR.

## What is covered, and why that

The suite deliberately targets the **logic layer** — composables, Pinia stores,
the router guard — rather than the component tree. That is where this app's
failures are silent and expensive:

- The offline-first auth contract. If it regresses, a user is bounced to
  `/login` in a church basement with no signal, and the hymnal they downloaded
  becomes unreachable. Nothing about that failure is obvious from reading a diff.
- The IndexedDB download/storage layer, for the same reason.
- The service and playlist stores, which are used live during a service.

Vendored `src/components/ui/**` (shadcn/reka-ui) and generated `src/gql/**` are
excluded: testing them tests somebody else's code.

| Area | File | Tests |
| --- | --- | ---: |
| Offline download / IndexedDB | `test/composables/useOfflineDownload.test.ts` | 92 |
| Church service store | `test/stores/churchService.test.ts` | 103 |
| Song list store | `test/stores/gesangbuchlieder.test.ts` | 81 |
| Playlists store | `test/stores/playlists.test.ts` | 54 |
| Song queries | `test/composables/useGesangbuchlied.test.ts` | 53 |
| Stats + free pieces stores | `test/stores/stats.test.ts` | 51 |
| **Auth composable** | `test/composables/useAuth.test.ts` | **40** |
| Directus API client | `test/composables/useDirectusApi.test.ts` | 38 |
| Offline assets + favorites | `test/composables/useOfflineAsset.test.ts` | 29 |
| JWT utilities | `test/composables/useJwtUtils.test.ts` | 22 |
| Auth store | `test/stores/auth.test.ts` | 21 |
| **Router guard** | `test/router/guard.test.ts` | **20** |
| PWA install | `test/composables/usePWA.test.ts` | 12 |
| i18n locale resolution | `test/plugins/i18n.test.ts` | 8 |
| Song text rendering | `test/components/TextDisplay.test.ts` | 8 |
| Harness self-check | `test/harness.test.ts` | 7 |

### Coverage

Roughly 80% of statements and 94% of branches across the logic layer.

The statement figure is held down by one file: `useMidiPlayer.ts` (1138 lines,
0%). It calls `refreshOutputsShared()` at import time and needs Web MIDI,
`AudioContext` and `AudioWorklet`, so unit tests would mostly assert against
mocks of the things that actually break. It is left **in** the coverage report
rather than excluded, so the gap stays visible instead of being hidden behind a
flattering number. If that code needs verifying, an end-to-end test on real
hardware is the honest way to do it.

Per-file thresholds guard the files that matter most (`useAuth.ts`,
`stores/auth.ts`, `useJwtUtils.ts`, `useOfflineDownload.ts`, `router/index.ts`).
Global thresholds sit a few points under current actuals, so routine work will
not break the build but a real regression will.

## How the harness is put together

- **Vitest 3 + happy-dom.** `vitest.config.ts` is deliberately separate from
  `vite.config.ts`: the app config loads VitePWA, vue-devtools and a
  `copySpessaSynthWorklet()` plugin that throws from `configResolved` and writes
  into `public/`. None of that belongs in a test run.
- **`test/setup.ts`** registers `fake-indexeddb`, clears `localStorage` and
  `sessionStorage` before every test, silences `console.*` as *inspectable*
  spies (so a test can still assert a warning was logged), and hands the clock
  back after each test.
- **`VITE_PUBLIC_DIRECTUS_URL` is pinned** to `https://directus.test` in the
  config, so tests never read your local `.env` and can assert on built URLs.
- **No test makes a real network request.**
- Shared helpers live in `test/helpers/` — `jwt.ts` for building tokens,
  `env.ts` for faking `navigator.onLine`.

### Conventions

- One behaviour per test; the test name states the behaviour, not the method.
- A comment above any non-obvious test explaining **why the behaviour matters**,
  not what the code does.
- Anything a `vi.mock` factory closes over goes in `vi.hoisted` — `vi.mock` is
  hoisted above ordinary top-level consts and will otherwise hit the TDZ.
- Pinia stores: `setActivePinia(createPinia())` in `beforeEach`.
- Modules with mutable module-level state (`useAuth`, `useOfflineDownload`,
  `useFavorites`) are re-imported per test via `vi.resetModules()`. Import
  `pinia` *after* the reset, or the store and `setActivePinia` end up on
  different copies of it.
- No snapshot tests, no reliance on ordering. The suite is verified
  order-independent with `pnpm vitest run --sequence.shuffle`.

## Bugs the suite surfaced

Open defects live in `test/known-issues/` (see above), never as green tests in
the main suite.

Three were fixed outright, and the tests that pinned them are now regression
guards in the main suite:

- `playlists.ts` — `updatePlaylist` spread a reactive Proxy into IndexedDB, so
  every patch without an explicit `songIds` threw `DataCloneError`. That was the
  edit dialog in `PlaylistDetailView`, i.e. renaming a playlist never worked.
- `useOfflineDownload.ts` — a transient IndexedDB failure was cached as a
  permanent "no offline content", disabling offline mode for the tab.
- `gesangbuchlieder.ts` — titles sorted by UTF-16 code unit, putting every
  umlaut behind "Z".

## CI

`.github/workflows/ci.yml` runs on every push to `master` or `dev`, and on every
pull request. It has **two jobs**:

- **`Lint, type-check, test, build`** — the gate. install → lint → type-check app
  → type-check tests → main suite with coverage → build. Must pass. The coverage
  report is uploaded as an artifact.
- **`Known issues (expected red)`** — runs `pnpm test:known-issues`. It is
  `continue-on-error: true` and stays red until the backlog is closed, so it
  never blocks a merge. It exists to keep the open-bug count visible on every PR.

`pnpm ci:verify` runs the gate locally, minus the build step.

Note that `lint` and `ci:lint` differ on purpose: `pnpm lint` auto-fixes,
`pnpm ci:lint` only reports, because CI must not mutate the tree.
