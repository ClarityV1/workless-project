document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const runBtn = document.getElementById('run');
    const statusText = document.getElementById('status');

    // Check current status when popup opens
    chrome.storage.local.get(['isRecording'], (result) => {
        if (result.isRecording) statusText.innerText = "Recording...";
    });

    startBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "START_RECORDING"});
            statusText.innerText = "Recording...";
        });
    });

    stopBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "STOP_RECORDING"});
            statusText.innerText = "Saved to Brain!";
        });
    });

    runBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "RUN_AUTOFILL"});
            statusText.innerText = "Bot Running...";
        });
    });
});