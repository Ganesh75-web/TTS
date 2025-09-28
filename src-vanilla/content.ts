// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function

import {
    Token,
    HighlightMessage,
    ControlMessage,
    StatusRequest,
    StatusResponse
} from './types/common';

let overlay: HTMLDivElement | null = null;
let contentTokens: Token[] = [];
let isOverlayVisible = false;

// Initialize content script
function init() {
    setupMessageListener();
    createOverlay();
    setupSelectionListener();
}

function setupMessageListener() {
    chrome.runtime.onMessage.addListener(
        (
            msg: HighlightMessage | ControlMessage | StatusRequest,
            _sender: chrome.runtime.MessageSender,
            sendResponse: (response: StatusResponse) => void
        ) => {
            switch (msg.type) {
                case "highlight/update":
                    updateHighlight(msg);
                    break;
                case "control/pause":
                    pauseHighlight();
                    break;
                case "control/resume":
                    resumeHighlight();
                    break;
                case "control/stop":
                    clearHighlight();
                    break;
                case "content/status":
                    sendResponse({ isPlaying: isOverlayVisible });
                    break;
            }
            return true;
        }
    );
}

function createOverlay() {
    overlay = document.createElement("div");
    overlay.id = "telugu-tts-overlay";
    overlay.className = "telugu-tts-overlay";
    overlay.style.display = "none";
    document.body.appendChild(overlay);
}

function setupSelectionListener() {
    document.addEventListener("mouseup", handleSelectionChange);
    document.addEventListener("keyup", handleSelectionChange);
}

function handleSelectionChange() {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") {
        hideOverlay();
        return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    showOverlay(rect);
}

function showOverlay(rect: DOMRect) {
    if (!overlay) return;

    overlay.style.display = "block";
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.top = `${rect.bottom + window.scrollY + 5}px`;

    isOverlayVisible = true;
}

function hideOverlay() {
    if (!overlay) return;

    overlay.style.display = "none";
    isOverlayVisible = false;
}

function updateHighlight(msg: HighlightMessage) {
    contentTokens = msg.tokens;

    if (!overlay) return;

    const selectedText = window.getSelection()?.toString() || "";
    if (!selectedText) return;

    clearHighlightFromDOM();
    highlightTextInDOM(selectedText, msg.wordIndex, msg.sentenceIndex);
}

function highlightTextInDOM(text: string, wordIndex: number, sentenceIndex: number) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.className = "telugu-tts-highlight";

    try {
        range.surroundContents(span);
    } catch {
        // Fallback for complex selections
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
    }
}

function clearHighlightFromDOM() {
    const highlights = document.querySelectorAll(".telugu-tts-highlight");
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        if (parent) {
            while (highlight.firstChild) {
                parent.insertBefore(highlight.firstChild, highlight);
            }
            parent.removeChild(highlight);
        }
    });
}

function pauseHighlight() {
    const highlights = document.querySelectorAll(".telugu-tts-highlight");
    highlights.forEach(highlight => {
        highlight.classList.add("paused");
    });
}

function resumeHighlight() {
    const highlights = document.querySelectorAll(".telugu-tts-highlight");
    highlights.forEach(highlight => {
        highlight.classList.remove("paused");
    });
}

function clearHighlight() {
    clearHighlightFromDOM();
    hideOverlay();
    contentTokens = [];
}

// Check for dark mode
function isDarkMode() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Initialize when content script loads
init();
