// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function

import { Token } from "./cleanup";
import { Sentence } from "./tokenize";

export interface HighlightConfig {
    wordHighlight: boolean;
    sentenceHighlight: boolean;
    highlightColor: string;
    backgroundColor: string;
    textColor: string;
}

export interface HighlightPosition {
    wordIndex: number;
    sentenceIndex: number;
    timestamp: number;
}

// Default highlight configuration
export const defaultHighlightConfig: HighlightConfig = {
    wordHighlight: true,
    sentenceHighlight: false,
    highlightColor: "#FFD700",
    backgroundColor: "transparent",
    textColor: "inherit"
};

// Create highlight styles dynamically
export function createHighlightStyles(config: HighlightConfig): string {
    return `
        .telugu-tts-highlight {
            background-color: ${config.highlightColor} !important;
            color: ${config.textColor} !important;
            border-radius: 2px;
            padding: 0 2px;
            transition: background-color 0.1s ease;
        }
        
        .telugu-tts-highlight.paused {
            background-color: ${config.backgroundColor} !important;
        }
        
        .telugu-tts-sentence-highlight {
            background-color: ${config.highlightColor}33 !important;
            border-left: 3px solid ${config.highlightColor} !important;
            padding-left: 5px;
            margin-left: -5px;
        }
        
        .telugu-tts-overlay {
            position: absolute;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 12px;
            max-width: 200px;
        }
        
        .telugu-tts-overlay.hidden {
            display: none;
        }
        
        @media (prefers-color-scheme: dark) {
            .telugu-tts-overlay {
                background: #2d2d2d;
                border-color: #555;
                color: #fff;
            }
        }
    `;
}

// Apply highlight styles to document
export function applyHighlightStyles(config: HighlightConfig = defaultHighlightConfig): void {
    let styleElement = document.getElementById("telugu-tts-highlight-styles") as HTMLStyleElement;

    if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = "telugu-tts-highlight-styles";
        document.head.appendChild(styleElement);
    }

    styleElement.textContent = createHighlightStyles(config);
}

// Highlight specific word in text
export function highlightWord(
    text: string,
    tokens: Token[],
    wordIndex: number,
    sentenceIndex: number,
    config: HighlightConfig = defaultHighlightConfig
): string {
    if (!config.wordHighlight || wordIndex < 0 || wordIndex >= tokens.length) {
        return text;
    }

    const word = tokens[wordIndex];
    const before = text.substring(0, word?.startChar ?? 0);
    const wordText = text.substring(word?.startChar ?? 0, word?.endChar ?? 0);
    const after = text.substring(word?.endChar ?? 0);

    return `${before}<span class="telugu-tts-highlight">${wordText}</span>${after}`;
}

// Highlight sentence in text
export function highlightSentence(
    text: string,
    sentences: Sentence[],
    sentenceIndex: number,
    config: HighlightConfig = defaultHighlightConfig
): string {
    if (!config.sentenceHighlight || sentenceIndex < 0 || sentenceIndex >= sentences.length) {
        return text;
    }

    const sentence = sentences[sentenceIndex];
    const before = text.substring(0, sentence?.startChar ?? 0);
    const sentenceText = text.substring(sentence?.startChar ?? 0, sentence?.endChar ?? 0);
    const after = text.substring(sentence?.endChar ?? 0);

    return `${before}<span class="telugu-tts-sentence-highlight">${sentenceText}</span>${after}`;
}

// Clear all highlights from document
export function clearHighlights(): void {
    const highlights = document.querySelectorAll(".telugu-tts-highlight, .telugu-tts-sentence-highlight");
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

// Update highlight based on current position
export function updateHighlight(
    position: HighlightPosition,
    tokens: Token[],
    sentences: Sentence[],
    config: HighlightConfig = defaultHighlightConfig
): void {
    clearHighlights();

    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") {
        return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement("span");

    try {
        if (config.wordHighlight && position.wordIndex >= 0) {
            const highlightedText = highlightWord(
                selection.toString(),
                tokens,
                position.wordIndex,
                position.sentenceIndex,
                config
            );

            span.innerHTML = highlightedText;
            range.deleteContents();
            range.insertNode(span);
        }
    } catch (error) {
        console.warn("Failed to apply word highlight:", error);

        // Fallback: simple highlight
        span.className = "telugu-tts-highlight";
        try {
            range.surroundContents(span);
        } catch {
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
        }
    }
}

// Check if highlighting is drifting too much
export function checkHighlightDrift(
    expectedPosition: number,
    actualPosition: number,
    toleranceMs: number = 200
): boolean {
    const drift = Math.abs(expectedPosition - actualPosition);
    return drift > toleranceMs;
}

// Fallback to sentence-level highlighting if word highlighting drifts too much
export function fallbackToSentenceHighlighting(
    config: HighlightConfig
): HighlightConfig {
    return {
        ...config,
        wordHighlight: false,
        sentenceHighlight: true
    };
}

// Initialize highlighting system
export function initHighlighting(config: HighlightConfig = defaultHighlightConfig): void {
    applyHighlightStyles(config);

    // Listen for dark mode changes
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    darkModeQuery.addEventListener("change", () => {
        applyHighlightStyles(config);
    });
}

// Test highlighting functionality
export function testHighlighting(): void {
    const testText = "తెలుగు భాష చాలా అందంగా ఉంటుంది.";
    const tokens = [
        { text: "తెలుగు", startChar: 0, endChar: 5 },
        { text: " ", startChar: 5, endChar: 6 },
        { text: "భాష", startChar: 6, endChar: 9 },
        { text: " ", startChar: 9, endChar: 10 },
        { text: "చాలా", startChar: 10, endChar: 14 },
        { text: " ", startChar: 14, endChar: 15 },
        { text: "అందంగా", startChar: 15, endChar: 21 },
        { text: " ", startChar: 21, endChar: 22 },
        { text: "ఉంటుంది", startChar: 22, endChar: 28 },
        { text: ".", startChar: 28, endChar: 29 }
    ];

    console.log("Testing highlighting with text:", testText);
    console.log("Highlighting word at index 2 (భాష):");
    const highlighted = highlightWord(testText, tokens, 2, 0);
    console.log("Result:", highlighted);
}

// Run tests if this module is executed directly
if (typeof process !== "undefined" && process.argv?.includes("--test")) {
    testHighlighting();
}
