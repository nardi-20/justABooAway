document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Variable Declarations & Selectors ---
    const gravestone = document.getElementById("gravestone");
    const ghostContainer = document.getElementById("ghost-container"); 
    const ghostVisContainer = document.getElementById("popup-content"); // Visibility container
    const ghostImg = document.getElementById("ghost"); // Image element
    const menu = document.getElementById("menu");

    gravestone.addEventListener("click", () => {
        ghostContainer.classList.remove("hidden");
        ghost.classList.add("shake", "glow", "float");

        setTimeout(() => {
            ghost.classList.remove("shake");
        }, 500);

        menu.classList.remove("hidden");
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

    // When you click the ghost in the popup, toggle the overlay ghost in the page
    ghost.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab) return;

            chrome.tabs.sendMessage(tab.id, { action: "toggleGhost" });
        });
    });
});