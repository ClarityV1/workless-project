document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const statusText = document.getElementById('status');

    chrome.storage.local.get(['isRecording'], function(result) {
        if (result.isRecording) {
            statusText.innerText = "Recording...";
        } else {
            statusText.innerText = "Ready...";
        }
    });

    startBtn.addEventListener('click', () => {
        chrome.storage.local.set({ isRecording: true, recordedActions: [] }, () => {
            statusText.innerText = "Recording...";
        });
    });

    stopBtn.addEventListener('click', () => {
        chrome.storage.local.set({ isRecording: false }, () => {
            statusText.innerText = "Saved! Check your Brain site.";
        });
    });
});