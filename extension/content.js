document.addEventListener('click', (e) => {
    chrome.storage.local.get(['isRecording', 'recordedActions'], function(result) {
        if (!result.isRecording) return;

        let actions = result.recordedActions || [];
        actions.push({
            element: e.target.tagName.toLowerCase(),
            text: e.target.innerText ? e.target.innerText.substring(0, 20) : "Click",
            time: new Date().toLocaleTimeString()
        });

        chrome.storage.local.set({ recordedActions: actions });
    });
});

if (window.location.href.includes("clarityv1.github.io")) {
    setInterval(() => {
        chrome.storage.local.get(['recordedActions'], function(result) {
            if (result.recordedActions && result.recordedActions.length > 0) {
                window.postMessage({ type: "WORKLESS_TASK", payload: result.recordedActions }, "*");
            }
        });
    }, 2000);
}