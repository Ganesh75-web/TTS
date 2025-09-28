// Storage constants for the TTS Chrome Extension

export const STORAGE_KEYS = {
    CONFIG: "telugu_tts_config",
    MODELS: "telugu_tts_models",
    CACHE: "telugu_tts_cache",
    DOWNLOADING: "telugu_tts_downloading",
    DOWNLOAD_PROGRESS: "telugu_tts_download_progress"
} as const;

// Default storage configuration
export const DEFAULT_STORAGE_CONFIG = {
    highlightWords: true,
    useProVoice: false,
    highlightColor: "#FFD700",
    darkMode: false
} as const;

// Cache configuration
export const CACHE_CONFIG = {
    MAX_ENTRIES: 100,
    MAX_AGE_MS: 24 * 60 * 60 * 1000 // 24 hours
} as const;
