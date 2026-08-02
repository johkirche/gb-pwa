# Testing

643 tests across 16 files. The full suite runs in about 7 seconds.

```bash
pnpm test              # run once
pnpm test:watch        # watch mode while developing
pnpm test:coverage     # run with coverage + threshold enforcement
pnpm ci:verify         # everything CI runs: lint → type-check → test + coverage
```

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

## Tests that document a defect

A few tests pin behaviour that is **wrong but current**. They are labelled in
place and exist so the bug cannot change silently. When one of these is fixed,
the test is *supposed* to fail — update it deliberately.

- `useJwtUtils.test.ts` — "KNOWN GAP: a structurally valid token with no `exp`
  is treated as valid forever".

Three bugs the suite surfaced have since been fixed, and the tests that pinned
them are now regression guards:

- `playlists.ts` — `updatePlaylist` spread a reactive Proxy into IndexedDB, so
  every patch without an explicit `songIds` threw `DataCloneError`. That was the
  edit dialog in `PlaylistDetailView`, i.e. renaming a playlist never worked.
- `useOfflineDownload.ts` — a transient IndexedDB failure was cached as a
  permanent "no offline content", disabling offline mode for the tab.
- `gesangbuchlieder.ts` — titles sorted by UTF-16 code unit, putting every
  umlaut behind "Z".

## CI

`.github/workflows/ci.yml` runs on every push to `master` and every pull
request: install → lint → type-check app → type-check tests → test with
coverage → build. The coverage report is uploaded as an artifact.

`pnpm ci:verify` runs the same gate locally.

Note that `lint` and `ci:lint` differ on purpose: `pnpm lint` auto-fixes,
`pnpm ci:lint` only reports, because CI must not mutate the tree.
