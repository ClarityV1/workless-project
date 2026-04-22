let isRecording = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_RECORDING") {
        isRecording = true;
        chrome.storage.local.set({ isRecording: true, recordedActions: [] });
    } else if (request.action === "STOP_RECORDING") {
        isRecording = false;
        chrome.storage.local.set({ isRecording: false });
    } else if (request.action === "RUN_AUTOFILL") {
        chrome.storage.local.get(['recordedActions'], function(result) {
            const actions = result.recordedActions || [];
            const inputs = document.querySelectorAll('input, textarea');
            actions.forEach((action, index) => {
                if (action.type === "input" && inputs[index]) {
                    setTimeout(() => {
                        inputs[index].value = action.text;
                        inputs[index].dispatchEvent(new Event('input', { bubbles: true }));
                        inputs[index].dispatchEvent(new Event('change', { bubbles: true }));
                        inputs[index].style.backgroundColor = "#dcfce7";
                    }, index * 400);
                }
            });
        });
    }
    return true;
});

document.addEventListener('change', (e) => {
    chrome.storage.local.get(['isRecording', 'recordedActions'], function(result) {
        if (!result.isRecording) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            let actions = result.recordedActions || [];
            actions.push({
                type: "input",
                element: e.target.tagName.toLowerCase(),
                text: e.target.value
            });
            chrome.storage.local.set({ recordedActions: actions });
        }
    });
});

// The Bridge to the Website
setInterval(() => {
    if (window.location.href.includes("clarityv1.github.io")) {
        chrome.storage.local.get(['recordedActions'], function(result) {
            if (result.recordedActions) {
                window.postMessage({ type: "WORKLESS_TASK", payload: result.recordedActions }, "*");
            }
        });
    }
}, 1000);