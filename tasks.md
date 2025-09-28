tasks.md — Telugu TTS Chrome Extension with Smart Word Tracking

Legend
- [AI] tasks are suitable for code-generation/automation.
- [Human] tasks need human judgment, UX, or manual testing.
- [AI/Human] can be done by either.

Pre-flight
- [x] Install prerequisites
  - Chrome 119+ (or latest stable).
  - Node 18+ and npm 9+.
  - Stable internet for one-time 41 MB model download (optional Pro voice).
  - ≥60 MB free disk space for cached models (WASM Pro voice).
- [x] Create repo and baseline configs
  - Initialize git repo and push to GitHub.
  - Add LICENSE (MIT or Apache-2.0).
  - Add .editorconfig and .prettierrc with printWidth 80.
  - Add .gitignore (node_modules, dist, .DS_Store, etc.).
- [x] Create top-level structure
  - /src-vanilla
  - /scripts (for CI, size checks, test harness)
  - /src-vanilla/models (downloaded on first use; keep empty .keep)
  - /src-vanilla/wasm (runtime; keep empty .keep)
  - README.md, prd.md, Architecture.md, tasks.md

Directory scaffold (src-vanilla)
- [x]
  - manifest.json
  - popup.html, popup.ts
  - content.ts
  - sw.ts
  - offscreen.html, offscreen.ts
  - workers/textRefinement.worker.ts
  - lib/cleanup.ts, lib/tokenize.ts, lib/highlight.ts, lib/storage.ts
  - g2pTelugu.ts, encodeWav.ts, align.ts
  - wasm/onnx-runtime.wasm (fetched on first use or bundled for dev)
  - models/ (downloaded: te_vits_quant.onnx, te_hifigan_quant.onnx)
  - styles.css

Milestones overview
- M0: Skeleton extension + selection capture + basic UI wiring.
- M1: Regex cleaner + Web Speech playback + highlight (word/sentence fallback).
- M2: WASM Pro voice (ONNX in offscreen) + WebAudio + timestamp-based highlighting.
- M3: UX polish, accessibility, caching, onboarding, resilience.
- M4: Test suite, acceptance runs, packaging, CI, docs.

M0 — Skeleton and wiring (Week 1)
1) Bootstrapping repo and scripts
- [AI] Add npm scripts
  - dev:vanilla — copy/link src-vanilla for Load unpacked.
  - models:fetch — download/copy ONNX models to src-vanilla/models (dev only).
  - zip — produce release zip and print size.
- [AI] Add simple size check script (scripts/check-size.mjs) to fail if >120 KB.

2) MV3 manifest and basic files
- [AI] Create minimal MV3 manifest with:
  - permissions: storage, activeTab, offscreen, unlimitedStorage
  - host_permissions: (none by default; ask at runtime if downloading from a host)
  - background: { service_worker: "sw.js", type: "module" }
  - content_scripts: content.js on <all_urls>, run_at: document_idle
  - web_accessible_resources: ["offscreen.html", "styles.css", "wasm/onnx-runtime.wasm"]
- [AI] Create empty popup.html with basic controls:
  - Play, Pause, Stop
  - Engine: Browser | Local
  - Rate (range), Pitch (range)
  - Voice (select), Cleanup toggle
  - Queue list, Progress text
- [AI] Create styles.css (tiny, local; no external CDN).

3) Messaging and storage scaffolding
- [AI] Implement chrome.storage.local preferences
  - engine, voice, rate, pitch, cleanup
  - helper lib/storage.ts with get/set wrappers.
- [AI] Define message contracts in a shared types file (or inline in sw.ts):
  - ReadRequest, ControlMessage, ProgressMessage, HighlightTick (per PRD).
- [AI] Implement popup.ts → SW messaging
  - send ReadRequest on Play.
  - send ControlMessage on Pause/Resume/Stop.
  - load/save preferences on UI change.

4) Content script basics
- [AI] Implement selection extraction
  - getSelection() string or best-effort main content fallback stub.
- [AI] Add overlay scaffold
  - Hidden by default; toggled when reading starts.
  - Container + tokens area; no highlight logic yet.
