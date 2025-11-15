document.addEventListener("DOMContentLoaded", () => {
    const gravestone = document.getElementById("gravestone");
    const ghostContainer = document.getElementById("ghost-container");
    const ghost = document.getElementById("ghost");
    const menu = document.getElementById("menu");

    gravestone.addEventListener("click", () => {
        const isGhostVisible = !ghostContainer.classList.contains("hidden");
        if (!isGhostVisible) {
            // WAKE UP
            if (typeof wake === 'function') {
                wake();
            }
        } else {
            // GO TO SLEEP
            if (typeof sleep === 'function') {
                sleep(); // Call the dedicated sleep function
            }
        }
    });

    // Menu button functionality

    // Mailbox
    document.getElementById("mailbox").addEventListener("click", () => {
        // TODO: open mailbox modal (implement real UI here)
        console.log("Mailbox opened");
        // TODO: show messages, pending mail, ghost delivery animation
    });

    // Dressing Station
    document.getElementById("dressing").addEventListener("click", () => {
        console.log("Dressing Station opened");
        // TODO: open ghost customization panel (hats, clothes, etc.)
    });

    // Mail Gifts
    document.getElementById("gifts").addEventListener("click", () => {
        console.log("Mail Gift clicked");
        // TODO: send gift animation or interaction
    });

    // Haunt
    document.getElementById("haunt").addEventListener("click", () => {
        console.log("Haunt clicked");
        // TODO: ghost chases mouse, scary messages, sound effects
    });
});
