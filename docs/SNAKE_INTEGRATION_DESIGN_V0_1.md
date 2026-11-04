# Snake integration design V0.1

Date: 2026-11-04
Status: SOURCE INSPECTED; DESIGN CANDIDATE. Not an implemented protocol, deployed shell, completed isolation claim or production approval.

## 1. Task and authority

Prepare the next bounded Snake migration increment under Migration Standards V1.4 §E1 and Gates 0–8, Supplement V1.1 C01–C08/D01–D06 and stages 2–4, Source Registry V1.6, Homepage V2.1, Sharing V2.1 and Voice Routing V1.1.

Owner direction: preserve gameplay; centralize shared functionality; maintain independent engines; test isolated, runtime and deployed staging paths. The authorized work is audit/design and isolated feature development. No production merge, public path change, Worker/D1 modification, identity or billing work. The previously approved bounded Snake pilot sequencing exception does not imply completion of wider P1 contracts.

Protected behavior: canvas graphics, movement/wrapping, answer mapping, score +10, three lives, missed-word repetition, round acceleration, keyboard/swipe/touch steering and original effects. Existing four mobile food cards versus six desktop cards is an intentional baseline difference, not a new parity failure. Preserve current public student links and return journey.

## 2. Source evidence and divergence

| Component | Source and pinned evidence | Finding |
|---|---|---|
| Central application | Educational-Games commit 481b84ab39f076f0b13192c8c9a26478e92ffb5c; index.html blob 3a576beeaacb18570ee16ba8e210f190be9310e9 | Current documented homepage source. Inline vocabulary catalog, API, registry and speech logic; also contains sentence-family UI. Not an extracted shared gameplay shell. |
| Root vocabulary validator | Same commit, core/vocabulary.js blob 6a11a0901bdff05d039d35906c3e5271b2b99458 | Returned validated object omits promptLanguage. Reusing it would lose non-English prompt metadata. |
| Preserved Snake validator | Word-Snake commit 176b348a165f056bfa5ae1a790b82e5a14259ba4; core/vocabulary.js blob 63cf62f1ac449d7df0825741ffb161da98963e2c | Preserves promptLanguage; legacy omission defaults to en-US. Defaults belong only in the compatibility boundary. |
| Sharing modules | Root core/sharing.js blob 533978db7996d27e218940bee839b3f785db6744; Snake core/sharing.js inspected in baseline | Similar public API operations; import/version differences. Presence of core files is not proof the homepage executes them. |
| Voice modules | Root core/voice.js blob c9fe989322e30fa5bee18fea9c535bb317b7df89; preserved Snake voice source | Reusable browser speech behavior, but homepage has separate inline pronunciation and sentence TEST VOICE paths. Normalize through one service in migrated shell; do not change sentence production incidentally. |
| Built-in catalog | Same central commit, libraries/vocabulary/v2.json blob 101aa6f152c3effb3a3471dd64ecb7cfe0b394c4 | schemaVersion 2; status development-translation-review; concept IDs exist; categories are display strings; English key is en. Content publication and stable category IDs need an explicit central mapping, not eight local lists. Do not label all translations approved. |
| Engine baseline | Word-Snake commit 176b348a165f056bfa5ae1a790b82e5a14259ba4 | Six origin runtime files matched pinned source byte for byte. Recovery branch recovery/snake-migration-baseline-20261104. Public route fetch returned 403 in execution environment; not new end-to-end route certification. |
| Cleanup candidate | Vocabulary-Snake feature/runtime-config-20261103 commit d49d04988694055350c02f30bcdc7a185dd08f11, draft PR #1 | Four deterministic tests and browser geometry/style parity at five sizes × four states passed. Legacy bridge is same-origin and cannot simply be reused for separate Pages origins. |

The main tree also contains copied Core files under matching-columns, word-snake and word-warehouse. Some blob hashes match root while others differ. This audit does not certify those other games or authorize their migration.

## 3. Repository and deployment mapping

