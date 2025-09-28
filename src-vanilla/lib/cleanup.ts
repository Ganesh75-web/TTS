// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function

export interface Token {
    text: string;
    startChar: number;
    endChar: number;
}

export interface CleanupResult {
    cleanedText: string;
    tokens: Token[];
}

// Text cleanup function using deterministic regex rules
export function cleanTelugu(text: string): string {
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

// Test cases for cleanup function
export function testCleanup(): void {
    const testCases = [
        {
            input: "ఇది ఫోటోసింథసిస్ [12] అని పిలుస్తారు (సూచన 3)",
            expected: "ఇది ఫోటోసింథసిస్ అని పిలుస్తారు"
        },
        {
            input: "వివరాలు https://example.com లో ఉన్నాయి",
            expected: "వివరాలు లో ఉన్నాయి"
        },
        {
            input: "పరిశోధన doi: 10.1000/abc123 లో ప్రచురించబడింది",
            expected: "పరిశోధన లో ప్రచురించబడింది"
        }
    ];

    testCases.forEach((testCase, index) => {
        const result = cleanTelugu(testCase.input);
        const passed = result === testCase.expected;
        console.log(`Test ${index + 1}: ${passed ? "PASS" : "FAIL"}`);
        if (!passed) {
            console.log(`  Input: "${testCase.input}"`);
            console.log(`  Expected: "${testCase.expected}"`);
            console.log(`  Got: "${result}"`);
        }
    });
}

// Run tests if this module is executed directly
if (typeof process !== "undefined" && process.argv?.includes("--test")) {
    testCleanup();
}
