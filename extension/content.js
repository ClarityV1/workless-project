chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_RECORDING") {
        isRecording = true;
        recordedActions = []; // Reset for new recording
        console.log("Apprentice: Starting to watch your clicks...");
        sendResponse({status: "started"});
    }
    // ... rest of your code
    return true; // This keeps the connection open
});