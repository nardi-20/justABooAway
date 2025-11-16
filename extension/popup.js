document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Variable Declarations & Selectors ---
    const gravestone = document.getElementById("gravestone");
    const ghostContainer = document.getElementById("ghost-container");
    const ghostVisContainer = document.getElementById("popup-content"); // Visibility container
    const ghostImg = document.getElementById("ghost"); // Image element
    const menu = document.getElementById("menu");
    const ALL_MODAL_SELECTORS = ".mailbox-background, .dressing-background, .gifts-background, .haunt-background";
    const startHauntBtn = document.getElementById("start-haunt-btn");

    // ✨ Merged from second file
    const pairCodeInput = document.getElementById("pair-code");
    const savePairCodeBtn = document.getElementById("save-code");


    // --- 2. Helper Functions for Modals ---
    function closeAllModals() {
        document.querySelectorAll(ALL_MODAL_SELECTORS)
            .forEach(m => m.classList.add("hidden"));
    }

    function openModal(modalId) {
        closeAllModals();
        document.getElementById(modalId).classList.remove("hidden");
    }

    function setupModalToggle(buttonId, modalId) {
        const button = document.getElementById(buttonId);
        if (!button) return; // Guard against missing elements

        button.addEventListener("click", () => {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            const isAlreadyOpen = !modal.classList.contains("hidden");

            if (isAlreadyOpen) {
                modal.classList.add("hidden");
            } else {
                openModal(modalId);
            }
        });
    }


    // --- 3. Gravestone Toggle Logic ---
    if (gravestone) {
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
    }

    // --- 4. Ghost Click Toggle ---
    if (ghostImg) {
        ghostImg.addEventListener("click", () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (!tab) return;

                chrome.tabs.sendMessage(tab.id, { action: "toggleGhost" });
            });
        });
    }


    // --- 5. Dressing Room / Ghost Outfit Logic ---
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

    // --- 6. Menu Button Toggle Logic ---
    setupModalToggle("mailbox", "mailbox-modal");
    setupModalToggle("dressing", "dressing-modal");
    // NOTE: "gifts" toggle is now handled in section 8 to add custom logic
    // setupModalToggle("gifts", "gifts-modal"); // <-- This line was removed

    // Logic for the "Haunt" ICON (from the menu)
    const hauntButton = document.getElementById("haunt");
    if (hauntButton) {
        hauntButton.addEventListener("click", () => {
            const modal = document.getElementById("haunt-modal");
            if (!modal) return;

            const isAlreadyOpen = !modal.classList.contains("hidden");

            if (isAlreadyOpen) {
                // If modal is open, close it and reset ghost
                modal.classList.add("hidden");
                updateGhostImage(); // Reset the image
            } else {
                // If modal is closed, open it and show scary ghost
                openModal("haunt-modal");
                ghostImg.src = "icons/ghost+scary.png"; // Make ghost scary
            }
        });
    }

    // Logic for the "Start Haunting" BUTTON (inside the modal)
    if (startHauntBtn) {
        startHauntBtn.addEventListener("click", () => {
            // Send the message to the webpage to start haunting
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (tab) {
                    chrome.tabs.sendMessage(tab.id, { action: "startHaunting" });
                }
            });

            // Close the modal
            closeAllModals();
            // Note: We don't reset the image, so the icon stays scary
        });
    }

    // Close buttons (now reset the ghost image)
    document.querySelectorAll(".close-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            closeAllModals();
            updateGhostImage(); // Reset the ghost
        });
    });

    // --- 7. Playing sounds when hovering over menu options ---
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
        if (!btn) return; // Guard against missing elements

        btn.addEventListener("mouseenter", () => {
            sounds[id].currentTime = 0;
            sounds[id].play();
        });

        btn.addEventListener("mouseleave", () => {
            sounds[id].pause();
            sounds[id].currentTime = 0;
        });
    });

    // --- 8. Gemini Gift Generation Logic ---

    // Define elements first
    const giftInput = document.getElementById("gift-input");
    const generateButton = document.getElementById("generate-btn");
    const giftOutput = document.getElementById("gift-output");
    const giftsBtn = document.getElementById('gifts');
    
    // Custom logic for opening the gifts modal
    if (giftsBtn) {
        giftsBtn.addEventListener('click', () => {
            // Open the modal using the helper function
            openModal('gifts-modal');
    
            // Clear previous output
            giftOutput.innerHTML = '';
            giftInput.value = '';
    
            // Optionally also clear storage so it doesn't auto-repopulate
            chrome.storage.local.set({ giftStatus: "default", lastGift: "" });
        });
    }

    function displayGift(status, giftHtml) {
        if (!giftOutput) return; // Guard

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

    // Check storage for existing gift on load
    chrome.storage.local.get(["giftStatus", "lastGift"], (result) => {
        if (result.giftStatus) {
            displayGift(result.giftStatus, result.lastGift);
        } else {
            displayGift("default");
        }
    });

    // Listen for changes to the gift
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
                if (giftOutput) giftOutput.textContent = "Please enter a prompt!";
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


    // --- 9. Pairing Code Logic (Merged from second file) ---
    if (pairCodeInput && savePairCodeBtn) {

        // Prefill input with saved code
        chrome.storage.local.get(["pairCode"], (res) => {
            if (res.pairCode) {
                pairCodeInput.value = res.pairCode;
                console.log("[JustABooAway] Loaded stored pairCode:", res.pairCode);
            }
        });

        // Save code and tell the content script to reconnect
        savePairCodeBtn.addEventListener("click", () => {
            const code = pairCodeInput.value.trim();
            if (!code) {
                console.log("[JustABooAway] Empty code, not saving");
                return;
            }

            chrome.storage.local.set({ pairCode: code }, () => {
                console.log("[JustABooAway] Saved pairing code:", code);

                // Tell the active tab to reconnect with this new code
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (!tabs[0]) return;
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "setPairCode",
                        code,
                    });
                });
            });
        });
    }

});