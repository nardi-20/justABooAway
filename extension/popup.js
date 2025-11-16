document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Variable Declarations & Selectors ---
    const gravestone = document.getElementById("gravestone");
    const ghostContainer = document.getElementById("ghost-container"); 
    const ghostVisContainer = document.getElementById("popup-content"); // Visibility container
    const ghostImg = document.getElementById("ghost"); // Image element
    const menu = document.getElementById("menu");
    const ALL_MODAL_SELECTORS = ".mailbox-background, .dressing-background, .gifts-background, .haunt-background";


    // --- 2. Helper Functions for Modals ---
    // (Your code - preserved)
    function closeAllModals() {
        document.querySelectorAll(ALL_MODAL_SELECTORS)
            .forEach(m => m.classList.add("hidden"));
    }

    function openModal(modalId) {
        closeAllModals(); 
        document.getElementById(modalId).classList.remove("hidden");
    }

    function setupModalToggle(buttonId, modalId) {
        document.getElementById(buttonId).addEventListener("click", () => {
            const modal = document.getElementById(modalId);
            const isAlreadyOpen = !modal.classList.contains("hidden"); 

            if (isAlreadyOpen) {
                modal.classList.add("hidden");
            } else {
                openModal(modalId);
            }
        });
    }


    // --- 3. Gravestone Toggle Logic (FIXED) ---
    // (This is YOUR original logic, rejecting the incoming changes)
    gravestone.addEventListener("click", () => {
        const isGhostVisible = !ghostVisContainer.classList.contains("hidden");
        if (!isGhostVisible) {
            // WAKE UP
            if (typeof wake === 'function') {
                wake(ghostVisContainer, ghostImg, menu);
            }
        } else {
            // GO TO SLEEP
            if (typeof sleep === 'function') {
                sleep(ghostVisContainer, menu);
            }
        }
    });

    // --- ✨ NEW: Ghost Click Toggle (from incoming changes) ---
    // We are keeping this one new feature.
    ghostImg.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab) return;

            chrome.tabs.sendMessage(tab.id, { action: "toggleGhost" });
        });
    });


    // --- 4. Dressing Room / Ghost Outfit Logic ---
    // (Your code - preserved)
    let currentHat = null;
    let currentGlasses = null;

    function updateGhostImage() {
        let parts = ["ghost"];

        if (currentHat) parts.push(currentHat);
        if (currentGlasses) parts.push(currentGlasses);

        ghostImg.src = "icons/" + parts.join("+") + ".png";
    }

    document.querySelectorAll(".dress-item").forEach(button => {
        button.addEventListener("click", () => {
            const type = button.dataset.type;
            const id = button.dataset.id;

            if (type === "hat") {
                currentHat = (currentHat === id ? null : id);
            }
            if (type === "glasses") {
                currentGlasses = (currentGlasses === id ? null : id);
            }
            updateGhostImage();
        });
    });
    
    // --- 5. Menu Button Toggle Logic (FIXED) ---
    // (This is YOUR code. We are keeping it and discarding the incoming 'console.log's)
    setupModalToggle("mailbox", "mailbox-modal");
    setupModalToggle("dressing", "dressing-modal");
    setupModalToggle("gifts", "gifts-modal");
    setupModalToggle("haunt", "haunt-modal");

    // Close buttons
    document.querySelectorAll(".close-btn").forEach(btn => btn.addEventListener("click", closeAllModals));

    // --- 6. Playing sounds when hovering over menu options ---
    // (Your code - preserved)
    const sounds = {
        mailbox: new Audio("sounds/mail.mp3"),
        dressing: new Audio("sounds/dresser.mp3"),
        gifts: new Audio("sounds/gift.mp3"),
        haunt: new Audio("sounds/haunt.mp3"),
        gravestone: new Audio("sounds/gravestone.mp3"), 
        ghost: new Audio("sounds/ghost.mp3")
    };

    Object.keys(sounds).forEach(id => {
        const btn = document.getElementById(id);

        btn.addEventListener("mouseenter", () => {
            sounds[id].currentTime = 0; 
            sounds[id].play();
        });

        btn.addEventListener("mouseleave", () => {
            sounds[id].pause();
            sounds[id].currentTime = 0; 
        });
    });

    // --- 7. Gemini Gift Generation Logic ---
    // (Your code - preserved)
    const giftInput = document.getElementById("gift-input");
    const generateButton = document.getElementById("generate-btn");
    const giftOutput = document.getElementById("gift-output");

    function displayGift(status, giftHtml) {
        switch (status) {
            case "loading":
                giftOutput.textContent = "Summoning spooky magic...";
                break;
            case "success":
                giftOutput.innerHTML = `<h4>✨ Gift Generated! ✨</h4><p>${giftHtml}</p>`;
                break;
            case "error":
                giftOutput.textContent = giftHtml; 
                break;
            default:
                giftOutput.textContent = "Enter a prompt to generate a gift!";
        }
    }

    chrome.storage.local.get(["giftStatus", "lastGift"], (result) => {
        if (result.giftStatus) {
            displayGift(result.giftStatus, result.lastGift);
        } else {
            displayGift("default");
        }
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === "local" && changes.giftStatus) {
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

            const fullPrompt = `You are a friendly, slightly spooky ghost. Generate a creative gift based on this user request: "${userPrompt}". Keep the tone light and fun.`;

            chrome.runtime.sendMessage({
                action: "generateGift",
                prompt: fullPrompt
            });

            displayGift("loading");
        });
    }
    
});