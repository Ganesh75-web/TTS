// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function

import { StorageConfig, ModelInfo, CacheEntry, Token } from '../types/common';
import { STORAGE_KEYS, DEFAULT_STORAGE_CONFIG, CACHE_CONFIG } from '../constants/storage';

// Get configuration from storage
export async function getConfig(): Promise<StorageConfig> {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEYS.CONFIG]);
        return result[STORAGE_KEYS.CONFIG] || DEFAULT_STORAGE_CONFIG;
    } catch (error) {
        console.warn("Failed to get config from storage:", error);
        return DEFAULT_STORAGE_CONFIG;
    }
}

// Save configuration to storage
export async function saveConfig(config: Partial<StorageConfig>): Promise<void> {
    try {
        const current = await getConfig();
        const updated = { ...current, ...config };
        await chrome.storage.local.set({ [STORAGE_KEYS.CONFIG]: updated });
    } catch (error) {
        console.error("Failed to save config to storage:", error);
    }
}

// Get model information from storage
export async function getModelInfo(): Promise<ModelInfo> {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEYS.MODELS]);
        return result[STORAGE_KEYS.MODELS] || {
            hasModels: false,
            modelVersion: "",
            downloadDate: null,
            sizeBytes: 0
        };
    } catch (error) {
        console.warn("Failed to get model info from storage:", error);
        return {
            hasModels: false,
            modelVersion: "",
            downloadDate: null,
            sizeBytes: 0
        };
    }
}

// Save model information to storage
export async function saveModelInfo(info: Partial<ModelInfo>): Promise<void> {
    try {
        const current = await getModelInfo();
        const updated = { ...current, ...info };
        await chrome.storage.local.set({ [STORAGE_KEYS.MODELS]: updated });
    } catch (error) {
        console.error("Failed to save model info to storage:", error);
    }
}

// Get text cleanup cache
export async function getCacheEntry(text: string): Promise<CacheEntry | null> {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEYS.CACHE]);
        const cache: CacheEntry[] = result[STORAGE_KEYS.CACHE] || [];

        // Find matching entry (simple text match for now)
        const entry = cache.find(e => e.text === text);

        if (entry) {
            // Check if cache entry is not too old
            const now = Date.now();

            if (now - entry.timestamp < CACHE_CONFIG.MAX_AGE_MS) {
                return entry;
            }
        }

        return null;
    } catch (error) {
        console.warn("Failed to get cache entry:", error);
        return null;
    }
}

// Save text cleanup cache
export async function saveCacheEntry(entry: CacheEntry): Promise<void> {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEYS.CACHE]);
        let cache: CacheEntry[] = result[STORAGE_KEYS.CACHE] || [];

        // Remove existing entry with same text
        cache = cache.filter(e => e.text !== entry.text);

        // Add new entry
        cache.push(entry);

        // Limit cache size
        if (cache.length > CACHE_CONFIG.MAX_ENTRIES) {
            cache = cache.slice(-CACHE_CONFIG.MAX_ENTRIES);
        }

        await chrome.storage.local.set({ [STORAGE_KEYS.CACHE]: cache });
    } catch (error) {
        console.error("Failed to save cache entry:", error);
    }
}

// Clear cache
export async function clearCache(): Promise<void> {
    try {
        await chrome.storage.local.remove([STORAGE_KEYS.CACHE]);
    } catch (error) {
        console.error("Failed to clear cache:", error);
    }
}

// Get download status
export async function getDownloadStatus(): Promise<{
    downloading: boolean;
    progress: number;
}> {
    try {
        const result = await chrome.storage.local.get([
            STORAGE_KEYS.DOWNLOADING,
            STORAGE_KEYS.DOWNLOAD_PROGRESS
        ]);

        return {
            downloading: result[STORAGE_KEYS.DOWNLOADING] || false,
            progress: result[STORAGE_KEYS.DOWNLOAD_PROGRESS] || 0
        };
    } catch (error) {
        console.warn("Failed to get download status:", error);
        return { downloading: false, progress: 0 };
    }
}

// Set download status
export async function setDownloadStatus(
    downloading: boolean,
    progress: number = 0
): Promise<void> {
    try {
        await chrome.storage.local.set({
            [STORAGE_KEYS.DOWNLOADING]: downloading,
            [STORAGE_KEYS.DOWNLOAD_PROGRESS]: progress
        });
    } catch (error) {
        console.error("Failed to set download status:", error);
    }
}

// Clear all storage data
export async function clearAllData(): Promise<void> {
    try {
        await chrome.storage.local.remove([
            STORAGE_KEYS.CONFIG,
            STORAGE_KEYS.MODELS,
            STORAGE_KEYS.CACHE,
            STORAGE_KEYS.DOWNLOADING,
            STORAGE_KEYS.DOWNLOAD_PROGRESS
        ]);
    } catch (error) {
        console.error("Failed to clear all data:", error);
    }
}

// Get storage usage info
export async function getStorageInfo(): Promise<{
    usedBytes: number;
    totalBytes: number;
    quotaBytes: number;
}> {
    try {
        if (chrome.storage && chrome.storage.local) {
            const info = await chrome.storage.local.getBytesInUse();
            const quotaBytes = (chrome.storage.local as any).QUOTA_BYTES_PER_ITEM as number || 0;
            return {
                usedBytes: info,
                totalBytes: info,
                quotaBytes
            };
        }
        return { usedBytes: 0, totalBytes: 0, quotaBytes: 0 };
    } catch (error) {
        console.warn("Failed to get storage info:", error);
        return { usedBytes: 0, totalBytes: 0, quotaBytes: 0 };
    }
}

// Test storage functionality
export async function testStorage(): Promise<void> {
    console.log("Testing storage functionality...");

    // Test config
    await saveConfig({ highlightWords: false });
    const config = await getConfig();
    console.log("Config test:", config.highlightWords === false ? "PASS" : "FAIL");

    // Test cache
    const testEntry: CacheEntry = {
        text: "test",
        cleanedText: "test cleaned",
        tokens: [{ text: "test", startChar: 0, endChar: 4 }],
        timestamp: Date.now()
    };

    await saveCacheEntry(testEntry);
    const cached = await getCacheEntry("test");
    console.log("Cache test:", cached?.cleanedText === "test cleaned" ? "PASS" : "FAIL");

    // Cleanup
    await clearCache();
    await saveConfig({ highlightWords: true });
}

// Run tests if this module is executed directly
if (typeof process !== "undefined" && process.argv?.includes("--test")) {
    testStorage();
}
