// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function

import { Token } from "./cleanup";

export interface Sentence {
    text: string;
    startChar: number;
    endChar: number;
    tokens: Token[];
}

// Tokenization function for Telugu text using Intl.Segmenter
export function tokenizeTelugu(text: string): Token[] {
    const tokens: Token[] = [];

    try {
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
    } catch (error) {
        // Fallback to simple character-based tokenization
        console.warn("Intl.Segmenter not available, using fallback");
        return fallbackTokenize(text);
    }

    return tokens;
}

// Fallback tokenization for browsers without Intl.Segmenter
function fallbackTokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let currentPos = 0;

    // Simple Telugu character regex pattern
    const teluguCharRegex = /[\u0C00-\u0C7F]+|[^\u0C00-\u0C7F\s]+|\s+/g;
    let match;

    while ((match = teluguCharRegex.exec(text)) !== null) {
        const tokenText = match[0];
        if (tokenText.trim()) {
            tokens.push({
                text: tokenText,
                startChar: match.index,
                endChar: match.index + tokenText.length
            });
        }
    }

    return tokens;
}

// Sentence segmentation for Telugu text
export function segmentSentences(text: string, tokens: Token[]): Sentence[] {
    const sentences: Sentence[] = [];
    const sentenceDelimiters = /[।\.\?!\n]+/;

    let currentPos = 0;
    const parts = text.split(sentenceDelimiters);

    parts.forEach((sentenceText, index) => {
        sentenceText = sentenceText.trim();
        if (sentenceText) {
            const startChar = text.indexOf(sentenceText, currentPos);
            const endChar = startChar + sentenceText.length;

            // Find tokens that belong to this sentence
            const sentenceTokens = tokens.filter(token =>
                token?.startChar !== undefined && token?.endChar !== undefined &&
                token.startChar >= startChar && token.endChar <= endChar
            );

            sentences.push({
                text: sentenceText,
                startChar,
                endChar,
                tokens: sentenceTokens
            });

            currentPos = endChar;
        }
    });

    return sentences;
}

// Find word index from character position
export function findWordIndex(charIndex: number, tokens: Token[]): number {
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token && charIndex >= token.startChar && charIndex < token.endChar) {
            return i;
        }
    }
    return -1;
}

// Find sentence index from character position
export function findSentenceIndex(charIndex: number, sentences: Sentence[]): number {
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (sentence && charIndex >= sentence.startChar && charIndex < sentence.endChar) {
            return i;
        }
    }
    return -1;
}

// Test Telugu grapheme safety
export function testTeluguTokenization(): void {
    const testCases = [
        {
            input: "క్షమించండి",
            description: "Test compound character క్ష"
        },
        {
            input: "నమస్కారం",
            description: "Test compound character స్కా"
        },
        {
            input: "తెలుగు భాష",
            description: "Test simple words"
        }
    ];

    testCases.forEach((testCase, index) => {
        const tokens = tokenizeTelugu(testCase.input);
        console.log(`Test ${index + 1}: ${testCase.description}`);
        console.log(`  Input: "${testCase.input}"`);
        console.log(`  Tokens: ${tokens.map(t => `"${t.text}"`).join(", ")}`);
        console.log(`  Token count: ${tokens.length}`);
    });
}

// Run tests if this module is executed directly
if (typeof process !== "undefined" && process.argv?.includes("--test")) {
    testTeluguTokenization();
}
