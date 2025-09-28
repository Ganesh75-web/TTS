// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function

export interface PhonemeResult {
    phonemes: string[];
    confidence: number;
    duration: number;
}

// Telugu character to phoneme mapping (simplified)
const TELUGU_PHONEME_MAP: { [key: string]: string[] } = {
    // Vowels
    "అ": ["ə"],
    "ఆ": ["aː"],
    "ఇ": ["i"],
    "ఈ": ["iː"],
    "ఉ": ["u"],
    "ఊ": ["uː"],
    "ఎ": ["e"],
    "ఏ": ["eː"],
    "ఐ": ["ai"],
    "ఒ": ["o"],
    "ఓ": ["oː"],
    "ఔ": ["au"],
    "అం": ["ə̃"],
    "అః": ["əʰ"],

    // Consonants
    "క": ["k"],
    "ఖ": ["kʰ"],
    "గ": ["ɡ"],
    "ఘ": ["ɡʱ"],
    "ఙ": ["ŋ"],
    "చ": ["t͡ʃ"],
    "ఛ": ["t͡ʃʰ"],
    "జ": ["d͡ʒ"],
    "ఝ": ["d͡ʒʱ"],
    "ఞ": ["ɲ"],
    "ట": ["ʈ"],
    "ఠ": ["ʈʰ"],
    "డ": ["ɖ"],
    "ఢ": ["ɖʱ"],
    "ణ": ["ɳ"],
    "త": ["t̪"],
    "థ": ["t̪ʰ"],
    "ద": ["d̪"],
    "ధ": ["d̪ʱ"],
    "న": ["n"],
    "ప": ["p"],
    "ఫ": ["pʰ"],
    "బ": ["b"],
    "భ": ["bʱ"],
    "మ": ["m"],
    "య": ["j"],
    "ర": ["r"],
    "ల": ["l"],
    "వ": ["ʋ"],
    "శ": ["ʃ"],
    "ష": ["ʂ"],
    "స": ["s"],
    "హ": ["ɦ"],
    "ళ": ["ɭ"],
    "క్ష": ["k͡ʃ"],
    "జ్ఞ": ["d͡zɲ"]
};

// Compound character patterns
const COMPOUND_PATTERNS = [
    /క్ష/g,
    /జ్ఞ/g,
    /త్ర/g,
    /శ్ర/g,
    /ద్వ/g,
    /న్త/g,
    /మ్ప/g,
    /స్త/g
];

// Convert Telugu text to phonemes
export function teluguToPhonemes(text: string): PhonemeResult {
    const phonemes: string[] = [];
    let confidence = 1.0;

    // Pre-process: normalize compound characters
    let processedText = text;

    // Handle compound patterns first
    COMPOUND_PATTERNS.forEach(pattern => {
        processedText = processedText.replace(pattern, (match) => {
            const phonemeList = TELUGU_PHONEME_MAP[match];
            if (phonemeList) {
                return `__${match}__`;
            }
            return match;
        });
    });

    // Convert to phonemes
    for (let i = 0; i < processedText.length; i++) {
        const char = processedText[i];

        // Check for compound character markers
        if (char === "_" && i + 2 < processedText.length && processedText[i + 1] === "_") {
            const compoundChar = processedText.substring(i + 2, i + 4);
            const phonemeList = TELUGU_PHONEME_MAP[compoundChar];
            if (phonemeList) {
                phonemes.push(...phonemeList);
                i += 3; // Skip the markers
                continue;
            }
        }

        // Regular character mapping
        const phonemeList = char ? TELUGU_PHONEME_MAP[char] : undefined;
        if (phonemeList) {
            phonemes.push(...phonemeList);
        } else if (char?.trim()) {
            // Unknown character, reduce confidence
            confidence *= 0.95;
            phonemes.push(char); // Fallback to character itself
        }
    }

    // Estimate duration (rough estimate: 100ms per phoneme)
    const duration = phonemes.length * 100;

    return {
        phonemes,
        confidence,
        duration
    };
}

// Batch convert multiple text segments
export function batchTeluguToPhonemes(texts: string[]): PhonemeResult[] {
    return texts.map(text => teluguToPhonemes(text));
}

// Get phoneme mapping for a specific character
export function getPhonemeForCharacter(char: string): string[] | null {
    return TELUGU_PHONEME_MAP[char] || null;
}

// Add custom phoneme mapping
export function addCustomPhonemeMapping(char: string, phonemes: string[]): void {
    TELUGU_PHONEME_MAP[char] = phonemes;
}

// Test G2P functionality
export function testG2P(): void {
    const testCases = [
        "నమస్కారం",
        "తెలుగు భాష",
        "క్షమించండి",
        "ధన్యవాదాలు"
    ];

    console.log("Testing Telugu G2P conversion:");

    testCases.forEach((text, index) => {
        const result = teluguToPhonemes(text);
        console.log(`Test ${index + 1}: "${text}"`);
        console.log(`  Phonemes: [${result.phonemes.join(", ")}]`);
        console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
        console.log(`  Duration: ${result.duration}ms`);
    });
}

// Validate phoneme sequence
export function validatePhonemes(phonemes: string[]): boolean {
    const validPhonemeSet = new Set(
        Object.values(TELUGU_PHONEME_MAP).flat()
    );

    return phonemes.every(phoneme =>
        validPhonemeSet.has(phoneme) || phoneme.length === 1
    );
}

// Get statistics about phoneme conversion
export function getPhonemeStats(text: string): {
    totalChars: number;
    mappedChars: number;
    unknownChars: number;
    confidence: number;
} {
    const result = teluguToPhonemes(text);
    const mappedChars = Object.keys(TELUGU_PHONEME_MAP).filter(char =>
        text.includes(char)
    ).length;

    return {
        totalChars: text.length,
        mappedChars,
        unknownChars: text.length - mappedChars,
        confidence: result.confidence
    };
}

// Run tests if this module is executed directly
if (typeof window !== "undefined" && window.location?.search?.includes("--test")) {
    testG2P();
}
