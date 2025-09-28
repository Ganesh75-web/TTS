// Shared messaging utilities for the TTS Chrome Extension

import {
    ProgressMessage,
    StatusMessage,
    ModelStatus,
    HighlightTick,
    Token
} from '../types/common';

/**
 * Broadcast a progress update to all extension components
 */
export function broadcastProgress(
    current: number,
    total: number,
    isPlaying: boolean
): void {
    const message: ProgressMessage = {
        type: "progress/update",
        current,
        total,
        isPlaying
    };

    chrome.runtime.sendMessage(message).catch(() => {
        // Service worker or popup not available - this is expected
    });
}

/**
 * Broadcast a status update to all extension components
 */
export function broadcastStatus(status: string, error?: string): void {
    const message: StatusMessage = {
        type: "status/update",
        status,
        ...(error ? { error } : {})
    };

    chrome.runtime.sendMessage(message).catch(() => {
        // Service worker or popup not available - this is expected
    });
}

/**
 * Broadcast model status to all extension components
 */
export function broadcastModelStatus(status: Omit<ModelStatus, "type">): void {
    const message: ModelStatus = {
        type: "model/status",
        ...status
    };

    chrome.runtime.sendMessage(message).catch(() => {
        // Popup not open - this is expected
    });
}

/**
 * Send highlight update to content script
 */
export function sendHighlightUpdate(
    wordIndex: number,
    sentenceIndex: number,
    tokens: Token[],
    tabId: number
): void {
    const message: HighlightTick = {
        type: "highlight/tick",
        wordIndex,
        sentenceIndex
    };

    chrome.tabs.sendMessage(tabId, {
        ...message,
        tokens
    }).catch(() => {
        // Content script not ready - this is expected
    });
}

/**
 * Send control message to content script
 */
export function sendControlMessage(
    controlType: "control/pause" | "control/resume" | "control/stop",
    tabId: number
): void {
    chrome.tabs.sendMessage(tabId, {
        type: controlType
    }).catch(() => {
        // Content script not ready - this is expected
    });
}