| Responsibility | Implementation target | Deployment state |
|---|---|---|
| Central vocabulary shell/runtime, registry, configuration schema, pronunciation, shared contract tests | Educational-Games/platform/ on a new isolated feature branch based on a freshly verified source SHA | Proposed source path. No existing platform deployment is claimed. Preserve root index.html until accepted replacement is separately authorized. |
| Existing vocabulary catalog | Educational-Games/libraries/vocabulary/v2.json plus central publication/category adapter | Existing source; editorial status retained. New publish policy does not silently approve candidate translations. |
| Snake engine and thin adapter | Vocabulary-Snake/engine/ and snake-game.html on existing feature branch | CODE COMMITTED for cleanup only. No central dependencies copied here. |
| Shell staging | One dedicated isolated shell build from central repository | Exact Pages project/origin and build source must be verified/established before integration deployment. No guessed production alias. |
| Engine staging | bt-vocabulary-snake-preview; immutable feature deployment URL resolved from actual deployment evidence | Setup mapped to develop historically; feature URL/SHA and headers must be verified before loading. Never infer that base preview hostname serves feature HEAD. |
| Existing production | boringteacher.com root and /word-snake/ with current origin routing | Unchanged. /vocabulary-snake/ is not activated. |
| Shared vocabulary staging API/store | One family-level isolated service/store, reused by migrated vocabulary engines | Endpoint/store isolation not established by this audit. No per-game API/database. Sharing remains unavailable until verified. |

Keep a single source for shared UI rather than importing a mutable latest script into every engine. Independent shell releases use an engine compatibility manifest; engine releases do not require copying menu code.

## 4. Candidate engine protocol bt-vocabulary-engine/1

Transport candidate: isolated iframe with exact configured origins. It retains style isolation and independent engine delivery. Selection remains conditional on focus, phone gesture/audio, touch, viewport and fullscreen proof. If that proof fails, record an ADR for another boundary; do not force the iframe into production.

Envelope after handshake:

```json
{
  "protocol": "bt-vocabulary-engine/1",
  "engineId": "vocabulary-snake",
  "sessionId": "shell-generated-opaque-session",
  "requestId": "1",
  "type": "INIT",
  "payload": {}
}
```

sessionId correlates lifecycle messages; it is not authentication. requestId is a monotonically increasing positive decimal string (up to 15 digits) correlating commands/acknowledgements. Responses for the latest 128 IDs are cached; older IDs are rejected as stale without replaying an action. Engine READY is accepted only from the configured iframe window and exact engine origin, with matching engine ID, protocol and expected build ID. Shell then binds a new session. Engine checks exact approved shell origin and parent window before accepting INIT. Bootstrap origin policy is supplied by trusted build/deployment configuration, never arbitrary query/set content. Missing policy does not announce or accept a usable session.

All messages validate shape, direction, type and current session. No wildcard origins. Reject incompatible versions, stale sessions, spoofed windows, unknown commands and oversized/malformed payloads with bounded errors. Never echo content/credentials into error logs. Disposal stops accepting further session commands. Repeated command IDs return the prior bounded acknowledgement without rerunning effects; duplicate INIT cannot create a second loop. Request tracking is bounded for the active session and cleared at disposal.

| Direction | Message | Payload and required effect |
|---|---|---|
| Engine → shell | READY | engineId, protocol, exact buildId and capabilities; engine not playing yet |
| Shell → engine | INIT | Validated vocabulary snapshot, session settings, viewport; initialize without advancing simulation |
| Engine → shell | INITIALIZED / ERROR | Ack requestId; full initialization success or stable error code |
| Shell → engine | START | Start exactly once after explicit launch intent; focus engine; ack actual running state |
| Shell → engine | PAUSE / RESUME | Idempotent desired state. Resume only after intentional user action; no toggle semantics |
| Shell → engine | RESTART | Same immutable snapshot and direction; reset overlays, controls, timers, score/lives and one loop; retain sound preference |
| Shell → engine | SET_SOUND | Explicit boolean, never a toggle; engine effects follow state; shell cancels speech on mute |
| Shell → engine | VIEWPORT | CSS width/height, pixel ratio; preserve logical state and set; acknowledge safe pause if necessary |
| Engine → shell | SPEAK | Validated answer text; target locale is taken from bound snapshot by shell, not caller override |
| Engine → shell | STATE | Bounded running/paused/ended status, score/lives/round/progress; no per-frame telemetry |
| Engine → shell | REQUEST_MENU | Shell disposes engine and returns to same-set student launcher or preserved creator context |
| Shell → engine | DISPOSE | Stop RAF, timers, input/listeners, effects; shell cancels speech and removes frame; idempotent |
| Engine → shell | ACK / ERROR | Correlates requestId and actual state; never claim success before operation finishes |

Candidate engine handshake/start timeout: 12 seconds, independent of sharing timeout. Timeout invalidates that session, disposes the frame and shows retry; late READY/ACK cannot revive play. Retry creates a new session/frame. Restart never creates a share or reloads a changed catalog.

## 5. Typed set and settings contract

