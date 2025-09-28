# Telugu TTS Chrome Extension with Smart Word Tracking

**Seamless, natural Telugu read‑aloud in the browser with smart cleaning and live word highlighting, built entirely with free/open-source components.**

## 🚀 Quick Start (Development)

```bash
git clone <repo>
cd telugu-tts-ext
npm i
npm run dev:vanilla     # zero-build, loads in chrome://extensions
```

Then load the extension:
1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `src-vanilla` directory
4. The extension is now ready to use!

## ✨ Features

### Core Functionality
- **Dual Engine Support**: Browser Web Speech API (default) + Optional WASM Pro Voice
- **Smart Text Cleaning**: Automatically removes citations, references, URLs, and other artifacts
- **Live Word Highlighting**: Real-time highlighting synchronized with speech playback
- **Zero-Setup**: Works immediately with browser's built-in Telugu voice
- **Offline Capable**: Pro voice models download once and work fully offline

### Text Processing
- **Intelligent Cleanup**: Removes bracketed citations `[12]`, `(Ref. 3)`, URLs, DOIs, and more
- **Telugu-Aware**: Safe grapheme tokenization using `Intl.Segmenter` for proper Telugu text handling
- **Sentence Fallback**: Graceful degradation to sentence-level highlighting if word boundaries are unreliable

### User Experience
- **Clean Interface**: Minimal, responsive popup with essential controls
- **In-Page Overlay**: Draggable, resizable overlay for comfortable reading
- **Dark Mode Support**: Automatically respects system color scheme preferences
- **Keyboard Navigation**: Full accessibility support with ARIA roles and keyboard shortcuts

## 🏗️ Architecture

### Components
- **Popup UI**: User controls, preferences, and status display
- **Content Script**: Text extraction, overlay management, and highlighting
- **Service Worker**: Orchestration, caching, and state management
- **Offscreen Document**: Audio playback and timing coordination
- **Text Refinement Worker**: Deterministic text cleanup pipeline
- **WASM TTS Engine**: Optional high-quality offline voice synthesis

### Data Flow
1. User selects text → Content script extracts text
2. Content script → Service worker → Text Refinement Worker (cleanup)
3. Service worker routes to appropriate engine:
   - **Web Speech Path**: Direct browser TTS with boundary events
   - **WASM Pro Path**: ONNX inference with generated timestamps
4. Offscreen document manages playback and emits highlight ticks
5. Content script updates overlay in real-time

## 📦 Installation

### Chrome Web Store (Future)
*Coming soon - will be available on Chrome Web Store*

### Developer Installation
1. Clone this repository
2. Install dependencies: `npm install`
3. Prepare development environment: `npm run dev:vanilla`
4. Load in Chrome: `chrome://extensions` → "Load unpacked" → select `src-vanilla`

### Pro Voice Setup
The Pro voice is optional and requires a one-time download:
1. Open the extension popup
2. Click "Upgrade to Pro voice"
3. Confirm the ~41MB model download
4. Models are cached locally and work offline thereafter

## 🎛️ Usage

### Basic Usage
1. Select Telugu text on any webpage
2. Click the extension icon in Chrome toolbar
3. Click "Play" to start reading
4. Use "Pause/Resume" and "Stop" as needed

### Advanced Features
- **Voice Selection**: Choose between browser default and Pro voice
- **Speed Control**: Adjust playback rate (0.5x - 2.0x)
- **Pitch Control**: Modify voice pitch
- **Smart Cleaning**: Toggle intelligent text cleanup
- **Queue Management**: Build reading queues from multiple selections

### Keyboard Shortcuts
- `Space`: Play/Pause
- `S`: Stop
- `C`: Toggle cleanup
- `↑/↓`: Adjust speed
- `Shift + ↑/↓`: Adjust pitch

## 🔧 Development

### Project Structure
```
TTS/
├── src-vanilla/          # Zero-build Chrome extension source
│   ├── manifest.json     # MV3 extension manifest
│   ├── popup.html/ts     # Extension popup UI
│   ├── content.ts        # Content script for text extraction
│   ├── sw.ts            # Service worker for orchestration
│   ├── offscreen.html/ts # Offscreen document for audio
│   ├── workers/          # Web Workers
│   ├── lib/             # Utility libraries
│   ├── models/          # Downloaded TTS models (.keep)
│   └── wasm/            # WASM runtime files (.keep)
├── scripts/             # CI, size checks, test harness
├── prd.md              # Product Requirements Document
├── architecture.md     # Technical architecture
├── tasks.md            # Development tasks and milestones
└── AGENTS.md           # AI development guide
```

