document.addEventListener('DOMContentLoaded', function() {
    const statusText = document.getElementById('status');

    chrome.storage.local.get(['isRecording'], (res) => {
        if (res.isRecording) statusText.innerText = "Recording...";
    });

    document.getElementById('start').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "START_RECORDING"});
            statusText.innerText = "Recording...";
        });
    });

    document.getElementById('stop').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "STOP_RECORDING"});
            statusText.innerText = "Saved!";
        });
    });

    document.getElementById('run').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "RUN_AUTOFILL"});
            statusText.innerText = "Bot Running...";
        });
    });
});