INIT content is vocabulary/1 only: title, promptLanguage, language (target), pairs of exactly two nonempty strings [prompt,target], optional public share ID and catalog/snapshot provenance. Require at least five pairs for Snake. Preserve accents, Unicode, order and content. Validate both locales against six supported canonical locales and require different prompt/target locales. Never translate, reverse or coerce malformed pairs implicitly.

Legacy public response without promptLanguage is normalized to en-US by the central compatibility adapter, matching current behavior; new internal messages require explicit metadata. Catalog en maps to en-US at that boundary. Sentence hashes/payloads never enter this adapter. Validate API responses before mounting the engine and validate again at INIT. Final bounded string/count/message limits must be based on the actual existing API constraints before protocol freeze; they are not invented by this design.

| Setting | Owner / precedence | Restart and refresh |
|---|---|---|
| Vocabulary/title/direction | Published snapshot or current explicit creator selection | Frozen during play; restart retains it; shared-link refresh reloads same snapshot |
| Sound | Explicit launch context, then browser preference, then existing default ON | Retained on restart; browser preference may persist; never modifies content locale |
| Pronunciation locale | Snapshot target locale | Cannot be overridden by a stale browser voice preference |
| Voice selection | One shell voice service, exact locale then base language; attempt native speech even if no enumerated match | TEST VOICE and answer speech share the service; delayed voice list handled centrally |
| Movement, scoring, difficulty | Engine baseline | No new user settings or mechanics changes in this increment |
| Fullscreen/viewport | Shell UI and engine resize adapter | Optional enhancement; denial keeps game usable; no session reset |

Cancel queued speech on mute, restart, pause/background, disposal, navigation and engine replacement. Preserve game-specific oscillator effects in engine. An API call or cross-frame event does not establish audible success. No cloud speech provider is added.

## 6. Runtime/environment contract

One central validated configuration supplies schemaVersion, environment (staging or production), configRevision, registryRevision, shellOrigin, catalog URL/revision policy, student launcher location, sharing timeout and allowed service/engine origins. Registry entries supply engineId, family, protocol, minimum pairs, exact immutable engine URL/build ID and capabilities.

Configuration is delivered by trusted build/deployment setup and checked against deployment policy. A URL parameter cannot select production mode or arbitrary endpoints. Validate full URL scheme, origin and permitted path, including redirects. Freeze config, registry, selected data and engine artifact for each session. Catalog updates affect future selection only. Published links resolve snapshots, not current category contents.

Missing config, unknown environment, missing engine origin/build, incompatible registry or a staging entry referencing production services stops initialization before catalog/API/frame requests. Show a recoverable configuration error; no fallback URL. Development fixture mode is explicit and test-only. If sharing is disabled in a valid test configuration, label it unavailable; never report a mock publish as a real link.

| Environment | Services | Rules |
|---|---|---|
| Local tests | Explicit local fixtures and mock API | External network denied; same engine/adapter; no real share writes |
| Staging | Verified isolated vocabulary API and store, central staging catalog/shell, immutable engine preview | Production origins denied; no production credentials/bindings; unknown mapping blocks deployment acceptance |
| Production | Existing approved API/catalog and exact accepted shell/engine combination | Promotion requires separate exact-destination approval and rollback evidence |

Engine has no service endpoints, fetch client, database access, speech provider or return-URL resolver. Release headers restrict connect-src to none and other asset channels to the explicit engine allowlist; external script/image/media/form/navigation channels must be audited too. Shell policy permits only the environment's required catalog/API/frame resources. CSP is defense in depth, not backend authorization.

Client tests record attempted requests, fail on any production destination and block unintended redirects. Separately inspect production server authorization/abuse controls: public APIs may still accept requests made manually by preview visitors. Empty bindings and CORS do not prevent that. Use local replicas/mocks for write-denial checks; no experimental production POSTs. Do not change production access policy as an incidental migration action.

## 7. Lifecycle and central UI ownership

Shell renders one common action bar and owns loading/errors, preference state, focus transfer, navigation and pronunciation. Engine retains canvas/HUD, answer/prompt artwork and directional touch controls. Existing action buttons are removed only when equivalent shell commands and hierarchy are proven; no duplicate bars in accepted integration. Title → actions → prompt/HUD → board → steering must retain the approved hierarchy.

Shell and engine each handle their own focus/visibility loss safely. Blur/background pauses once, clears held inputs and cancels speech; return stays visibly paused until explicit resume. Transfer focus into engine after START/RESUME/RESTART; shell buttons remain keyboard accessible. Do not intercept editor typing or globally disable scrolling. Swipes/buttons/keyboard call the same engine actions. Rotation/fullscreen preserves score/lives/selected data and logical state.

