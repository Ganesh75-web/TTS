// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function

export interface WavHeader {
    riffId: string;
    fileSize: number;
    waveId: string;
    fmtId: string;
    fmtSize: number;
    audioFormat: number;
    numChannels: number;
    sampleRate: number;
    byteRate: number;
    blockAlign: number;
    bitsPerSample: number;
    dataId: string;
    dataSize: number;
}

export interface AudioConfig {
    sampleRate: number;
    numChannels: number;
    bitsPerSample: number;
}

// Default audio configuration
export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
    sampleRate: 22050,
    numChannels: 1,
    bitsPerSample: 16
};

// Create WAV header
export function createWavHeader(dataSize: number, config: AudioConfig): WavHeader {
    const byteRate = config.sampleRate * config.numChannels * config.bitsPerSample / 8;
    const blockAlign = config.numChannels * config.bitsPerSample / 8;
    const fileSize = dataSize + 36; // 36 bytes for header

    return {
        riffId: "RIFF",
        fileSize,
        waveId: "WAVE",
        fmtId: "fmt ",
        fmtSize: 16,
        audioFormat: 1, // PCM
        numChannels: config.numChannels,
        sampleRate: config.sampleRate,
        byteRate,
        blockAlign,
        bitsPerSample: config.bitsPerSample,
        dataId: "data",
        dataSize
    };
}

// Convert WAV header to ArrayBuffer
export function headerToArrayBuffer(header: WavHeader): ArrayBuffer {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, header.riffId);
    view.setUint32(4, header.fileSize, true);
    writeString(view, 8, header.waveId);

    // fmt chunk
    writeString(view, 12, header.fmtId);
    view.setUint32(16, header.fmtSize, true);
    view.setUint16(20, header.audioFormat, true);
    view.setUint16(22, header.numChannels, true);
    view.setUint32(24, header.sampleRate, true);
    view.setUint32(28, header.byteRate, true);
    view.setUint16(32, header.blockAlign, true);
    view.setUint16(34, header.bitsPerSample, true);

    // data chunk
    writeString(view, 36, header.dataId);
    view.setUint32(40, header.dataSize, true);

    return buffer;
}

// Write string to DataView
function writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}

// Convert Float32Array to Int16Array
export function float32ToInt16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        // Clamp between -1 and 1, then scale to 16-bit range
        const sample = Math.max(-1, Math.min(1, float32[i]!));
        int16[i] = sample * 32767;
    }
    return int16;
}

// Encode PCM data to WAV format
export function encodeWav(pcmData: Float32Array, config: AudioConfig = DEFAULT_AUDIO_CONFIG): Blob {
    // Convert to 16-bit PCM
    const int16Data = float32ToInt16(pcmData);
    const dataSize = int16Data.length * 2; // 2 bytes per sample

    // Create header
    const header = createWavHeader(dataSize, config);
    const headerBuffer = headerToArrayBuffer(header);

    // Combine header and data
    const wavBuffer = new ArrayBuffer(headerBuffer.byteLength + dataSize);
    const wavView = new Uint8Array(wavBuffer);

    // Copy header
    wavView.set(new Uint8Array(headerBuffer), 0);

    // Copy PCM data
    const dataView = new DataView(wavBuffer, headerBuffer.byteLength);
    for (let i = 0; i < int16Data.length; i++) {
        dataView.setInt16(i * 2, int16Data[i]!, true);
    }

    return new Blob([wavBuffer], { type: "audio/wav" });
}

// Generate silence WAV
export function generateSilence(duration: number, config: AudioConfig = DEFAULT_AUDIO_CONFIG): Blob {
    const numSamples = Math.floor(duration * config.sampleRate);
    const silence = new Float32Array(numSamples);
    return encodeWav(silence, config);
}

