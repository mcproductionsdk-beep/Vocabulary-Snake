# First engine cleanup — review candidate

This is the first isolated migration increment, not a completed migration or release.

## Scope

- Extract the existing game script, compatibility bridge and styles into separate files.
- Remove obsolete teacher/student menu CSS for elements absent from this engine.
- Use one initial-snake factory for start and collision reset, preserving separate invincibility behavior.
- Preserve mechanics, draw code, mobile/desktop food counts and existing action controls.
- Keep the legacy same-origin bridge temporarily. Replace it only after the central shell's versioned adapter contract is proven.
- Do not copy the old launcher, API client, catalog or voice implementation into this repository.

## Validation

`node --test tests/engine.test.mjs tests/session.test.mjs` compares deterministic baseline and candidate states and checks gameplay outcomes. Test-only observation is injected into in-memory scripts; no engine debug API is shipped.

`node tests/browser-parity.mjs` compares computed styles and geometry against the pinned baseline at five viewport sizes and four UI states. This requires a real browser; it does not certify physical touch or audible speech.

`node tests/browser-lifecycle.mjs` exercises the actual engine and session adapter across two local origins, with all external destinations blocked.

The existing required migration-safety check must remain failing while the root launcher and full release tests are absent. The separate cleanup check proves only this increment. Do not weaken branch protection to merge this candidate.

## Findings and lifecycle increment

- Restart during pause leaves the pause overlay and label stale in the baseline.
- Rapid pause/resume may schedule overlapping animation frames.
- Malformed pair entries are not fully validated at the engine boundary.
- Background/visibility lifecycle needs an explicit approved policy.
- Resizing currently relocates food; review separately before changing this behavior.
- Existing action buttons are temporary until the central shell owns their presentation.

The 2026-11-04 lifecycle increment addresses paused restart, duplicate pending frames, malformed pairs and background pausing with explicit tests. Disposal now clears owned input listeners, timers, sound and compatibility bridge. Resizing/food relocation remains unchanged. The common action UI remains temporary until shell integration.

engine/session.mjs is a candidate versioned session adapter; it is attached only by an explicit trusted bootstrap. No production policy/default is bundled. The browser test injects that bootstrap and uses a different localhost origin, labeled test-only. The central shell pilot is implemented in Educational-Games draft PR #3 and tested with controlled services. No deployed shared-shell application or audible-speech acceptance is claimed.

## Remaining acceptance gates

Central fail-closed configuration and versioned shell/engine integration; missing-config and no-production-network tests; integrated vocabulary, snapshot sharing and pronunciation; actual mobile/desktop device evidence; approved release artifact allowlist and full rollback; owner approval before production promotion. No production changes are made by this increment.