- [AI] Listen for read/highlight messages and log for now.

5) Service worker orchestration scaffold
- [AI] Add message router
  - on read/start: validate, save queue item, call ensureOffscreen().
  - on read/control: forward to offscreen.
- [AI] Implement ensureOffscreen()
  - chrome.offscreen.hasDocument? then createDocument with AUDIO_PLAYBACK.

6) Offscreen page scaffold
- [AI] offscreen.html minimal document; offscreen.ts
  - Receive commands from SW.
  - Stub engine adapters (WebSpeechAdapter, WasmTTSAdapter).
  - For now, just acknowledge and send dummy progress ticks.

7) Manual smoke test
- [Human] Load unpacked via chrome://extensions → src-vanilla
- [Human] Verify:
  - Popup opens in ≤150 ms.
  - Play/Pause/Stop send messages (check chrome://extensions logs).
  - Offscreen document gets created on first Play.

M1 — Cleanup + Web Speech + highlighting (Week 2)
1) TextRefinementWorker and cleanup
- [AI] Implement workers/textRefinement.worker.ts
  - onmessage({ id, text }) → cleanTelugu(text) → postMessage({ id, cleaned }).
- [AI] Implement lib/cleanup.ts using PRD's regex rules.
- [Human] Verify cleanup acceptance on sample paragraphs (see Acceptance M4).

2) Tokenization and char mapping
- [AI] Implement lib/tokenize.ts
  - tokenize(text): returns tokens with { text, startChar, endChar }.
  - For safe Telugu mapping, use Intl.Segmenter('te', { granularity: 'grapheme' })
    for grapheme iteration, but tokens split by whitespace/punctuation.
- [AI] Implement sentence split
  - naive split by punctuation marks (., ?, !, Telugu danda etc.); keep indices.

3) Web Speech path (offscreen)
- [AI] Implement EngineAdapter interface in offscreen.ts.
- [AI] Implement WebSpeechAdapter
  - init(): cache voices; resolve once voicesavailable has fired.
  - voices(): enumerate te-* voices; return id/name/lang.
  - play(text, opts): create SpeechSynthesisUtterance
    - set voice/rate/pitch
    - onboundary: map e.charIndex to token index
      - precomputed token map must be passed along with text from SW
    - onend: send { type: "read/progress", state: "idle" }
  - pause/resume/stop: forward to speechSynthesis.
- [AI/Human] Decide messaging payload
  - SW → Offscreen: { text, tokens, sentences, opts } for webspeech engine.
  - Offscreen → Content: { type: "read/highlight", wordIndex?, sentenceIndex?, timeSec }.

4) Content overlay UI
- [AI] Render tokens into spans with data-index.
- [AI] Highlight logic
  - on read/highlight with wordIndex: add .is-active to that token; remove from previous.
  - sentence fallback mode: highlight sentence span.
- [AI] Basic styling for readability and accessibility (high contrast, large fonts).
- [Human] Confirm overlay is unobtrusive and draggable.

5) SW orchestration for Web Speech
- [AI] On read/start:
  - capture selection/article via content script message.
  - send to TextRefinementWorker; get cleaned text.
  - generate tokens and sentence map or request offscreen to do so consistently.
  - ensureOffscreen(); send play command with text + token map + options.
  - set state: preparing → generating → playing; forward progress to popup.
- [AI] On control:
  - forward to offscreen; update state.

6) Reliability and fallback
- [AI] If no onboundary events within first 3 seconds:
  - switch to sentence-level highlighting.
- [AI] If no te-* voice found:
  - use default voice; notify popup: "Using default voice."

7) Acceptance checks (M1)
- [Human] Cleanup removes cited artifacts per PRD acceptance.
- [Human] Web Speech playback works for typical Telugu text.
- [Human] Word highlight activates; sentence fallback works when boundary fails.

