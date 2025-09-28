// Common TypeScript interfaces and types for the TTS Chrome Extension

export interface Token {
    text: string;
    startChar: number;
    endChar: number;
}

export interface HighlightMessage {
    type: "highlight/update";
    wordIndex: number;
    sentenceIndex: number;
    tokens: Token[];
}

export interface ControlMessage {
    type: "control/pause" | "control/resume" | "control/stop";
}

export interface StatusRequest {
    type: "content/status";
}

export interface StatusResponse {
    isPlaying: boolean;
}

export interface TTSStartMessage {
    type: "tts/start";
    text: string;
    tokens: Token[];
    useProVoice: boolean;
    highlightWords: boolean;
}

export interface TTSControlMessage {
    type: "tts/pause" | "tts/resume" | "tts/stop";
}

export interface ProgressMessage {
    type: "progress/update";
    current: number;
    total: number;
    isPlaying: boolean;
}

export interface HighlightTick {
    type: "highlight/tick";
    wordIndex: number;
    sentenceIndex: number;
}

export interface ReadRequest {
    type: "read/start";
    text: string;
    useProVoice: boolean;
    highlightWords: boolean;
}

export interface StatusMessage {
    type: "status/update";
    status: string;
    error?: string;
}

export interface ModelStatus {
    type: "model/status";
    hasModels: boolean;
    downloading?: boolean;
    progress?: number;
}

export interface ModelDownload {
    type: "model/download";
}

export interface CleanupRequest {
    type: "cleanup/request";
    text: string;
}

export interface CleanupResponse {
    type: "cleanup/response";
    cleanedText: string;
    tokens: Token[];
}

export type AppState = "idle" | "preparing" | "generating" | "playing" | "paused" | "error";

export interface EngineAdapter {
    speak(text: string, tokens: Token[]): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    stop(): Promise<void>;
    onProgress(callback: (current: number, total: number) => void): void;
    onHighlight(callback: (wordIndex: number, sentenceIndex: number) => void): void;
}

export interface StorageConfig {
    highlightWords: boolean;
    useProVoice: boolean;
    highlightColor: string;
    darkMode: boolean;
}

export interface ModelInfo {
    hasModels: boolean;
    modelVersion: string;
    downloadDate: number | null;
    sizeBytes: number;
}

export interface CacheEntry {
    text: string;
    cleanedText: string;
    tokens: Token[];
    timestamp: number;
}
