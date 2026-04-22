let isRecording = false;
let recordedActions = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_STATUS") {
        // This tells the popup "Yes, I am still recording!"
        sendResponse({isRecording: isRecording});
    } else if (request.action === "START_RECORDING") {
        isRecording = true;
        recordedActions = [];
        sendResponse({status: "Started"});
    } else if (request.action === "STOP_RECORDING") {
        isRecording = false;
        window.postMessage({ type: "WORKLESS_TASK", payload: recordedActions }, "*");
        sendResponse({ data: recordedActions });
    }
    return true;
});

// ... keep the rest of your click listener code below this ...