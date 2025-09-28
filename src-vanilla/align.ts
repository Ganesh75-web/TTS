// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function

export interface AlignmentResult {
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
}

export interface TextAlignment {
    text: string;
    alignments: AlignmentResult[];
    totalDuration: number;
}

export interface AlignmentConfig {
    method: "duration" | "phoneme" | "uniform";
    baseDuration: number;
    phonemeDuration: number;
    pauseDuration: number;
}

// Default alignment configuration
export const DEFAULT_ALIGNMENT_CONFIG: AlignmentConfig = {
    method: "duration",
    baseDuration: 100, // ms per character
    phonemeDuration: 80, // ms per phoneme
    pauseDuration: 200 // ms for punctuation
};

// Simple duration-based alignment
export function alignByDuration(
    text: string,
    config: AlignmentConfig = DEFAULT_ALIGNMENT_CONFIG
): TextAlignment {
    const alignments: AlignmentResult[] = [];
    const words = text.split(/\s+/);
    let currentTime = 0;

    for (const word of words) {
        if (!word.trim()) continue;

        // Calculate word duration based on character count
        const duration = word.length * config.baseDuration;

        alignments.push({
            word,
            startTime: currentTime,
            endTime: currentTime + duration,
            confidence: 0.8 // Default confidence
        });

        currentTime += duration;
    }

    return {
        text,
        alignments,
        totalDuration: currentTime
    };
}

// Phoneme-based alignment using G2P
export function alignByPhonemes(
    text: string,
    config: AlignmentConfig = DEFAULT_ALIGNMENT_CONFIG
): TextAlignment {
    const alignments: AlignmentResult[] = [];
    const words = text.split(/\s+/);
    let currentTime = 0;

    for (const word of words) {
        if (!word.trim()) continue;

        // Use G2P to get phonemes (simplified - would use actual G2P in practice)
        const phonemeCount = estimatePhonemeCount(word);
        const duration = phonemeCount * config.phonemeDuration;

        alignments.push({
            word,
            startTime: currentTime,
            endTime: currentTime + duration,
            confidence: 0.9 // Higher confidence for phoneme-based
        });

        currentTime += duration;
    }

    return {
        text,
        alignments,
        totalDuration: currentTime
    };
}

// Uniform alignment (equal time per word)
export function alignUniformly(
    text: string,
    targetDuration: number,
    config: AlignmentConfig = DEFAULT_ALIGNMENT_CONFIG
): TextAlignment {
    const alignments: AlignmentResult[] = [];
    const words = text.split(/\s+/).filter(word => word.trim());
    const wordCount = words.length;

    if (wordCount === 0) {
        return {
            text,
            alignments: [],
            totalDuration: 0
        };
    }

    const durationPerWord = targetDuration / wordCount;
    let currentTime = 0;

    for (const word of words) {
        alignments.push({
            word,
            startTime: currentTime,
            endTime: currentTime + durationPerWord,
            confidence: 0.7 // Lower confidence for uniform
        });

        currentTime += durationPerWord;
    }

    return {
        text,
        alignments,
        totalDuration: targetDuration
    };
}

// Estimate phoneme count (simplified)
function estimatePhonemeCount(word: string): number {
    // Simple heuristic: count characters, adjust for compounds
    let count = word.length;

    // Adjust for common Telugu compound characters
    if (word.includes("క్ష")) count -= 1;
    if (word.includes("జ్ఞ")) count -= 1;
    if (word.includes("త్ర")) count -= 1;
    if (word.includes("శ్ర")) count -= 1;

    return Math.max(1, count);
}

// Get alignment for specific time
export function getAlignmentAtTime(
    alignment: TextAlignment,
    time: number
): AlignmentResult | null {
    // Binary search for efficiency
    let left = 0;
    let right = alignment.alignments.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const item = alignment.alignments[mid];

        if (item && time >= item.startTime && time <= item.endTime) {
            return item;
        } else if (item && time < item.startTime) {
            right = mid - 1;
        } else if (item) {
            left = mid + 1;
        }
    }

    return null;
}

// Get word index at specific time
export function getWordIndexAtTime(
    alignment: TextAlignment,
    time: number
): number {
    const result = getAlignmentAtTime(alignment, time);
    return result ? alignment.alignments.indexOf(result) : -1;
}

// Adjust alignment timing
export function adjustAlignmentTiming(
    alignment: TextAlignment,
    timeScale: number,
    timeOffset: number = 0
): TextAlignment {
    const adjustedAlignments = alignment.alignments.map(item => ({
        ...item,
        startTime: item.startTime * timeScale + timeOffset,
        endTime: item.endTime * timeScale + timeOffset
    }));

    return {
        ...alignment,
        alignments: adjustedAlignments,
        totalDuration: alignment.totalDuration * timeScale
    };
}

