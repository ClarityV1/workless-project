let isRecording = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_RECORDING") {
        isRecording = true;
        chrome.storage.local.set({ isRecording: true, recordedActions: [] });
        console.log("Apprentice: Recording started.");
    } 
    
    else if (request.action === "STOP_RECORDING") {
        isRecording = false;
        chrome.storage.local.set({ isRecording: false });
        console.log("Apprentice: Recording saved.");
    } 
    
    else if (request.action === "RUN_AUTOFILL") {
        chrome.storage.local.get(['recordedActions'], function(result) {
            const actions = result.recordedActions || [];
            console.log("Bot: Starting autofill with", actions.length, "steps");
            
            // Find all inputs on the current page
            const inputs = document.querySelectorAll('input, textarea');
            
            actions.forEach((action, index) => {
                // Filter only for input steps
                if (action.type === "input") {
                    setTimeout(() => {
                        // Find the input based on its order in the form
                        if (inputs[index]) {
                            inputs[index].value = action.text;
                            // Trigger events so the website knows the text changed
                            inputs[index].dispatchEvent(new Event('input', { bubbles: true }));
                            inputs[index].dispatchEvent(new Event('change', { bubbles: true }));
                            inputs[index].style.backgroundColor = "#e0f2fe"; // Flash blue when filled
                        }
                    }, index * 400); // 0.4 second delay between boxes
                }
            });
        });
    }
    return true;
});

// Capture Typing Data
document.addEventListener('change', (e) => {
    chrome.storage.local.get(['isRecording', 'recordedActions'], function(result) {
        if (!result.isRecording) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            let actions = result.recordedActions || [];
            actions.push({
                type: "input",
                element: e.target.tagName.toLowerCase(),
                text: e.target.value,
                time: new Date().toLocaleTimeString()
            });
            chrome.storage.local.set({ recordedActions: actions });
        }
    });
});

// Keep the Live Website Updated
if (window.location.href.includes("clarityv1.github.io")) {
    setInterval(() => {
        chrome.storage.local.get(['recordedActions'], function(result) {
            if (result.recordedActions) {
                window.postMessage({ type: "WORKLESS_TASK", payload: result.recordedActions }, "*");
            }
        });
    }, 2000);
}