// Mix multiple audio buffers
export function mixAudio(buffers: Float32Array[]): Float32Array {
    if (buffers.length === 0) return new Float32Array(0);
    if (buffers.length === 1) return buffers[0]!;

    const maxLength = Math.max(...buffers.map(b => b.length));
    const mixed = new Float32Array(maxLength);

    for (let i = 0; i < maxLength; i++) {
        let sum = 0;
        let count = 0;

        for (const buffer of buffers) {
            if (i < buffer.length) {
                sum += buffer[i]!;
                count++;
            }
        }

        // Average the samples to prevent clipping
        mixed[i] = count > 0 ? sum / count : 0;
    }

    return mixed;
}

// Apply simple fade in/out
export function applyFade(
    audio: Float32Array,
    fadeInDuration: number = 0.1,
    fadeOutDuration: number = 0.1,
    sampleRate: number = 22050
): Float32Array {
    const result = new Float32Array(audio.length);
    const fadeInSamples = Math.floor(fadeInDuration * sampleRate);
    const fadeOutSamples = Math.floor(fadeOutDuration * sampleRate);

    for (let i = 0; i < audio.length; i++) {
        let gain = 1.0;

        // Apply fade in
        if (i < fadeInSamples) {
            gain = i / fadeInSamples;
        }
        // Apply fade out
        else if (i >= audio.length - fadeOutSamples) {
            const fadeOutIndex = i - (audio.length - fadeOutSamples);
            gain = 1.0 - (fadeOutIndex / fadeOutSamples);
        }

        result[i] = audio[i]! * gain;
    }

    return result;
}

// Get audio duration from Float32Array
export function getAudioDuration(audio: Float32Array, sampleRate: number = 22050): number {
    return audio.length / sampleRate;
}

// Normalize audio levels
export function normalizeAudio(audio: Float32Array, targetLevel: number = 0.8): Float32Array {
    // Find peak level
    let peak = 0;
    for (const sample of audio) {
        peak = Math.max(peak, Math.abs(sample));
    }

    if (peak === 0) return audio; // Silence

    // Calculate gain
    const gain = targetLevel / peak;
    const result = new Float32Array(audio.length);

    for (let i = 0; i < audio.length; i++) {
        result[i] = audio[i]! * gain;
    }

    return result;
}

// Test WAV encoding functionality
export function testWavEncoding(): void {
    console.log("Testing WAV encoding...");

    // Generate a simple sine wave
    const sampleRate = 22050;
    const duration = 1; // 1 second
    const frequency = 440; // A4 note
    const samples = new Float32Array(sampleRate * duration);

    for (let i = 0; i < samples.length; i++) {
        const t = i / sampleRate;
        samples[i] = Math.sin(2 * Math.PI * frequency * t) * 0.5;
    }

    // Encode to WAV
    const wavBlob = encodeWav(samples);
    console.log("WAV blob size:", wavBlob.size, "bytes");

    // Test silence generation
    const silence = generateSilence(0.5);
    console.log("Silence blob size:", silence.size, "bytes");

    // Test mixing
    const mixed = mixAudio([samples, samples]);
    const mixedWav = encodeWav(mixed);
    console.log("Mixed WAV blob size:", mixedWav.size, "bytes");

    // Test fade
    const faded = applyFade(samples);
    const fadedWav = encodeWav(faded);
    console.log("Faded WAV blob size:", fadedWav.size, "bytes");

    console.log("WAV encoding tests completed.");
}

// Create audio context for playback
export function createAudioContext(): AudioContext {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
}

// Play WAV blob
export async function playWavBlob(blob: Blob): Promise<void> {
    const audioContext = createAudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return new Promise((resolve, reject) => {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        source.onended = () => {
            audioContext.close();
            resolve();
        };

        try {
            source.start();
        } catch (error) {
            audioContext.close();
            reject(error);
        }
    });
}

// Run tests if this module is executed directly
if (typeof window !== "undefined" && window.location?.search?.includes("--test")) {
    testWavEncoding();
}
