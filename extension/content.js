console.log("WorkLess Apprentice: I am awake and watching.");

// This listens for your mouse clicks and identifies WHAT you clicked
document.addEventListener('click', (event) => {
    const element = event.target;
    
    // We capture the 'Path' to the button so we can find it again later
    const metadata = {
        tag: element.tagName,
        text: element.innerText || element.value,
        id: element.id,
        classes: element.className,
        timestamp: new Date().toLocaleTimeString()
    };

    console.log("Apprentice saw you click:", metadata);
    
    // Later, this will send the data to your 'Brain' website
});