// Function to save actions to Chrome Storage
const saveAction = (action) => {
    chrome.storage.local.get(['isRecording', 'recordedActions'], function(result) {
        if (!result.isRecording) return;

        let actions = result.recordedActions || [];
        actions.push(action);
        chrome.storage.local.set({ recordedActions: actions });
        console.log("Apprentice captured:", action);
    });
};

// 1. Capture Clicks (Buttons, Links, etc.)
document.addEventListener('click', (e) => {
    // We ignore clicks on input boxes because we want the TEXT from them later
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    saveAction({
        type: "click",
        element: e.target.tagName.toLowerCase(),
        text: e.target.innerText ? e.target.innerText.substring(0, 30) : "Button",
        time: new Date().toLocaleTimeString()
    });
});

// 2. Capture Typing (Forms, Search boxes, etc.)
document.addEventListener('change', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        saveAction({
            type: "input",
            element: e.target.tagName.toLowerCase(),
            text: e.target.value, // This grabs the actual words you typed!
            time: new Date().toLocaleTimeString()
        });
    }
});

// 3. Keep the Website Syncing (The Brain Bridge)
if (window.location.href.includes("clarityv1.github.io")) {
    setInterval(() => {
        chrome.storage.local.get(['recordedActions'], function(result) {
            if (result.recordedActions && result.recordedActions.length > 0) {
                window.postMessage({ type: "WORKLESS_TASK", payload: result.recordedActions }, "*");
            }
        });
    }, 2000);
}