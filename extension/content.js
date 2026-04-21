let isRecording = false;
let recordedActions = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_RECORDING") {
        isRecording = true;
        recordedActions = [];
        console.log("Apprentice: Watching...");
    } else if (request.action === "STOP_RECORDING") {
        isRecording = false;
        
        // This broadcasts the message to the whole browser
        window.postMessage({ 
            type: "WORKLESS_TASK", 
            payload: recordedActions 
        }, "*");

        sendResponse({ data: recordedActions });
    }
    return true;
});

document.addEventListener('click', (e) => {
    if (!isRecording) return;
    
    recordedActions.push({
        element: e.target.tagName.toLowerCase(),
        text: e.target.innerText || e.target.value || "Button",
        time: Date.now()
    });
});