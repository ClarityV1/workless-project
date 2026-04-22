document.addEventListener('DOMContentLoaded', async function() {
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const statusText = document.getElementById('status');

    // 1. Check if the page is ALREADY recording when we open the popup
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    chrome.tabs.sendMessage(tab.id, {action: "GET_STATUS"}, (response) => {
        if (response && response.isRecording) {
            statusText.innerText = "Recording...";
        } else {
            statusText.innerText = "Ready...";
        }
    });

    startBtn.addEventListener('click', () => {
        chrome.tabs.sendMessage(tab.id, {action: "START_RECORDING"}, () => {
            statusText.innerText = "Recording...";
        });
    });

    stopBtn.addEventListener('click', () => {
        chrome.tabs.sendMessage(tab.id, {action: "STOP_RECORDING"}, (response) => {
            statusText.innerText = "Saved!";
        });
    });
});