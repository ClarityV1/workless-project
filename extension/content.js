let isRecording = false;
let recordedActions = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_RECORDING") {
        isRecording = true;
        recordedActions = [];
        console.log("Apprentice: Watching...");
        sendResponse({status: "Started"});
    } else if (request.action === "STOP_RECORDING") {
        isRecording = false;
        console.log("Apprentice: Sending data to Brain...", recordedActions);
        
        // This is the broadcast
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
        text: e.target.innerText.substring(0, 20) || e.target.value || "Click",
        time: new Date().toLocaleTimeString()
    });
});