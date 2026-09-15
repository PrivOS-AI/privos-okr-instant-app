# Adding INSTANT to the manifest

A practical guide to declaring `executionMode: "INSTANT"` in `privos-app.json`,
using this app's own manifest as the worked example. For the platform-level
contract (what the lint actually enforces, why each rule exists), see
privos-dev-docs:
[mcp-app-platform/instant-apps.md](https://github.com/PrivOS-AI/privos-dev-docs/blob/main/mcp-app-platform/instant-apps.md).

## This app's manifest, annotated

```jsonc
{
  "schemaVersion": 3,
  "kind": "mcp-app",
  "name": "ai.privos.okr-instant-app",       // resourceUri below must be namespaced under this
  "executionMode": "INSTANT",                // no tools, no server, no Dockerfile from here on

  "permissions": [
    // "requirement": "required" — the app is useless without it (read the board).
    // "requirement": "optional" — declared with "degradedBehavior" so a user who
    // declines it still gets a coherent app, just a read-only one.
    { "scope": "basic:information", "requirement": "required", "context": "room",
      "executionContext": "user", "feature": "core.context",
      "reason": "Identify the active room so the goals book loads and saves the right room's OKR lists." },
    { "scope": "lists:read", "requirement": "required", "context": "room",
      "executionContext": "user", "feature": "okr.records.read",
      "reason": "Read this room's Objectives, Key Results, and Check-ins lists to render the progress board." },
    { "scope": "lists:query", "requirement": "required", "context": "room",
      "executionContext": "user", "feature": "okr.records.query",
      "reason": "Page through every item of the three OKR lists, so large boards and long check-in histories load completely." },
    { "scope": "lists:write", "requirement": "optional", "context": "room",
      "executionContext": "user", "feature": "okr.records.manage",
      "reason": "Create the three OKR lists on first use, and create/update objectives, key results, and check-ins from the board.",
      "recommended": true,
      "degradedBehavior": "The board is read-only: existing objectives and key results are still visible, but nothing can be created, checked in, or updated." }
  ],

  "ui": {
    "entryPoints": {
      // roomTab is required. Reuse the same resourceUri for a second slot
      // (standalone here) — INSTANT ships one static bundle regardless of
      // how many entry points reference it.
      "roomTab":     { "title": "OKR Goals Book", "resourceUri": "ui://ai.privos.okr-instant-app/dashboard.html" },
      "standalone":  { "title": "OKR Goals Book", "resourceUri": "ui://ai.privos.okr-instant-app/dashboard.html" }
    }
  },

  "agent": {
    // purpose is required (≤2000 chars); personality/instructions/knowledge/hubTools optional.
    "purpose": "Help the user understand and update the room's OKRs: summarize objective progress, point out at-risk key results, and explain how to record a check-in.",
    "personality": "Encouraging and concise, like a supportive goal-tracking coach.",
    "knowledge": [
      "An objective's progress is the average of its key results' progress.",
      "A key result is either a measurable metric (start/target/current value) or a checkbox milestone."
    ],
    "hubTools": []          // narrowed further by the Hub's bot permission catalog at install time
  }
}
```

Fields you will **not** find here, because INSTANT forbids them: `tools`,
`serverUrl`, `runtimeTrustProvisioningUrl`, `port`, `resources`, `volumes`,
`stateless`. There is also no `Dockerfile` in this repo — none is ever built
for a frontend-only app.

## Turning a scaffolded or existing app into INSTANT

Starting from the `instant` scaffold template is the fast path:

```bash
npx create-privos-mcp-app my-app --template instant
```

Converting an **existing** runtime app instead:

1. Delete `tools`, `serverUrl`, `runtimeTrustProvisioningUrl`, `port`,
   `resources`, `volumes`, `stateless` from `privos-app.json` — the lint
   rejects every one of them once `executionMode` is set.
2. Add `"executionMode": "INSTANT"`.
3. Move each UI surface your tools used to declare under
   `_meta.ui.resourceUri` into `ui.entryPoints` instead — `roomTab` is
   required; `sidebar` and `standalone` are optional. Every `resourceUri`
   must match `ui://<manifest name>/<file>.html`.
4. Delete any server code and the `Dockerfile` — neither runs anymore. Keep
   only the UI build (`src/ui/`, your bundler config).
5. Re-point any server-side data access at PrivOS Lists instead: replace
   direct backend calls with `lists:read` / `lists:query` / `lists:write`
   permission declarations and the `useLists` hook
   (`@privos_ai/app-react`) from the browser. See this app's
   `src/ui/okr/use-okr-data.ts` for a worked three-list example (schema,
   find-or-create on first load, and the documented benign race that comes
   with a non-atomic find-or-create).
6. If you kept an `agent` section, check it against the size caps below —
   a breach is a lint error here, not a silent truncation at install time.

### Agent section caps

| Field | Cap |
|---|---|
| `purpose` (required) | 2000 characters |
| `personality` | 2000 characters |
| `instructions` | 5000 characters |
| `knowledge` | 20 items, 500 characters each |
| `hubTools` | non-empty strings; the Hub narrows this further at install time against the workspace's bot permission catalog |

## Validate

```bash
npm run typecheck              # tsc --noEmit
npm test                       # vitest run
npm run build                  # vite build → dist/
npm run manifest:lint          # privos-app lint privos-app.json
npm run manifest:lint:publish  # privos-app lint privos-app.json --publish — INSTANT + shell-mode + bundle-shape checks
npm run bundle:ui              # privos-app bundle-ui --dist dist --out ui-bundle.tar — inspect the tar locally
npx privos-app publish --dry-run   # packages + lints the real publish path — run this before publishing
```

**Run `publish --dry-run` even after a clean `manifest:lint:publish`.** The
plain lint has been seen to pass a manifest that the real publish path
rejects (duplicate permission `feature` ids) — the dry-run is the closer
mirror of what the Portal will actually do with your archive.

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `ui.entryPoints is required for executionMode: "INSTANT"` | No `ui.entryPoints` object | Add at least `roomTab` |
| `ui.entryPoints.roomTab is required for executionMode: "INSTANT"` | `entryPoints` present but no `roomTab` key | Add a `roomTab` entry |
| `ui.entryPoints.<slot>.resourceUri must match "ui://<appId>/<file>.html"` | Malformed URI, or wrong scheme | Use `ui://<manifest name>/<file>.html` exactly |
| `ui.entryPoints.<slot>.resourceUri must be namespaced under this manifest's "name"` | The `ui://` host doesn't equal `privos-app.json`'s `name` | Match the host segment to `name` |
| `<field> is forbidden for executionMode: "INSTANT"` | A runtime-only field (`tools`, `serverUrl`, `port`, …) is still present | Delete it |
| `agent.purpose exceeds the maximum length of 2000 characters` (or similar) | An agent field is over its cap | Shorten it — this is enforced at lint time so it never gets silently truncated at install |
| `Dockerfile is present alongside executionMode: "INSTANT"` (warning, not an error) | A leftover `Dockerfile` from before conversion | Safe to delete; it's ignored either way |
| Manifest passes `lint --publish` but `publish`/`publish --dry-run` rejects it (e.g. duplicate permission `feature` ids) | The two checks don't cover identical ground | Always run `publish --dry-run` before a real publish |
| Submission rejected against a listing set to `PRIVOS_MANAGED_RUNTIME` | New marketplace listings default to that mode; Creator Studio has no execution-mode editor yet | Ask a marketplace admin to set the listing's `supportedExecutionModes` to include `INSTANT` |
