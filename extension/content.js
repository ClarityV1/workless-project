let isRecording = false;
let recordedActions = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_RECORDING") {
        isRecording = true;
        recordedActions = [];
        console.log("Apprentice: Watching...");
    } else if (request.action === "STOP_RECORDING") {
        isRecording = false;
        
        // This is the "Shout" that the website is listening for
        window.dispatchEvent(new CustomEvent('WorkLessData', { 
            detail: recordedActions 
        }));

        sendResponse({ data: recordedActions });
    }
    return true;
});

document.addEventListener('click', (e) => {
    if (!isRecording) return;
    recordedActions.push({
        element: e.target.tagName.toLowerCase(),
        text: e.target.innerText || e.target.value || "Element",
        time: new Date().toLocaleTimeString()
    });
});