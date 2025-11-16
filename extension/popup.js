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
    
    // --- 5. Menu Button Toggle Logic (FIXED) ---
    // Now use the setupModalToggle function for all menu buttons
    setupModalToggle("mailbox", "mailbox-modal");
    setupModalToggle("dressing", "dressing-modal");
    setupModalToggle("gifts", "gifts-modal");
    setupModalToggle("haunt", "haunt-modal");

    // Close buttons
    document.querySelectorAll(".close-btn").forEach(btn => btn.addEventListener("click", closeAllModals));
    // --- 7. Gemini Gift Generation Logic ---
    const giftInput = document.getElementById("gift-input");
    const generateButton = document.getElementById("generate-btn");
    const giftOutput = document.getElementById("gift-output");

    // Helper to display the gift
    function displayGift(status, giftHtml) {
        switch (status) {
            case "loading":
                giftOutput.textContent = "Summoning spooky magic...";
                break;
            case "success":
                giftOutput.innerHTML = `<h4>✨ Gift Generated! ✨</h4><p>${giftHtml}</p>`;
                break;
            case "error":
                giftOutput.textContent = giftHtml; // Show the error message
                break;
            default:
                giftOutput.textContent = "Enter a prompt to generate a gift!";
        }
    }

    // --- ✨ NEW: CHECK STORAGE ON LOAD ---
    // When popup opens, immediately check storage for the last gift
    chrome.storage.local.get(["giftStatus", "lastGift"], (result) => {
        if (result.giftStatus) {
            displayGift(result.giftStatus, result.lastGift);
        } else {
            displayGift("default");
        }
    });

    // --- ✨ NEW: LISTEN FOR STORAGE CHANGES ---
    // Listen for the service worker to update the gift
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === "local" && changes.giftStatus) {
            // The gift has been updated! Get the latest data.
            chrome.storage.local.get(["giftStatus", "lastGift"], (result) => {
                displayGift(result.giftStatus, result.lastGift);
            });
        }
    });


    if (generateButton) {
        generateButton.addEventListener("click", () => {
            const userPrompt = giftInput.value.trim();
            if (!userPrompt) {
                giftOutput.textContent = "Please enter a prompt!";
                return;
            }

            // --- MODIFIED: We no longer need the complex callback ---
            // The 'loading' state will be set by the service worker
            // and caught by our new storage listener.

            const fullPrompt = `You are a friendly, slightly spooky ghost. Generate a creative gift based on this user request: "${userPrompt}". Keep the tone light and fun.`;

            // Send the request. We don't even need the response callback,
            // because our storage listener will handle it!
            chrome.runtime.sendMessage({
                action: "generateGift",
                prompt: fullPrompt
            });

            // --- OPTIONAL: Set a local loading state immediately ---
            // This makes the UI feel faster, before the service worker even responds.
            displayGift("loading");
        });
    }
    
});