M2 — WASM Pro voice and timestamps (Weeks 3–4)
1) WASM/ONNX pipeline setup
 - [AI] Offscreen WasmTTSAdapter with ONNX Runtime Web (wasm backend).
 - [AI] ModelManager to fetch/cache:
   - models/te_vits_quant.onnx (~28 MB)
   - models/te_hifigan_quant.onnx (~12 MB)
   - wasm/onnx-runtime.wasm (~1.3 MB) if not browser-cached
 - [AI] Cache to IndexedDB/OPFS; require unlimitedStorage in manifest.

2) Inference and audio path
 - [AI] g2pTelugu.ts → phonemes; VITS → mel; HiFi-GAN → PCM.
 - [AI] encodeWav.ts to wrap PCM → WAV header for dev debug as needed.
 - [AI] WebAudio: AudioBufferSourceNode for playback; expose duration/currentTime.

3) Word timestamps
 - [AI] align.ts maps phoneme durations → word timestamps.
 - [AI] 60 Hz loop maps currentTime → word index (binary search).
 - [AI] Emit read/highlight ticks; sentence fallback on drift.

4) SW engine routing and caching
 - [AI] Engine preference persisted; fallback to Web Speech on init/error.
 - [AI] Cache cleaned text, token map, and timestamps by hash(text+voice+rate).
 - [AI/Human] Resume: store last position per URL+hash in storage.local.

5) Security/permissions
 - [AI] No network at runtime after one-time model download.
 - [AI] Optional runtime host permission if models fetched from release assets.

6) Acceptance checks (M2)
 - [Human] Pro voice downloads once and works fully offline.
 - [Human] Time-to-first-audio within target for ~250 chars (post-initialization).
 - [Human] Highlight drift ≤ 200 ms median using WASM timestamps.

M3 — UX polish, accessibility, onboarding, resilience (Week 5)
1) UI/UX improvements
- [AI] Popup polish
  - Large play button; rate/pitch sliders; voice dropdown; engine switch.
  - Progress indicator (elapsed/total if available).
- [AI] Overlay
  - Draggable, resizable; dark-mode aware via prefers-color-scheme.
  - Keyboard navigable; ARIA roles; focus-visible states.
- [Human] Validate accessibility (screen reader hints, contrast ratios).

2) Onboarding for Pro voice (WASM)
 - [AI] Detect model presence on popup open.
 - [AI] If absent, show "Upgrade to Pro voice":
   - Explain one-time 41 MB download and offline use.
   - "Download models" button; progress + caching status.
 - [Human] Verify download/resume works across OSes.

3) Error handling and messages
- [AI] Unified error banner in popup + content toast.
- [AI] Common cases:
  - Missing te-IN voice.
  - WASM init/model download failed or unavailable.
  - Playback errors on WebAudio or speechSynthesis.
- [AI] Retry suggestions and fallback toggles.

4) Performance and footprint
- [AI] Trim bundle to ≤120 KB gzip
  - Avoid heavy libs; ensure single tiny CSS file.
  - Consider inlining minimal CSS in popup.html if needed.
- [AI] Optimize worker usage
  - Cleanup ≤ 50 ms for 5k chars.
- [Human] Manual UX snappiness check:
  - Popup open ≤ 150 ms; first paint ≤ 100 ms.

5) Persistence and resume polish
- [AI] Show "Resume last position" in popup when matching URL+hash.
- [AI] Store last word/sentence index and timeSec.

6) Logging and privacy
- [AI] Add optional "Enable local debug logs" toggle.
- [Human] Verify no personal data collection; no external logs.

M4 — Tests, acceptance, packaging, CI, docs (Week 6)
1) Test corpus and scripts
- [AI/Human] Assemble 100 paragraphs (50 Telugu Wikipedia + 50 news).
  - Save in /bench/corpus with metadata (source URL).
- [AI] Add cleanup benchmark script
  - Measure precision/recall removal of artifacts on corpus.
  - Thresholds: precision ≥ 0.9, recall ≥ 0.9, unintended deletions ≤ 2%.
- [AI] Add highlight drift measurement harness
  - For timestamps path: simulate playback time vs stamps; compute median drift.
  - Goal: ≤ 200 ms median.