// Merge multiple alignments
export function mergeAlignments(
    alignments: TextAlignment[]
): TextAlignment {
    if (alignments.length === 0) {
        return {
            text: "",
            alignments: [],
            totalDuration: 0
        };
    }

    if (alignments.length === 1) {
        return alignments[0]!;
    }

    const allAlignments: AlignmentResult[] = [];
    let timeOffset = 0;
    let combinedText = "";

    for (const alignment of alignments) {
        const adjusted = adjustAlignmentTiming(alignment, 1, timeOffset);
        allAlignments.push(...adjusted.alignments);
        combinedText += (combinedText ? " " : "") + alignment.text;
        timeOffset = adjusted.totalDuration;
    }

    return {
        text: combinedText,
        alignments: allAlignments,
        totalDuration: timeOffset
    };
}

// Add pauses for punctuation
export function addPunctuationPauses(
    alignment: TextAlignment,
    pauseDuration: number = 200
): TextAlignment {
    const adjustedAlignments: AlignmentResult[] = [];
    let timeOffset = 0;

    for (const item of alignment.alignments) {
        const adjustedItem = {
            ...item,
            startTime: item.startTime + timeOffset,
            endTime: item.endTime + timeOffset
        };

        adjustedAlignments.push(adjustedItem);

        // Add pause after punctuation
        if (/[.!?।]/.test(item.word)) {
            timeOffset += pauseDuration;
        }
    }

    return {
        ...alignment,
        alignments: adjustedAlignments,
        totalDuration: alignment.totalDuration + timeOffset
    };
}

// Calculate alignment quality metrics
export function calculateAlignmentQuality(
    alignment: TextAlignment
): {
    averageConfidence: number;
    timeGaps: number[];
    averageGap: number;
    coverage: number;
} {
    if (alignment.alignments.length === 0) {
        return {
            averageConfidence: 0,
            timeGaps: [],
            averageGap: 0,
            coverage: 0
        };
    }

    // Calculate average confidence
    const avgConfidence = alignment.alignments.reduce(
        (sum, item) => sum + item.confidence, 0
    ) / alignment.alignments.length;

    // Calculate time gaps
    const gaps: number[] = [];
    for (let i = 1; i < alignment.alignments.length; i++) {
        const gap = alignment.alignments[i]!.startTime - alignment.alignments[i - 1]!.endTime;
        gaps.push(gap);
    }

    const avgGap = gaps.length > 0
        ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
        : 0;

    // Calculate coverage (how much of the text is aligned)
    const alignedText = alignment.alignments.map(item => item.word).join(" ");
    const coverage = alignedText.length / alignment.text.length;

    return {
        averageConfidence: avgConfidence,
        timeGaps: gaps,
        averageGap: avgGap,
        coverage
    };
}

// Optimize alignment based on actual audio duration
export function optimizeAlignment(
    alignment: TextAlignment,
    actualDuration: number
): TextAlignment {
    const scale = actualDuration / alignment.totalDuration;
    return adjustAlignmentTiming(alignment, scale);
}

// Test alignment functionality
export function testAlignment(): void {
    console.log("Testing text alignment...");

    const testText = "నమస్కారం తెలుగు భాషలో స్వాగతం";

    // Test duration-based alignment
    const durationAlign = alignByDuration(testText);
    console.log("Duration-based alignment:");
    console.log("  Duration:", durationAlign.totalDuration, "ms");
    console.log("  Words:", durationAlign.alignments.length);

    // Test phoneme-based alignment
    const phonemeAlign = alignByPhonemes(testText);
    console.log("Phoneme-based alignment:");
    console.log("  Duration:", phonemeAlign.totalDuration, "ms");
    console.log("  Words:", phonemeAlign.alignments.length);

    // Test uniform alignment
    const uniformAlign = alignUniformly(testText, 3000);
    console.log("Uniform alignment:");
    console.log("  Duration:", uniformAlign.totalDuration, "ms");
    console.log("  Words:", uniformAlign.alignments.length);

    // Test time queries
    const midTime = durationAlign.totalDuration / 2;
    const wordAtTime = getAlignmentAtTime(durationAlign, midTime);
    console.log("Word at middle time:", wordAtTime?.word || "none");

    // Test quality metrics
    const quality = calculateAlignmentQuality(durationAlign);
    console.log("Quality metrics:");
    console.log("  Average confidence:", quality.averageConfidence.toFixed(2));
    console.log("  Coverage:", (quality.coverage * 100).toFixed(1), "%");

    console.log("Alignment tests completed.");
}

// Run tests if this module is executed directly
if (typeof window !== "undefined" && window.location?.search?.includes("--test")) {
    testAlignment();
}
