Product Requirements Document (PRD) — Telugu TTS Chrome Extension with Smart Word Tracking


Quick-start (dev)
```
git clone <repo>
cd telugu-tts-ext
npm i
npm run dev:vanilla     # zero-build, loads in chrome://extensions

1. Vision and one-liner



- Seamless, natural Telugu read‑aloud in the browser with smart cleaning and live word highlighting, built entirely with free/open-source components.


1. Objectives and success metrics


- Objectives
	- Natural, interruption‑free narration of Telugu webpages and selected text.
	- Intelligent cleanup of citations/footnotes (e.g., "reference 2", [12], URLs) before playback.
	- Live word‑level highlighting with responsive, minimal UI.
	- Ship with one high-quality open-source Telugu voice (opt-in) and a browser-native fallback (default).

- Success metrics
	- 85% user rating "sounds natural" in pilot (n≥20) for the OSS voice.
	- Cleanup removes >90% bracketed citations/footnotes on Telugu Wikipedia and news samples without harming meaning.
	- Word highlighting drift ≤200 ms median vs spoken audio (for timestamp-based playback).
	- Time-to-first-audio ≤1.5 s for 200–300 chars (WASM Pro voice, after initial model load).
	- Bundle (popup + content script) ≤120 KB gzip.
	- Install-to-first-play ≤10 seconds for browser-native TTS (no setup).
	- Install-to-first-play ≤2–5 minutes for Pro voice (one-time model download; network-dependent).



1. Users and top use cases


- Users: Students, news readers, accessibility users (low vision/dyslexia), Telugu learners.

- Use cases
	- Read a selected paragraph/article with smooth narration and word tracking.

	- Queue multiple selections; auto-clean noisy text (citations/links/DOIs).

	- Adjust voice (male/female), speed, pitch; toggle cleanup; copy cleaned text.



1. Scope


- In scope
	- Chrome MV3 extension (popup UI + content script + service worker).
	- One high-quality open-source Telugu voice (e.g., AI4Bharat) via an optional offline WASM engine (ONNX in offscreen).
	- Browser-native TTS (`te-IN`) as the default, zero-setup engine.
	- Client-side text cleanup (regex-only for V1).
	- Word-level highlighting using boundary events or WASM-generated timestamps.

- Out of scope
	- Cloud/commercial TTS or LLM services.
	- Multi-language support beyond Telugu.
	- Long-form audio export/MP3 downloads.
	- In-browser ML models (ONNX) for cleanup in V1.



1. Core features (must-have)


- TTS playback (play/pause/stop, rate, pitch, voice switch).
- Word-level highlight synced to speech; sentence fallback if word boundaries unavailable.
- Smart text cleanup pipeline via deterministic regex rules.
- Voice selection: Browser default (`te-IN`) and one optional high-quality OSS voice.
- Read selected text or auto-detected main content.
- Browser TTS is the default engine; local OSS voice is opt-in ("Pro Mode").
 - Offline-capable after one-time Pro voice model download; privacy-first (no cloud calls).


1. Non-functional requirements


- Performance
	- Popup open ≤150 ms, first paint ≤100 ms.

	- Cleanup ≤50 ms for 5k chars on mid-range laptop.


- Privacy/Security
	- All processing local; no network except a one-time model download when enabling Pro voice.

	- Minimal permissions: activeTab, storage, unlimitedStorage (for model cache).


- Accessibility
	- Keyboard shortcuts; high-contrast mode; ARIA roles; focus-visible states.


- Reliability
	- Resilient to missing boundary events; graceful degradation to sentence highlight.



1. Architecture (lean)


- Components
	- Popup UI: controls, voice selector, rate, pitch, cleanup toggle, queue, status.

	- Content script: extract selection/article text; inject overlay for highlight if reading in-page.

	- Service worker: orchestrates requests, state, caching; manages model download/caching when Pro voice is enabled.

	- TextRefinementWorker (Web Worker): regex-based cleaner + optional ONNX model pass.

	- Audio player: Web Speech API path (fast) or WebAudio player for WASM (ONNX) offline inference with timestamps.

	- Optional Pro voice (WASM offline): quantized ONNX models (te_vits_quant.onnx ~28 MB, te_hifigan_quant.onnx ~12 MB); onnx-runtime.wasm ~1.3 MB.


- Data flow
	1. Content script sends text → service worker.

	2. Service worker → TextRefinementWorker → cleaned text.

3a) Web Speech API path: synthesize locally; use onboundary events for highlight.

3b) WASM path: offscreen runs ONNX models to produce PCM + timestamps; play via WebAudio; drive highlights from generated timestamps.


- Word timing
	- Primary: timestamps from TTS/aligner (word/phoneme durations).

	- Fallback: SpeechSynthesisUtterance boundary events (charIndex) where available.

	- Last resort: estimate durations by word length/speaking rate; highlight per-token sequentially.

	- If boundary events drift > 300 ms on ≥20% of test corpus, auto-fall back to sentence-level highlight and ship; word-level moved to v1.1.



1. Open-source components (shortlist)


- TTS engines/voices (WASM-based, offline)
	- AI4Bharat Indic-TTS Telugu VITS models (male/female). https://github.com/AI4Bharat/Indic-TTS

	- Facebook MMS Telugu TTS (mms-tts-te). https://huggingface.co/facebook/mms-tts-te

	- MaryTTS (legacy, optional, lower quality; can provide a fallback Telugu unit-selection voice). https://github.com/marytts/marytts


- Alignment (offline, WASM-based)
	- Phoneme-to-word alignment via align.ts (client-side, no server)


- In-browser model runtime (optional)
	- ONNX Runtime Web (WebAssembly/WebGL). https://onnxruntime.ai


- Tiny multilingual text models (optional)
	- IndicBERT v2 or small DistilBERT for Indian languages; quantize to int8 for <25–40 MB; export to ONNX.


- UI
	- Tailwind CSS via CDN (no bundler) or Shoelace web components.


- Extension tooling
	- wxt or crxjs for MV3 builds. https://github.com/wxt-dev/wxt / https://github.com/crxjs/chrome-extension-tools


- Browser APIs
	- Web Speech API (SpeechSynthesisUtterance, boundary). https://developer.mozilla.org/docs/Web/API/SpeechSynthesisUtterance


Note on voice sizes:

- AI4Bharat Telugu VITS checkpoint ≈110 MB; after ONNX export + 8-bit quantization → ≈28 MB per voice; HiFi-GAN ≈12 MB; ORT wasm ≈1.3 MB.


1. Pro voice assets (WASM)

- onnx-runtime.wasm (~1.3 MB), te_vits_quant.onnx (~28 MB), te_hifigan_quant.onnx (~12 MB)
- Download on first upgrade; cache via IndexedDB/OPFS; verify SHA256; offline thereafter



1. Text cleanup requirements


- Deterministic rules (regex-only for V1)
	- Remove bracketed/parenthetical citations: [12], (12), (Ref. 3), (సూచన 3).
	- Remove inline "reference/citation/ref/fig/table/section" patterns in Telugu/English followed by numbers.
	- Strip URLs, DOIs, arXiv IDs, trailing superscript-like numerals, orphaned brackets, excessive whitespace.

- Acceptance
	- On 50 Telugu Wikipedia and 50 news site paragraphs, precision ≥0.9, recall ≥0.9 for artifact removal; ≤2% unintended deletions.



1. UX requirements


- Popup: single-screen controls; large play button; voice/rate; cleanup toggle; queue; progress.

- Toggle: "Smart clean (experimental)" (OFF by default); enabling may download small extra model/runtime.

- In-page overlay reader: large text with live word highlight; unobtrusive; draggable; dark-mode aware.

- States: idle, preparing (cleaning), generating (TTS), playing, paused, error with actionable message.


1. Performance budgets


- Extension JS/CSS total ≤120 KB gzip (no heavy frameworks).

- Cleanup ≤50 ms for 5k chars.

- Timestamp render tick ≤16 ms/frame.

- WASM Pro voice latency: initial model load/compile once; subsequent time-to-first-audio ≤1.5 s for ~250 chars.


1. Telemetry and privacy


- Default: no network beyond one-time model download for Pro voice.

- No personal data collection. Optional anonymous local logs for debugging (toggle off by default).


1. Risks and mitigations


- Risk: Web Speech API boundary events unreliable for Telugu.
 - Mitigation: prefer WASM-generated timestamps; fallback to sentence-level; add estimated timing. If drift >300 ms on ≥20% corpus, ship sentence-level and move word-level to v1.1.


- Risk: Two OSS Telugu voices quality/size.
	- Mitigation: AI4Bharat VITS + MMS-tts; document CPU/GPU expectations; allow per-voice caching.


- Risk: MV3 service worker lifecycle.
	- Mitigation: keep long operations in content page/player; use alarms/keep-alive techniques sparingly.



1. Milestones


- M0 (Week 1): Skeleton extension (popup, content script), selection capture, minimal UI.
- M1 (Week 2): Regex cleaner + Web Speech API playback (default engine) + boundary-based highlighting.
- M2 (Week 3–4): WASM Pro voice (ONNX in offscreen) with timestamps and WebAudio playback.
- M3 (Week 5): Polish UI/UX, accessibility, settings, onboarding for local TTS; caching; error resilience.
- M4 (Week 6): Test suite, acceptance runs (Wikipedia, news sites), packaging, docs.


1. Acceptance tests (samples)


- Reads 5k-char Telugu article without freezes; controls responsive.

- Cleans "ఇది ఫోటోసింథసిస్ [12] అని పిలుస్తారు (సూచన 3)" → "ఇది ఫోటోసింథసిస్ అని పిలుస్తారు".

- Switch voice at runtime; persists preference.

- Word highlight drift ≤200 ms median (timestamps path).
 - Works fully offline after one-time model download; if WASM init fails, fallback to Web Speech and degrade gracefully.
- User can play cleaned Telugu text within 10 seconds of install, with no additional setup.
- Long article (~10min) playback doesn't break due to MV3 service worker unload.


1. Delivery artifacts


- GitHub repo (MIT/Apache-2.0): extension code, model fetcher script, release assets for models, README quick-start.

- Example voices configured by default (document sizes and CPU/GPU notes).

- Sample pages + benchmark script for cleanup accuracy and latency.


1. Implementation notes (concise)


- Prefer zero-build UI: vanilla TS + Tailwind CDN or Petite-Vue; keep popup tiny.

- Use Intl.Segmenter for safe Telugu grapheme splitting; tokenize by whitespace + punctuation for highlight mapping.

- Cache cleaned text and timestamps per URL + hash to allow resume.

- Avoid heavy bundlers; if needed, Vite + crxjs; ensure MV3 CSP compliance.

- Provide a switch: "Engine: Browser (Web Speech) | Pro (WASM)".

Vibe-coding guard-rails


- Zero-build path: keep a /src-vanilla folder that works by opening chrome://extensions → "Load unpacked" with no npm install.

- AI-coder prompt header: every .ts file starts with // VIBE: MV3, no eval, CSP compliant, ≤15 lines per function.

- Bundle budget gate: CI rejects PR if npm run zip > 120 kB.

- Fallback first: implement Web-Speech path in ≤1 h, then fork file to add local-TTS path; keeps main branch always usable.


1. Minimal code stubs (illustrative)


- Regex cleaner (baseline)


	export function cleanTelugu(input: string): string {
	  let s = input;
	
	  // Remove bracketed/parenthetical citations like [12], (12), (Ref. 3), (సూచన 3)
	  s = s.replace(
	    /\s*[\[\(]\s*(?:ref\.?|సూచన|citation|cite|fig(?:ure)?|table|section|sec\.?)?\s*\d+[a-zA-Z]*\s*[\]\)]/gi,
	    "",
	  );
	
	  // Remove trailing numeric markers ... 12, ^12, 12.
	  s = s.replace(/(?:\s|^)(?:ref\.?|సూచన)\s*\d+\b/gi, "");
	  s = s.replace(/\s*\^?\d+\b/g, "");
	
	  // Remove URLs/DOIs/arXiv
	  s = s.replace(/\bhttps?:\/\/\S+/gi, "");
	  s = s.replace(/\bdoi:\s*\S+/gi, "");
	  s = s.replace(/\barXiv:\s*\S+/gi, "");
	
	  // Collapse stray brackets and whitespace
	  s = s.replace(/[()\[\]]/g, " ");
	  s = s.replace(/\s{2,}/g, " ").trim();
	
	  return s;
	}


- Web Speech API usage (fallback path)


	export function speakTelugu(
	  text: string,
	  voiceName?: string,
	  rate = 1,
	  pitch = 1,
	) {
	  const u = new SpeechSynthesisUtterance(text);
	  const voices = speechSynthesis.getVoices();
	  const te = voices.find(
	    (v) => v.lang?.toLowerCase().startsWith("te") || v.name === voiceName,
	  );
	  if (te) u.voice = te;
	  u.rate = rate;
	  u.pitch = pitch;
	
	  u.onboundary = (e) => {
	    if (e.name === "word" || e.charIndex >= 0) {
	      // Map e.charIndex to word index and highlight
	      // Keep a precomputed mapping of char offsets to word spans
	    }
	  };
	
	  speechSynthesis.cancel();
	  speechSynthesis.speak(u);
	}


1. Open questions


- Exact voice SKUs to ship by default:
  - **Decision (≤ 48 h):** Run blind A/B on 20 users between "te-ai4b-female-28MB" and "mms-tts-te-23MB"; pick the top-rated one for the optional WASM Pro voice package. The default will be the browser's `te-IN` voice.
- Do we require precise word timestamps for v1, or accept sentence-level fallback and add alignment in v1.1?

Notes on "less is more"


- Single HTML popup, no router, minimal state.

- Prefer regex-first cleaner; only add ONNX if clearly beneficial (toggle OFF by default).

- No external server; models downloaded once then fully offline.

- Two clear runtime modes: Browser voice (fast prototype) vs Local OSS voices (primary).