2) Lifecycle tests
- [Human] Play ~10 min article; background/unload SW; ensure playback continues.
- [Human] Pause/resume multiple times; switch tabs; highlight persists.
- [Human] Stop → state returns to idle cleanly.

3) Packaging and CI
- [AI] GitHub Actions workflows:
  - Lint/format (Prettier).
  - Build zip and run size gate (≤120 KB).
  - Optional: basic extension e2e smoke with Puppeteer+Chrome (load unpacked).
- [AI] Produce release artifact
  - /dist/telugu-tts-ext.zip with src-vanilla compiled JS if needed.
- [Human] Manual verification in fresh Chrome profile.

4) Docs and media
- [AI] Update README:
  - Quick-start, features, safety, privacy, usage, troubleshooting.
- [Human] Add GIFs/screenshots of popup and overlay.
- [AI/Human] models/README.md (or section in README):
  - Pro voice model IDs, sizes, CPU notes, download/cache behavior.

Cross-cutting implementation tasks
Architecture and interfaces
- [AI] Implement EngineAdapter interface in offscreen; two adapters:
  - WebSpeechAdapter
  - WasmTTSAdapter
- [AI] Normalize play/pause/resume/stop across engines.
- [AI/Human] Decide single source of truth for tokenization
  - Option A: SW generates tokens and sends to offscreen and content.
  - Option B: Offscreen generates tokens; send mapping to content.
  - Pick A for determinism and reuse with SW caching.

MV3 lifecycle and reliability
- [AI] Offscreen lifecycle
  - Create on first use, keep persistent until idle for X minutes.
  - Destroy after idle timeout to free resources.
- [AI] State machine in SW
  - idle → preparing → generating → playing → paused → error.
  - Emit ProgressMessage for popup.
- [AI] BroadcastChannel or runtime messaging?
  - Prefer chrome.runtime messaging v1; add BroadcastChannel later if needed.

Tokenization and highlighting
- [AI] lib/tokenize.ts
  - tokens: array of { text, startChar, endChar }
  - sentences: array of { startToken, endToken }
- [AI] lib/highlight.ts
  - Binary search mapping: timeSec → wordIndex using stamps.
  - Fallback: sequential timer by token length and speaking rate.
- [AI/Human] Boundary drift policy
  - If more than 20% words exceed 300 ms drift in initial probe → switch to sentence-level.

Storage and caching
- [AI] chrome.storage.local
  - preferences: engine, voice, rate, pitch, cleanup
  - last position: { url, hash, wordIndex, timeSec }
- [AI] In-memory caches (SW/offscreen)
  - cleaned text, token map, timestamps keyed by hash(text+voice+rate).
- [AI] chrome.storage.session for current queue (ephemeral).

Error handling and recovery
- [AI] Fallbacks
  - Missing onboundary → sentence-level.
  - WASM init/playback error → browser voice.
- [AI] User messaging
  - Non-blocking toasts in content; status in popup.

Security and privacy
- [AI] CSP compliance
  - No eval; no remote scripts/styles; local CSS only.
- [AI] Minimal permissions
  - activeTab, storage, offscreen, unlimitedStorage; no host_permissions by default.
- [Human] Validate no unintended network calls with devtools.

Performance targets
- [AI] Time-to-first-audio instrumentation
  - Measure text submit → first audio event for both engines.
- [AI] Ensure highlight tick loop ≤ 16 ms/frame budget.
- [AI] Keep functions ≤ 15 lines where feasible (guard-rail).

Open questions and decisions
Voice SKU for Pro Mode (≤48 h)
- [Human] Run blind A/B (n ≥ 20) between:
  - te-ai4b-female-28MB vs mms-tts-te-23MB.
- [Human] Collect ratings on naturalness/intelligibility.
- [Human] Decide single default for WASM Pro voice package and document in models/README.md.
- [AI] Update model manifest and voice ID accordingly.

Word-level timestamps reliability
- [AI] Implement sentence fallback trigger.
- [Human] Decide: if timestamps unreliable for v1 corpus, ship sentence-level and log v1.1 alignment work (e.g., aeneas).

