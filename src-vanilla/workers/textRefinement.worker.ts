// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function

import { CleanupRequest, CleanupResponse, Token } from '../types/common';

// Text cleanup function using deterministic regex rules
function cleanTelugu(text: string): string {
    let cleaned = text;

    // Remove bracketed citations: [12], (12), (Ref. 3), (సూచన 3)
    cleaned = cleaned.replace(/\[\d+\]/g, "");
    cleaned = cleaned.replace(/\(\d+\)/g, "");
    cleaned = cleaned.replace(/\(Ref\.\s*\d+\)/gi, "");
    cleaned = cleaned.replace(/\(\s*సూచన\s*\d+\s*\)/g, "");

    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, "");
    cleaned = cleaned.replace(/www\.[^\s]+/g, "");

    // Remove DOIs and arXiv IDs
    cleaned = cleaned.replace(/doi:\s*10\.[^\s]+/gi, "");
    cleaned = cleaned.replace(/arXiv:\s*\d{4}\.\d{4,5}/gi, "");

    // Remove trailing numeric markers
    cleaned = cleaned.replace(/\s*\d+\s*$/g, "");

    // Clean excessive whitespace
    cleaned = cleaned.replace(/\s+/g, " ");
    cleaned = cleaned.replace(/^\s+|\s+$/g, "");

    return cleaned;
}

// Tokenization function for Telugu text
function tokenizeTelugu(text: string): Token[] {
    const tokens: Token[] = [];
    const segmenter = new Intl.Segmenter("te", { granularity: "grapheme" });

    let currentPos = 0;
    for (const segment of segmenter.segment(text)) {
        const tokenText = segment.segment;
        if (tokenText.trim()) {
            tokens.push({
                text: tokenText,
                startChar: currentPos,
                endChar: currentPos + tokenText.length
            });
        }
        currentPos += tokenText.length;
    }

    return tokens;
}

// Main cleanup handler
self.onmessage = function (event: MessageEvent) {
    const message = event.data as CleanupRequest;

    if (message.type === "cleanup/request") {
        try {
            const cleanedText = cleanTelugu(message.text);
            const tokens = tokenizeTelugu(cleanedText);

            const response: CleanupResponse = {
                type: "cleanup/response",
                cleanedText,
                tokens
            };

            self.postMessage(response);
        } catch (error) {
            console.error("Text cleanup failed:", error);
            self.postMessage({
                type: "cleanup/response",
                cleanedText: message.text,
                tokens: []
            });
        }
    }
};

// Export for testing (in a real worker environment, this won't be accessible)
if (typeof module !== "undefined" && module.exports) {
    module.exports = { cleanTelugu, tokenizeTelugu };
}