Known baseline defects are separate test-backed corrections: stale pause overlay after restart; possible overlapping frames after quick pause/resume; malformed-pair boundary; missing background-pause policy. Food relocation during resize is existing behavior requiring separate parity review. Fixing lifecycle defects must not change collision/scoring/speed rules unnoticed.

## 8. Implementation increments and exit evidence

1. Central contract/configuration validators and tests on isolated central feature branch. Reconcile promptLanguage explicitly. Create no production writes or UI replacement. Exit: missing/invalid configuration produces zero external requests; schema/direction cases pass.
2. Thin Snake lifecycle adapter with one RAF owner, validated INIT, cleanup and correlated acknowledgements. Exit: repeated starts, rapid pause/resume, restart while paused, stale/malformed messages and background behavior pass; mechanics comparisons still pass except separately documented lifecycle corrections.
3. Fixture launcher uses that exact adapter; no copied editor/voice client. Exit: gameplay and input checks with external network denied. Existing VM tests are baseline evidence, not complete adapter/runtime isolation proof.
4. Central shell pilot integrates same artifact and real central pronunciation with controlled API. Exit: focus, hierarchy, audio gesture, navigation, timeout and protocol rejection pass. Confirm iframe decision or document replacement before full integration.
5. Establish/verify central staging deployment and family-level isolated sharing service under applicable approval gates. Exit: real staging create/edit/publish/fresh guest link/game/return; immutable old snapshots; central category change reaches future selection without engine edit. No unverified production-read exception.
6. Owner device acceptance, clean frozen release candidate, required CI, exact combination review and separate production authorization. Remaining engines follow individually.

## 9. Acceptance ledger and unresolved items

Current evidence: source inspected and cleanup code committed; cleanup automated tests passed. Central shell preview, proposed protocol, complete isolation, integrated journey, physical devices and production approval are NOT COMPLETE.

Required automated tests: no config/no requests; staging rejects production URLs before use; redirect/network escape attempts; missing/malformed/empty sets; minimum pair count and six locales; reversed-direction regressions; unsupported protocol/wrong-origin/window/stale session; repeated starts/disposal; input/RAF/timer cleanup; speech cancel/error/unavailable/delayed voices; sharing timeout/clipboard failure; student views omit private/editor data; same-set return; catalog revision/snapshot behavior; clean output allowlist.

Required device evidence: actual owner/classroom desktop, phone and supported tablet browser/OS versions; portrait/landscape; keyboard/touch; denied fullscreen; background/resume; long/accented text and enlarged text; audible TEST VOICE/answers/effects/mute. Existing viewport tests are emulation only. Exact physical device matrix and baseline performance budgets remain pending owner/device evidence, not assumed all-browser coverage.

Each run records date, shell SHA, engine SHA/build, protocol/config/registry revisions, URL, dataset/locales, mocked versus actual services, viewport/device/browser and expected/observed result. One passing check cannot stand for another stage.

Release build explicitly copies approved assets to dist; tests, references, fixtures, docs and development launcher are excluded. Reconfigure Pages output only after review/verification; present root output is not final packaging. CI merge checks do not automatically gate Cloudflare previews.

Rollback ledger pins shell build, engine build, registry/config revisions, service compatibility and original routing. Until an integrated combination is accepted, fallback is the unchanged public homepage/Word-Snake release, not a speculative central shell. Source Registry remains unchanged because no new production mapping is verified.

Open before freeze: trusted shell deployment origin; actual staging service/store evidence; supported-device list and performance measurements; API-derived content limits; iframe gesture/focus proof; catalog publication/category-ID mapping. Accounts, private library and billing remain deferred. These do not justify rewriting current production or silently claiming full P1 approval.

## Implementation increment — 2026-11-04

Central validators and public-sharing wrapper are implemented on Educational-Games feature/central-runtime-config-20261104, without production entry imports or deployment config. Snake has a candidate explicit session adapter in engine/session.mjs. The existing compatibility entry remains for baseline comparisons; session attachment requires a trusted deployment bootstrap. Test bootstraps are injected by the browser test and never shipped as configuration.

Lifecycle corrections are separately identified: restart clears pause UI; pause/resume owns one pending frame; invalid pairs are rejected before state mutation; blur/hidden pauses; disposal removes owned listeners/timers/audio. Mechanics parity remains covered. No centralized shell UI, real staging sharing/store, CSP packaging or physical-device acceptance is claimed.
