# OKR Goals Book

A small, real OKR / goals-tracking room tab for [PrivOS](https://privos.ai), built as an
**INSTANT** MCP app — a reference example for developers.

## What "INSTANT" means

An INSTANT app has **no runtime container**. There is no server, no Docker image, nothing
listening on a port. What you build is a static UI bundle (`privos-app bundle-ui`) that the
PrivOS Hub serves straight from MinIO to every user who opens the room tab. All application
data lives in **PrivOS Lists**, reached from the browser through the PrivOS app bridge
(`@privos_ai/app-react`) — the same sandboxed `postMessage` bridge every MCP app UI uses, just
without a backend on the other end of any of its own tool calls.

Practical consequences of that shape:

- `privos-app.json` sets `"executionMode": "INSTANT"` and may declare `ui.entryPoints` but
  never `tools`, `serverUrl`, `port`, `resources`, `volumes`, or `stateless` — there is no
  runtime for any of those to configure.
- The shell (`dist/index.html` → bundled `shell.html`) is `ui.shellMode: "static"` (the
  default, and the only mode INSTANT is allowed): it is rendered once at build time and served
  byte-identical to every user. It must never contain per-user data — user/room context arrives
  live over the bridge instead (`usePrivosContext`).
- No external network calls, no CDN assets: everything the UI needs ships inside the bundle, so
  it works under the Hub's CSP for a sandboxed app iframe.

## Data model — three PrivOS Lists

The app owns three lists per room (see `src/ui/okr/schema.ts`), found by a stable `key` and
created automatically the first time the room tab loads if they don't exist yet
(`src/ui/okr/use-okr-data.ts`'s `ensureList`):

### `OKR Objectives` (`key: okr_objectives`)

| Field | Type | Notes |
|---|---|---|
| `name` (built-in) | — | Objective title |
| `description` (built-in) | — | Optional description |
| `owner` | TEXT | Free-text owner name |
| `period` | TEXT | `YYYY-Q1`..`YYYY-Q4`, e.g. `2026-Q3` |
| `status` | SELECT | `not_started` \| `in_progress` \| `at_risk` \| `off_track` \| `done` |

### `OKR Key Results` (`key: okr_key_results`)

| Field | Type | Notes |
|---|---|---|
| `name` (built-in) | — | Key result title |
| `objectiveId` | TEXT | Parent objective's item `_id` (this app's own foreign key — not the Lists API's built-in `parentId`/sub-item relation) |
| `kind` | SELECT | `metric` (measurable) \| `milestone` (checkbox) |
| `unit` | TEXT | e.g. `%`, `users`, `$k` (metric only) |
| `startValue` | NUMBER | Metric: starting value. Milestone: always `0`. |
| `targetValue` | NUMBER | Metric: target value. Milestone: always `1`. |
| `currentValue` | NUMBER | Metric: current value. Milestone: `0` or `1`. |
| `confidence` | SELECT | `on_track` \| `at_risk` \| `off_track` — set by the latest check-in |

A milestone is deliberately modeled as a metric with a fixed `0..1` range, so progress math
(`src/ui/okr/progress.ts`) is one formula for both kinds: `(current - start) / (target - start)`,
clamped to `[0, 1]`.

### `OKR Check-ins` (`key: okr_checkins`)

| Field | Type | Notes |
|---|---|---|
| `description` (built-in) | — | The check-in note |
| `keyResultId` | TEXT | The key result's item `_id` |
| `value` | NUMBER | The current value recorded at this check-in |
| `confidence` | SELECT | Same three-value enum as above |
| `author` | TEXT | Display name recorded at check-in time |

Recording a check-in is a single write: one `OKR Check-ins` item (`recordCheckIn` in
`use-okr-data.ts`). The board takes each key result's current value and confidence from its
latest check-in (`applyLatestCheckIns` in `list-mapping.ts`), so there is no second write that
could leave the key result and its history out of step. A key result's own `currentValue` and
`confidence` are only the values it was created with.

Lists are read completely with `privos.lists.queryItems`, following its keyset cursor until it
returns none, so large boards and long check-in histories are never cut off at one page.

**Known race, by design:** two tabs opening a brand-new room at the same instant can each find
the lists missing and each create one (`ensureList`'s "find-or-create" is not atomic — the Lists
API has no idempotent "create if absent" tool to build it on). The book converges on the oldest
list per `key` (`pickCanonical`), so this is a benign duplicate, not data loss. Upgrade path: a
server-side idempotent list-provisioning tool, if this is ever hit in practice.

## Permissions (least privilege)

| Scope | Requirement | Why |
|---|---|---|
| `basic:information` | required | Read the current room id so the board loads the right room's lists |
| `lists:read` | required | Read the three OKR lists to render the board |
| `lists:query` | required | Page through every item of the three lists with `privos.lists.queryItems` |
| `lists:write` | optional (recommended) | Create the lists on first use, and create/update objectives, key results, and check-ins. Declines gracefully to a read-only board (`canWrite` in `use-okr-data.ts`) instead of failing every click. |

No `users:read`, no `files:*`, no sandbox/db scopes — the app never needs them.

## UI

- **Room tab** (`ui.entryPoints.roomTab`) — the primary surface.
- **Standalone** (`ui.entryPoints.standalone`) — the same `dashboard.html` shell, reused as a
  second entry point. Free to declare since INSTANT ships one static bundle regardless of how
  many entry points point at it.
- Views: an overview board grouped by period with progress bars and at-risk highlighting, an
  objective detail view (key results, check-in, per-key-result history), a check-in form, and
  owner/status filters on the board.
- Accessible: every control has a real `<label>`, progress bars use `role="progressbar"` with
  numeric `aria-value*` (never color alone), forms report errors via `role="alert"`, focus is
  visible (`:focus-visible`), and the layout is a responsive CSS grid.
- Themed via the Hub's `--base-*` CSS custom properties (light/dark), with standalone-safe
  fallback values — see `src/ui/okr/okr.css`.

## Publishing to the PrivOS marketplace

The app depends only on published packages (`@privos_ai/app-server` `^0.12.0`,
`@privos_ai/app-react` `^0.6.0`), so a plain `npm install` works.

1. `npm run typecheck && npm test && npm run build && npm run manifest:lint:publish`
2. Commit everything — `privos-app publish` packages the committed tree (`git archive`).
3. `npm run publish:marketplace` — prints a device code and an approval URL on
   client.privos.io; approve it while signed in as the listing owner.
4. The Portal runs preflight → scan → AI review → `READY_FOR_REVIEW`; after a marketplace
   admin approves, the build node runs `ui-build` (`privos-app bundle-ui`) and the version
   becomes `PUBLISHED` with a signed ui-bundle. Installing it never starts a runtime: the Hub
   loads the bundle into MinIO and serves the UI from there.

## Commands

```bash
npm install --include=dev      # NODE_ENV=test npm install --include=dev if your shell exports NODE_ENV=production
npm run typecheck              # tsc --noEmit
npm test                       # vitest run — pure-function and component tests
npm run build                  # vite build → dist/
npm run manifest:lint          # privos-app lint privos-app.json
npm run manifest:lint:publish  # + INSTANT/shell-mode/bundle-shape checks (privos-app lint --publish)
npm run bundle:ui              # privos-app bundle-ui --dist dist --out ui-bundle.tar
npm run screenshot             # esbuild-bundles the real UI + playwright (chromium, channel 'chrome')
                                # renders it against a mocked bridge and saves a PNG
```

This app was built and verified **locally only** — it has not been published to npm, to GitHub,
or to the PrivOS marketplace.

## License

MIT — see [LICENSE](LICENSE).
