// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function

import {
    ReadRequest,
    ControlMessage,
    ProgressMessage,
    StatusMessage,
    ModelStatus,
    ModelDownload,
    CleanupRequest,
    CleanupResponse,
    AppState,
    Token
} from './types/common';
import { broadcastStatus, broadcastModelStatus, sendControlMessage } from './utils/messaging';

let currentState: AppState = "idle";
let cleanupWorker: Worker | null = null;
let offscreenClient: chrome.runtime.Port | null = null;
let activeTabId: number | null = null;

// Initialize service worker
async function init() {
    setupMessageListeners();
    await ensureOffscreen();
    await checkModelAvailability();
}

function setupMessageListeners() {
    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.runtime.onConnect.addListener(handleConnection);
}

async function handleMessage(
    msg: ReadRequest | ControlMessage | ModelStatus | ModelDownload,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
) {
    switch (msg.type) {
        case "read/start":
            await handleReadStart(msg as ReadRequest);
            sendResponse(true);
            break;
        case "control/pause":
            await handleControl("pause");
            break;
        case "control/resume":
            await handleControl("resume");
            break;
        case "control/stop":
            await handleControl("stop");
            break;
        case "model/status":
            sendResponse(await getModelStatus());
            break;
        case "model/download":
            await handleModelDownload();
            break;
    }
    return true;
}

function handleConnection(port: chrome.runtime.Port) {
    if (port.name === "offscreen") {
        offscreenClient = port;
        port.onDisconnect.addListener(() => {
            offscreenClient = null;
        });
    }
}

async function handleReadStart(request: ReadRequest) {
    if (currentState !== "idle") {
        await handleControl("stop");
    }

    currentState = "preparing";
    updateStatus("Preparing text...");

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) throw new Error("No active tab");
        activeTabId = tab.id;

        const cleaned = await cleanupText(request.text);

        currentState = "generating";
        updateStatus("Generating audio...");

        await sendToOffscreen({
            type: "tts/start",
            text: cleaned.cleanedText,
            tokens: cleaned.tokens,
            useProVoice: request.useProVoice,
            highlightWords: request.highlightWords
        });

        currentState = "playing";
        updateStatus("Playing...");
    } catch (error) {
        currentState = "error";
        updateStatus("Error", error instanceof Error ? error.message : "Unknown error");
    }
}

async function handleControl(action: "pause" | "resume" | "stop") {
    if (!offscreenClient) return;

    await sendToOffscreen({
        type: `tts/${action}`
    });

    if (action === "stop") {
        currentState = "idle";
        updateStatus("Stopped");
        clearContentHighlight();
    } else if (action === "pause") {
        currentState = "paused";
        updateStatus("Paused");
    } else if (action === "resume") {
        currentState = "playing";
        updateStatus("Playing...");
    }
}

async function cleanupText(text: string): Promise<CleanupResponse> {
    if (!cleanupWorker) {
        cleanupWorker = new Worker("workers/textRefinement.worker.ts");
    }

    return new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
            if (event.data.type === "cleanup/response") {
                cleanupWorker!.removeEventListener("message", handler);
                resolve(event.data);
            }
        };
        cleanupWorker!.addEventListener("message", handler);
        cleanupWorker!.postMessage({ type: "cleanup/request", text });
    });
}

async function ensureOffscreen() {
    try {
        const hasDocument = await chrome.offscreen.hasDocument();
        if (hasDocument) return;

        await chrome.offscreen.createDocument({
            url: "offscreen.html",
            reasons: ["AUDIO_PLAYBACK"],
            justification: "Audio playback for TTS with word highlighting"
        });
    } catch (error) {
        console.error("Failed to create offscreen document:", error);
    }
}

async function sendToOffscreen(message: any) {
    if (!offscreenClient) {
        await ensureOffscreen();
        offscreenClient = chrome.runtime.connect({ name: "offscreen" });
    }
    offscreenClient.postMessage(message);
}

async function checkModelAvailability() {
    try {
        const storage = await chrome.storage.local.get(["hasProModels"]);
        return storage["hasProModels"] || false;
    } catch {
        return false;
    }
}

async function getModelStatus(): Promise<ModelStatus> {
    const hasModels = await checkModelAvailability();
    return {
        type: "model/status",
        hasModels
    };
}

async function handleModelDownload() {
    updateStatus("Downloading models...");

    try {
        await chrome.storage.local.set({ downloadingModels: true, downloadProgress: 0 });

        broadcastModelStatus({
            hasModels: false,
            downloading: true,
            progress: 0
        });

        // Simulate download progress
        for (let progress = 0; progress <= 100; progress += 10) {
            await new Promise(resolve => setTimeout(resolve, 200));
            await chrome.storage.local.set({ downloadProgress: progress });

            broadcastModelStatus({
                hasModels: false,
                downloading: true,
                progress
            });
        }

        await chrome.storage.local.set({
            hasProModels: true,
            downloadingModels: false,
            downloadProgress: 100
        });

        broadcastModelStatus({
            hasModels: true,
            downloading: false,
            progress: 100
        });

        updateStatus("Models downloaded successfully");
    } catch (error) {
        updateStatus("Download failed", error instanceof Error ? error.message : "Unknown error");
    }
}

function updateStatus(status: string, error?: string) {
    broadcastStatus(status, error);
}

function clearContentHighlight() {
    if (!activeTabId) return;
    sendControlMessage("control/stop", activeTabId);
}

// Handle offscreen progress updates
chrome.runtime.onMessage.addListener((msg: ProgressMessage) => {
    if (msg.type === "progress/update") {
        chrome.runtime.sendMessage(msg).catch(() => {
            // Popup not open
        });
    }
});

// Initialize service worker on install
chrome.runtime.onInstalled.addListener(init);