Concrete step-by-step task list (chronological)
Day 1–2 (M0)
- [AI] Scaffold src-vanilla structure and manifest.json.
- [AI] Implement popup UI skeleton + storage of preferences.
- [AI] Implement content selection extraction and overlay scaffold.
- [AI] Implement SW message router and ensureOffscreen().
- [Human] Load unpacked; verify messaging and offscreen creation.

Day 3–5 (M1)
- [AI] Implement TextRefinementWorker and cleanTelugu().
- [AI] Implement tokenize() and sentence split.
- [AI] Implement WebSpeechAdapter with boundary mapping.
- [AI] Wire SW → Offscreen play flow with token map.
- [AI] Implement content overlay highlight on ticks.
- [Human] Validate cleanup accuracy on 10 sample paragraphs.
- [Human] Validate Web Speech highlight and fallback.

Week 3 (M2 part 1)
- [AI] Implement WasmTTSAdapter with ONNX Runtime Web (wasm backend).
- [AI] Build ModelManager: download with resume, cache in IndexedDB/OPFS, verify SHA256.
- [AI] Load te_vits_quant.onnx + te_hifigan_quant.onnx; run test inference on short text.
- [AI] Wire WebAudio playback from generated PCM.

Week 4 (M2 part 2)
- [AI] Implement align.ts to map phoneme durations → word timestamps.
- [AI] 60 Hz highlight loop; binary search mapping currentTime → wordIndex.
- [AI] Cache cleaned text/tokens/timestamps by hash; persist last position; resume flow.
- [Human] Measure TTFB and drift; ensure budget targets met; tune fallbacks.

Week 5 (M3)
- [AI] Polish UI and overlay; accessibility (ARIA, focus-visible).
 - [AI] Onboarding flow for Pro Mode; model presence detection + "Test voice".
- [AI] Trim bundle size; ensure CSP compliance; remove any CDN usage.
- [Human] Manual A11y and performance checks.

Week 6 (M4)
- [AI/Human] Prepare 100-paragraph corpus; run cleanup benchmarks.
- [AI] Add drift measurement harness; report median drift.
- [Human] 10-minute playback resilience test; background SW unload.
- [AI] Set up GitHub Actions (lint/format, zip + size gate).
- [AI] Produce release zip; update README and models/README notes.
- [Human] Record screenshots/GIF; final manual QA pass.

Detailed implementation notes per file
manifest.json
- [AI] Include permissions: storage, activeTab, offscreen, unlimitedStorage.
- [AI] No host_permissions by default (optional at model download host if needed).
- [AI] background.service_worker: sw.js, type module.
- [AI] content_scripts: content.js on <all_urls>, document_idle.
- [AI] web_accessible_resources: offscreen.html, styles.css, wasm/onnx-runtime.wasm.

popup.ts
- [AI] Load preferences from storage on open; populate controls.
- [AI] On Play:
  - Query selection/article text via tabs.sendMessage to content.
  - Send ReadRequest to SW with options (engine, rate, pitch, voice, cleanup).
- [AI] On Pause/Resume/Stop: send ControlMessage.
- [AI] Receive ProgressMessage to update status UI.

content.ts
- [AI] Extract selected text or main content (heuristics stub).
- [AI] overlay: create container, token spans, current highlight class.
- [AI] Listen for read/highlight and update DOM efficiently.
- [AI] Expose a handler to return selected text to popup/SW.

sw.ts
- [AI] onMessage router for read/start and read/control.
- [AI] ensureOffscreen() create once; reuse.
- [AI] Spawn TextRefinementWorker; await cleaned text.
- [AI] Tokenize and build token/sentence maps; compute hash.
- [AI] Decide engine route; send play command to offscreen with payload.
- [AI] Cache cleaned/token maps and update storage with last position.

offscreen.ts
- [AI] EngineAdapter implementations:
  - WebSpeechAdapter: speak with boundary → ticks.
  - WasmTTSAdapter: ONNX inference + WebAudio playback → ticks.
- [AI] Normalize pause/resume/stop.
- [AI] Emit read/progress and read/highlight to SW/content.
- [AI] Timing loop: 60 Hz or timeupdate event; binary search mapping.

