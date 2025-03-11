document.addEventListener("DOMContentLoaded", () => {
    if (!webui) return console.error("WebUI not loaded.");    
    if (webui.isConnected()) {
        ready();
    } else {
        webui.setEventCallback(e => {
            if (e === webui.event.CONNECTED) {
                ready();
            }
        });
    }
});

