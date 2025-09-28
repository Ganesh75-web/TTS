# claude.md - Telugu TTS Chrome Extension Implementation Guide

## Overview
This guide helps developers leverage Claude for implementing the Telugu TTS Chrome Extension with smart word tracking. The project uses MV3 architecture, zero-build development path, and combines Web Speech API with an optional local WASM (ONNX) voice.

## Project Context for Claude

### Core Constraints
- **MV3 Compliance**: No eval, CSP compliant, proper offscreen document usage
- **Performance**: Bundle ≤120 KB gzip, popup open ≤150 ms, cleanup ≤50 ms for 5k chars
- **Code Style**: Functions ≤15 lines, zero-build first approach
- **Architecture**: Service worker orchestration, offscreen audio playback, Web Worker text cleanup

### Key Technical Decisions
- Two runtime modes: Browser voice (default) and Local WASM voice (opt-in)
- Offscreen document owns audio playback to avoid service worker suspension
- Deterministic regex-only text cleanup in v1
- Word-level highlighting with sentence-level fallback

## Implementation Prompts

### Initial Scaffold Generation

```
Create the MV3 manifest.json and directory structure for a Telugu TTS Chrome extension following these constraints:
- Use manifest_version 3 with service worker background script
- Permissions: storage, activeTab, offscreen, unlimitedStorage
- No host permissions by default (optional at model download host if needed)
- Content script on all URLs
- Zero-build approach in src-vanilla/ directory
- Include TypeScript files but ensure they can run directly in Chrome
```

### Core Components

#### 1. Service Worker (sw.ts)
```
Implement sw.ts for a Telugu TTS Chrome extension with:
- Message router for ReadRequest, ControlMessage types
- State machine: idle → preparing → generating → playing → paused → error
- Offscreen document creation with chrome.offscreen API
- TextRefinementWorker spawning for text cleanup
- Cache management for cleaned text and timestamps
- VIBE: MV3, no eval, CSP compliant, ≤15 lines per function
```

#### 2. Text Cleanup Pipeline
```
Implement cleanTelugu() function with deterministic regex rules to:
- Remove bracketed citations: [12], (12), (Ref. 3), (సూచన 3)
- Strip inline reference patterns in Telugu/English
- Remove URLs, DOIs, arXiv IDs
- Clean trailing numeric markers and excessive whitespace
- Must process 5k chars in ≤50 ms
```

#### 3. Offscreen Audio Player
```
Create offscreen.ts with EngineAdapter interface supporting:
1. WebSpeechAdapter:
   - Use SpeechSynthesisUtterance for Telugu (te-IN)
   - Map onboundary events to word indices
   - Fallback to sentence-level if no boundary events

2. WasmTTSAdapter:
   - Run ONNX Runtime Web in offscreen (wasm backend)
   - Models: te_vits_quant.onnx (~28 MB), te_hifigan_quant.onnx (~12 MB)
   - Generate PCM + timestamps fully offline
   - 60 Hz timing loop mapping audio.currentTime to word index
   - Binary search for timestamp-to-word mapping
```

#### 4. Content Script Overlay
```
Implement content.ts with:
- Selection extraction using getSelection()
- Draggable overlay with word-level highlighting
- Token rendering as spans with data-index
- Dark mode awareness via prefers-color-scheme
- ARIA roles and keyboard navigation
- Highlight updates from read/highlight messages
```

#### 5. Tokenization and Highlighting
```
Create lib/tokenize.ts using:
- Intl.Segmenter('te', { granularity: 'grapheme' }) for Telugu
- Token structure: { text, startChar, endChar }
- Sentence segmentation aware of Telugu punctuation
- Mapping between char offsets and token indices
- Support for both word and sentence-level highlighting
```

### WASM Models Setup

```
Prepare Pro voice assets for offline use:
- onnx-runtime.wasm (~1.3 MB) under wasm/
- te_vits_quant.onnx (~28 MB) and te_hifigan_quant.onnx (~12 MB) under models/
- Download on first “Upgrade to Pro voice”; cache via IndexedDB/OPFS
- Add unlimitedStorage permission; exclude models/wasm from size gate
```

### Testing and Validation

```
Create test harness for:
- Cleanup accuracy: precision ≥0.9, recall ≥0.9 on 100 Telugu samples
- Word highlight drift ≤200 ms median with timestamps
- Time-to-first-audio ≤1.5 s for 250 chars
- Bundle size validation ≤120 KB gzip
- MV3 lifecycle resilience (10-minute playback)
```

## Common Implementation Patterns

### Message Passing
```typescript
// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function
chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  if (msg.type === "read/start") {
    handleStart(msg as ReadRequest).then(() => send(true));
  }
  return true; // Keep channel open for async response
});
```

### Offscreen Document Creation
```typescript
async function ensureOffscreen() {
  const exists = await chrome.offscreen.hasDocument?.();
  if (exists) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Keep audio playing with word highlights"
  });
}
```

### Binary Search for Timestamps
```typescript
function tickToWordIndex(t: number, stamps: { startSec: number; endSec: number }[]): number {
  let lo = 0, hi = stamps.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (stamps[mid].startSec <= t) (ans = mid), (lo = mid + 1);
    else hi = mid - 1;
  }
  return ans;
}
```

## Troubleshooting Prompts

### Performance Issues
```
The extension bundle exceeds 120 KB. Optimize by:
- Removing unnecessary dependencies
- Using vanilla JS/TS without frameworks
- Inlining critical CSS
- Avoiding external CDN resources
```

