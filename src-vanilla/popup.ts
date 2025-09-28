// VIBE: MV3, no eval, CSP compliant, ≤15 lines per function

import {
    ReadRequest,
    ControlMessage,
    ProgressMessage,
    StatusMessage,
    ModelStatus
} from './types/common';
import { broadcastStatus } from './utils/messaging';

let popupIsPlaying = false;
let hasProModels = false;

// DOM elements
const playBtn = document.getElementById("playBtn") as HTMLButtonElement;
const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
const statusText = document.getElementById("statusText") as HTMLDivElement;
const progressFill = document.getElementById("progressFill") as HTMLDivElement;
const proMode = document.getElementById("proMode") as HTMLInputElement;
const wordHighlight = document.getElementById("wordHighlight") as HTMLInputElement;
const downloadSection = document.getElementById("downloadSection") as HTMLDivElement;
const downloadBtn = document.getElementById("downloadBtn") as HTMLButtonElement;
const downloadProgress = document.getElementById("downloadProgress") as HTMLDivElement;
const downloadFill = document.getElementById("downloadFill") as HTMLDivElement;
const downloadText = document.getElementById("downloadText") as HTMLSpanElement;

// Initialize popup
async function init() {
    setupEventListeners();
    await checkModelStatus();
    await getCurrentTabStatus();
}

async function checkModelStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ type: "model/status" });
        if (response) {
            updateModelStatus(response);
        }
    } catch {
        // Service worker not ready
    }
}

function setupEventListeners() {
    playBtn.addEventListener("click", handlePlay);
    pauseBtn.addEventListener("click", handlePause);
    stopBtn.addEventListener("click", handleStop);
    proMode.addEventListener("change", handleProModeChange);
    downloadBtn.addEventListener("click", handleDownload);

    chrome.runtime.onMessage.addListener(handleMessage);
}

async function handlePlay() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const selection = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() || ""
    });

    const text = selection[0]?.result || "";
    if (!text.trim()) {
        updateStatus("Please select text to read");
        return;
    }

    const message: ReadRequest = {
        type: "read/start",
        text,
        useProVoice: proMode.checked,
        highlightWords: wordHighlight.checked
    };

    chrome.runtime.sendMessage(message);
    updateStatus("Preparing...");
}

function handlePause() {
    const message: ControlMessage = { type: "control/pause" };
    chrome.runtime.sendMessage(message);
}

function handleStop() {
    const message: ControlMessage = { type: "control/stop" };
    chrome.runtime.sendMessage(message);
}

function handleProModeChange() {
    if (proMode.checked && !hasProModels) {
        downloadSection.classList.remove("hidden");
    } else {
        downloadSection.classList.add("hidden");
    }
}

function handleDownload() {
    chrome.runtime.sendMessage({ type: "model/download" });
    downloadBtn.disabled = true;
    downloadProgress.classList.remove("hidden");
}

function handleMessage(
    msg: ProgressMessage | StatusMessage | ModelStatus,
    _sender: chrome.runtime.MessageSender,
    _sendResponse: (response: any) => void
) {
    switch (msg.type) {
        case "progress/update":
            updateProgress(msg.current, msg.total, msg.isPlaying);
            break;
        case "status/update":
            updateStatus(msg.status, msg.error);
            break;
        case "model/status":
            updateModelStatus(msg);
            break;
    }
}

function updateProgress(current: number, total: number, isPlayingState: boolean) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    progressFill.style.width = `${percentage}%`;
    popupIsPlaying = isPlayingState;

    playBtn.disabled = popupIsPlaying;
    pauseBtn.disabled = !popupIsPlaying;
}

function updateStatus(status: string, error?: string) {
    broadcastStatus(status, error);
    statusText.textContent = error ? `Error: ${error}` : status;
    if (error) {
        statusText.classList.add("error");
    } else {
        statusText.classList.remove("error");
    }
}

function updateModelStatus(status: ModelStatus) {
    hasProModels = status.hasModels;

    if (status.downloading && status.progress !== undefined) {
        downloadFill.style.width = `${status.progress}%`;
        downloadText.textContent = `${Math.round(status.progress)}%`;
        proMode.disabled = true;
    } else {
        proMode.disabled = false;
        downloadBtn.disabled = false;
        downloadProgress.classList.add("hidden");
    }

    if (hasProModels) {
        downloadSection.classList.add("hidden");
        proMode.checked = true;
    } else if (proMode.checked) {
        downloadSection.classList.remove("hidden");
    }
}

async function getCurrentTabStatus() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "content/status" });
        if (response?.isPlaying) {
            updateStatus("Playing...");
            playBtn.disabled = true;
            pauseBtn.disabled = false;
            popupIsPlaying = true;
        }
    } catch {
        // Content script not ready
    }
}

// Initialize when popup loads
document.addEventListener("DOMContentLoaded", init);
