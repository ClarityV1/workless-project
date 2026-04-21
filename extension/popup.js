document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const statusText = document.getElementById('status');

    startBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            // This tells the page to start watching your clicks
            chrome.tabs.sendMessage(tabs[0].id, {action: "START_RECORDING"});
            statusText.innerText = "🔴 Learning...";
        });
    });

    stopBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "STOP_RECORDING"}, (response) => {
                statusText.innerText = "✅ Task Saved!";
            });
        });
    });
});