workers/textRefinement.worker.ts
 - [AI] Receive text, run cleanTelugu(), return cleaned.
 - [AI] Keep functions ≤ 15 lines; no eval.

lib/cleanup.ts
- [AI] Implement deterministic regex-only rules from PRD.

lib/tokenize.ts
- [AI] tokenize by whitespace/punct; record startChar/endChar per token.
- [AI] sentence segmentation; Telugu punctuation aware.
- [AI] grapheme-safe mapping with Intl.Segmenter for boundary charIndex.

lib/highlight.ts
- [AI] tickToWordIndex(t, stamps): binary search mapping.
- [AI] Estimated timing fallback based on token length and rate.

lib/storage.ts
- [AI] getPrefs/setPrefs, getLastPos/setLastPos, with try/catch guards.

WASM models/runtime tasks
 - [AI] scripts/models-fetch.mjs to download models to src-vanilla/models for dev.
 - [AI] ModelManager: checks cache, downloads with resume, verifies SHA256.
 - [AI] Store in IndexedDB/OPFS; surface size and last-updated metadata.
 - [Human] Validate offline playback after download; no further network calls.

Quality gates and acceptance
Cleanup acceptance
- [AI] Run /bench/cleanup-benchmark on 100 items.
- [Human] Confirm precision ≥ 0.9, recall ≥ 0.9, unintended deletions ≤ 2%.

Highlight drift acceptance
- [AI] Run drift harness on 20 samples; compute median drift.
- [Human] Ensure ≤ 200 ms median for timestamps path.
- [Human] If not, enable sentence-level fallback per policy.

Performance acceptance
- [Human] Time-to-first-audio ≤ 1.5 s for ~250 chars (WASM Pro voice after initial model load).
- [Human] Popup open ≤ 150 ms; first paint ≤ 100 ms.
- [Human] Cleanup ≤ 50 ms for 5k chars (check devtools performance).

Lifecycle acceptance
- [Human] 10-minute playback continues across SW suspensions (offscreen).
- [Human] Offline fallback switches engines with a clear notice.

Bundle size gate
- [AI] CI fails if zip > 120 KB.
- [Human] Review PR diffs if size grows.

A/B voice selection (decision task)
- [Human] Prepare identical text samples; blind test 20 users.
- [Human] Record "naturalness" scores 1–5; pick top voice.
- [AI] Update model manifest/metadata and README with final Pro voice model.

Troubleshooting and human checkpoints
- If no Telugu voice in browser:
  - Use default; show info banner with link to add language pack (Windows/macOS).
- If boundary events not firing:
  - Confirm Chrome version; fallback to sentence highlight; log once.
- If model download is slow or ORT init takes long:
  - Show progress; allow pause/resume; fallback to Web Speech until ready.
- If overlay obstructs page:
  - Drag to reposition; support minimize; remember position in storage.

Release checklist
- [AI] Tag repo v0.1.0; generate changelog.
- [AI] Upload telugu-tts-ext.zip to GitHub Releases.
- [Human] Final manual QA on clean profile; attach screenshots/GIFs.
- [Human] Share install and quick-start steps with 1–2 pilot users.

Quick-start commands
 - [AI/Human]
```
git clone <repo>
cd telugu-tts-ext
npm i
npm run dev:vanilla
# Load src-vanilla via chrome://extensions → Load unpacked
```

Pro voice (WASM)
 - Trigger model download from popup → "Upgrade to Pro voice".
 - Models cached locally; can be pre-fetched via npm run models:fetch (dev).

Definition of done per milestone
- M0 DoD: Extension loads; UI controls present; messaging works; offscreen created.
- M1 DoD: Cleanup works; Web Speech playback with word highlight or sentence fallback.
- M2 DoD: WASM Pro voice plays via WebAudio; timestamp-driven highlight; auto-fallback.
- M3 DoD: Polished UI; accessible overlay; onboarding; caching/resume; robust errors.
- M4 DoD: Acceptance tests pass; size gate passes; CI green; docs complete.