### Zero-Build Development
The `src-vanilla` directory contains a zero-build implementation that can be loaded directly into Chrome without compilation. This is ideal for rapid development and testing.

### Available Scripts
```bash
npm run dev:vanilla     # Prepare src-vanilla for Chrome loading
npm run models:fetch    # Download TTS models for development
npm run zip            # Create release package with size check
npm run lint           # Run linting and formatting checks
```

### Code Style
- **MV3 Compliant**: No eval(), CSP compliant, proper offscreen document usage
- **Function Length**: Keep functions ≤15 lines where feasible
- **TypeScript**: All files use TypeScript but run directly in Chrome
- **Comments**: Each file includes `// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function`

## 🎯 Performance Targets

- **Bundle Size**: ≤120 KB gzip (excluding models/wasm)
- **Popup Load**: ≤150 ms open, ≤100 ms first paint
- **Text Cleanup**: ≤50 ms for 5k characters
- **Time-to-First-Audio**: ≤1.5s for ~250 characters (Pro voice after initial load)
- **Highlight Accuracy**: ≤200ms median drift with timestamps

## 🔒 Privacy & Security

- **Local Processing**: All text processing happens locally in your browser
- **No Cloud Calls**: No external servers except for one-time model download
- **Minimal Permissions**: Only requests essential permissions (storage, activeTab, offscreen, unlimitedStorage)
- **No Tracking**: Absolutely no telemetry or user data collection
- **Open Source**: Full transparency with MIT/Apache-2.0 license

## 📚 Requirements

### System Requirements
- **Chrome**: Version 119 or later
- **Node.js**: Version 18 or later (for development)
- **Memory**: ≥60MB free disk space for Pro voice models
- **Network**: Internet connection for initial Pro voice download

### Browser Support
- **Primary**: Chrome (MV3 Manifest V3)
- **Future**: Firefox, Edge (MV3 support pending)

## 🧪 Testing

### Automated Tests
```bash
npm run test           # Run all test suites
npm run test:cleanup   # Test text cleaning accuracy
npm run test:drift     # Measure highlight timing drift
npm run test:size      # Verify bundle size constraints
```

### Manual Testing
- Load extension in Chrome via `chrome://extensions`
- Test on Telugu Wikipedia articles and news sites
- Verify cleanup accuracy on sample paragraphs
- Test word highlighting drift with different content types
- Validate offline functionality after Pro voice download

## 📈 Milestones

### M0 - Skeleton (Week 1) ✅
- [x] Basic extension structure and manifest
- [x] Popup UI with controls
- [x] Content script for text extraction
- [x] Service worker message routing
- [x] Offscreen document creation

### M1 - Web Speech (Week 2)
- [ ] Text cleanup pipeline with regex rules
- [ ] Web Speech API integration
- [ ] Word highlighting with boundary events
- [ ] Sentence-level fallback

### M2 - WASM Pro Voice (Weeks 3-4)
- [ ] ONNX Runtime Web integration
- [ ] Model download and caching
- [ ] WASM TTS inference pipeline
- [ ] Timestamp-based highlighting

### M3 - Polish (Week 5)
- [ ] UI/UX improvements and accessibility
- [ ] Dark mode support
- [ ] Error handling and resilience
- [ ] Onboarding flow for Pro voice

### M4 - Testing & Release (Week 6)
- [ ] Comprehensive test suite
- [ ] Performance optimization
- [ ] Documentation and packaging
- [ ] CI/CD pipeline setup

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes following the code style guidelines
4. Add tests for new functionality
5. Ensure all tests pass and size constraints are met
6. Submit a pull request

### Development Guidelines
- Follow the MV3 compliance rules
- Keep functions small and focused
- Add comprehensive comments
- Test thoroughly with Telugu text samples
- Respect performance budgets

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **AI4Bharat** for the Indic-TTS models
- **Facebook** for MMS TTS
- **ONNX Runtime** team for the WebAssembly runtime
- **Chrome Extensions** team for MV3 APIs
- Telugu language community for feedback and testing

## 📞 Support

- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: See [architecture.md](architecture.md) for technical details
- **Discussion**: Join our [GitHub Discussions](https://github.com/your-repo/discussions)

## 🔮 Roadmap

### v1.1 (Planned)
- Enhanced word alignment with phoneme-level precision
- Additional Telugu voice options
- PDF and document support
- Mobile browser compatibility

### v2.0 (Future)
- Multi-language support (other Indian languages)
- Advanced text analysis with ML models
- Cloud sync for preferences and reading position
- Browser extensions for Firefox and Edge

---

**Built with ❤️ for Telugu readers and accessibility needs**
