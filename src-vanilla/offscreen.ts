// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function

import {
    TTSStartMessage,
    TTSControlMessage,
    ProgressMessage,
    HighlightTick,
    EngineAdapter,
    Token
} from './types/common';
import { broadcastProgress, sendHighlightUpdate } from './utils/messaging';

let currentAdapter: EngineAdapter | null = null;
let offscreenIsPlaying = false;
let offscreenTokens: Token[] = [];

// Initialize offscreen document
function init() {
    const port = chrome.runtime.connect({ name: "offscreen" });
    port.onMessage.addListener(handleMessage);
    port.onDisconnect.addListener(() => {
        stop();
    });
}

function handleMessage(
    msg: TTSStartMessage | TTSControlMessage,
    _port: chrome.runtime.Port
) {
    switch (msg.type) {
        case "tts/start":
            handleTTSStart(msg);
            break;
        case "tts/pause":
            pause();
            break;
        case "tts/resume":
            resume();
            break;
        case "tts/stop":
            stop();
            break;
    }
}

async function handleTTSStart(message: TTSStartMessage) {
    await stop();

    offscreenTokens = message.tokens;

    if (message.useProVoice) {
        currentAdapter = new WasmTTSAdapter();
    } else {
        currentAdapter = new WebSpeechAdapter();
    }

    currentAdapter.onProgress(updateProgress);
    currentAdapter.onHighlight(updateHighlight);

    try {
        await currentAdapter.speak(message.text, message.tokens);
        offscreenIsPlaying = true;
        updateProgress(0, message.text.length);
    } catch (error) {
        console.error("TTS failed:", error);
        stop();
    }
}

async function pause() {
    if (currentAdapter && offscreenIsPlaying) {
        await currentAdapter.pause();
        offscreenIsPlaying = false;
        updateProgress(0, 0);
    }
}

async function resume() {
    if (currentAdapter && !offscreenIsPlaying) {
        await currentAdapter.resume();
        offscreenIsPlaying = true;
    }
}

async function stop() {
    if (currentAdapter) {
        await currentAdapter.stop();
        currentAdapter = null;
    }
    offscreenIsPlaying = false;
    offscreenTokens = [];
    updateProgress(0, 0);
}

function updateProgress(current: number, total: number) {
    broadcastProgress(current, total, offscreenIsPlaying);
}

function updateHighlight(wordIndex: number, sentenceIndex: number) {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.id) {
            sendHighlightUpdate(wordIndex, sentenceIndex, offscreenTokens, tab.id);
        }
    });
}

// Web Speech API Adapter
class WebSpeechAdapter implements EngineAdapter {
    private utterance: SpeechSynthesisUtterance | null = null;
    private progressCallback?: (current: number, total: number) => void;
    private highlightCallback?: (wordIndex: number, sentenceIndex: number) => void;
    private currentCharIndex = 0;
    private totalChars = 0;

    async speak(text: string, tokens: Token[]): Promise<void> {
        return new Promise((resolve, reject) => {
            this.utterance = new SpeechSynthesisUtterance(text);
            this.utterance.lang = "te-IN";
            this.totalChars = text.length;
            this.currentCharIndex = 0;

            this.utterance.onstart = () => {
                this.currentCharIndex = 0;
                this.updateProgress();
            };

            this.utterance.onboundary = (event) => {
                if (event.name === "word") {
                    this.currentCharIndex = event.charIndex;
                    this.updateProgress();

                    const wordIndex = this.findWordIndex(this.currentCharIndex, tokens);
                    if (wordIndex >= 0) {
                        this.highlightCallback?.(wordIndex, 0);
                    }
                }
            };

            this.utterance.onend = () => {
                this.currentCharIndex = this.totalChars;
                this.updateProgress();
                resolve();
            };

            this.utterance.onerror = (event) => {
                reject(new Error(`Speech synthesis error: ${event.error}`));
            };

            speechSynthesis.speak(this.utterance);
        });
    }

    async pause(): Promise<void> {
        speechSynthesis.pause();
    }

    async resume(): Promise<void> {
        speechSynthesis.resume();
    }

    async stop(): Promise<void> {
        speechSynthesis.cancel();
        this.utterance = null;
    }

    onProgress(callback: (current: number, total: number) => void): void {
        this.progressCallback = callback;
    }

    onHighlight(callback: (wordIndex: number, sentenceIndex: number) => void): void {
        this.highlightCallback = callback;
    }

    private updateProgress(): void {
        this.progressCallback?.(this.currentCharIndex, this.totalChars);
    }

    private findWordIndex(charIndex: number, tokens: Token[]): number {
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token && charIndex >= token.startChar && charIndex < token.endChar) {
                return i;
            }
        }
        return -1;
    }
}

// WASM TTS Adapter (placeholder for now)
class WasmTTSAdapter implements EngineAdapter {
    private progressCallback?: (current: number, total: number) => void;
    private highlightCallback?: (wordIndex: number, sentenceIndex: number) => void;

    async speak(text: string, tokens: Token[]): Promise<void> {
        // Placeholder for WASM TTS implementation
        // This will be implemented with ONNX Runtime Web
        throw new Error("WASM TTS not implemented yet");
    }

    async pause(): Promise<void> {
        // Placeholder
    }

    async resume(): Promise<void> {
        // Placeholder
    }

    async stop(): Promise<void> {
        // Placeholder
    }

    onProgress(callback: (current: number, total: number) => void): void {
        this.progressCallback = callback;
    }

    onHighlight(callback: (wordIndex: number, sentenceIndex: number) => void): void {
        this.highlightCallback = callback;
    }
}

// Initialize when offscreen document loads
init();