### Word Highlighting Drift
```
Word highlighting drifts >200 ms. Implement fallback:
- Detect drift by comparing expected vs actual timing
- Switch to sentence-level highlighting if drift >300 ms on 20% of corpus
- Use length-based estimation as last resort
```

### MV3 Lifecycle Problems
```
Audio stops when service worker suspends. Fix with:
- Move all audio playback to offscreen document
- Keep state in offscreen, not service worker
- Use chrome.runtime messaging for coordination
- Implement proper cleanup on document destruction
```

## Testing Instructions for Claude

When asked to test or validate code:

1. **Cleanup Validation**
   ```
   Test cleanTelugu() with:
   Input: "ఇది ఫోటోసింథసిస్ [12] అని పిలుస్తారు (సూచన 3)"
   Expected: "ఇది ఫోటోసింథసిస్ అని పిలుస్తారు"
   ```

2. **Tokenization Check**
   ```
   Verify Telugu grapheme safety:
   - క్ష should remain single token
   - Compound characters preserve integrity
   ```

3. **Message Contract Validation**
   ```
   Ensure all messages match TypeScript interfaces:
   - ReadRequest, ControlMessage, ProgressMessage, HighlightTick
   - Proper error propagation between components
   ```

## Architecture Decisions for Claude

When implementing, remember:

1. **State Ownership**
   - Service Worker: Queue, orchestration, caching
   - Offscreen: Audio playback, timing, boundary events
   - Content: UI overlay, selection, highlighting
   - Popup: User controls, preferences

2. **Fallback Chain**
   - Word highlighting → Sentence highlighting → Sequential
   - WASM Pro voice → Browser TTS → Error message
   - WASM timestamps → Boundary events → Estimates

3. **Performance Budgets**
   - Each component has strict limits
   - Prefer simple solutions over complex optimizations
   - Test on mid-range hardware

## Milestone-Specific Prompts

### M0 - Skeleton (Week 1)
```
Create basic MV3 extension structure with:
- Minimal popup.html with play/pause/stop buttons
- Empty service worker with message routing
- Content script that extracts selection
- No actual TTS yet, just messaging
```

### M1 - Web Speech (Week 2)
```
Add Web Speech API playback:
- Implement WebSpeechAdapter in offscreen
- Add text cleanup with regex rules
- Wire up word highlighting using boundary events
- Include sentence-level fallback
```

### M2 - WASM Pro voice (Weeks 3-4)
```
Integrate offline WASM TTS:
- WasmTTSAdapter with ONNX Runtime Web (wasm)
- Model download/caching manager with progress UI
- Timestamps from alignment; WebAudio playback + highlight
- Engine switching in popup; automatic fallback to browser voice
```

### M3 - Polish (Week 5)
```
Polish UX and accessibility:
- Draggable, resizable overlay
- Dark mode support
- Keyboard shortcuts
- ARIA roles and focus management
- Pro Mode onboarding flow
```

### M4 - Testing (Week 6)
```
Create test suite and documentation:
- 100-paragraph corpus for cleanup testing
- Drift measurement harness
- Bundle size validation (zip ≤120 KB, excluding models/wasm)
- GitHub Actions CI setup
```

## Code Review Checklist for Claude

When reviewing generated code, verify:

- [ ] MV3 CSP compliance (no eval, no inline scripts)
- [ ] Functions ≤15 lines each
- [ ] No external CDN dependencies
- [ ] Proper error handling and fallbacks
- [ ] Chrome API usage follows latest practices
- [ ] TypeScript types match PRD interfaces
- [ ] Telugu text handling preserves graphemes
- [ ] Memory leaks prevented (cleanup listeners)
- [ ] State consistency across components

## Mandatory Workflow

When executing tasks from `tasks.md`:

1.  **Task Tracking**: After completing any task prefixed with `[AI]`, you MUST update the `tasks.md` file by changing `[AI]` to `[x]`. Do not skip any tasks.
2.  **Progress Documentation**: After completing all tasks within a numbered section (e.g., all of "M0 — Skeleton and wiring (Week 1)"), you MUST update the `documentation.txt` file. This file should contain a running log with:
    *   **Summary**: A brief overview of what was accomplished in the section.
    *   **Key Actions**: Specific files created or modified and the core logic implemented.
    *   **Problem-Solving**: Any challenges encountered (e.g., API limitations, performance tuning, fallback logic) and how they were resolved.

These two steps are mandatory after each section's completion.

## Notes for Optimal Claude Usage

1. **Be Specific**: Reference exact file paths and function names
2. **Include Context**: Mention MV3 constraints and performance budgets
3. **Request Validation**: Ask Claude to verify Telugu handling and CSP compliance
4. **Iterative Refinement**: Start with basic implementation, then optimize
5. **Test Cases**: Always include sample Telugu text for testing

## Example Full Implementation Request

```
Implement the complete Telugu TTS Chrome Extension M1 milestone:
- Use the architecture from architecture.md
- Follow tasks.md for M1 requirements
- Generate all files in src-vanilla/ directory
- Include Web Speech API with boundary events
- Add regex text cleanup from PRD
- Implement word highlighting with sentence fallback
- Ensure MV3 compliance and ≤120 KB bundle
- Add inline comments with // VIBE: MV3, no eval, CSP compliant
```

---

Remember: This is a zero-build first project. All TypeScript should be directly loadable in Chrome without compilation for development. Focus on simplicity, performance, and reliability over feature complexity.
