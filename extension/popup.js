document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Variable Declarations & Selectors ---
    const gravestone = document.getElementById("gravestone");
    const ghostContainer = document.getElementById("ghost-container");
    const ghostVisContainer = document.getElementById("popup-content"); // Visibility container
    const ghostImg = document.getElementById("ghost"); // Image element
    const menu = document.getElementById("menu");
    const ALL_MODAL_SELECTORS = ".mailbox-background, .dressing-background, .gifts-background, .haunt-background";
    const startHauntBtn = document.getElementById("start-haunt-btn");

    const pairCodeInput = document.getElementById("pair-code");
    const savePairCodeBtn = document.getElementById("save-code");

    // --- 2. New Haunt Function ---
    /**
     * This function makes the ghost get "scared" by the haunt.
     * IMPORTANT: You must copy "hgl042h.jpg" into your "icons/" folder.
     * A local path like "/Users/lillian..." will not work.
     */
    function getHaunted() {
        if (!ghostImg) return;

        // 1. Store the current image
        const originalSrc = ghostImg.src;

        // 2. Change to scary image & shake
        // Make sure "hgl042h.jpg" is inside your "icons" folder!
        ghostImg.src = "icons/hgl042h.jpg"; 
        ghostImg.classList.add("shake"); // Your CSS file already has .shake

        // 3. After the shake (0.5s from your CSS), remove class and revert image
        setTimeout(() => {
            ghostImg.classList.remove("shake");
            ghostImg.src = originalSrc; // Revert to what it was
        }, 500); // 0.5s = 500ms

        // 4. Clear the storage flag
        chrome.storage.local.set({ haunted: false }, () => {
            console.log("Haunt state cleared");
        });
    }

    // --- 2.5. Check for Haunt on Load ---
    // Check if we were haunted while the popup was closed
    chrome.storage.local.get("haunted", (result) => {
        if (result.haunted) {
            // We were haunted!
            getHaunted();
            // The getHaunted() function will clear the flag.
        }
    });

    // --- 3. Helper Functions for Modals ---
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


    // --- 4. Gravestone Toggle Logic ---
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

    // --- 5. Ghost Click Toggle ---
    if (ghostImg) {
        ghostImg.addEventListener("click", () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (!tab) return;

                chrome.tabs.sendMessage(tab.id, { action: "toggleGhost" });
            });
        });
    }


    // --- 6. Dressing Room / Ghost Outfit Logic ---  
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

    // --- 7. Menu Button Toggle Logic ---
    setupModalToggle("mailbox", "mailbox-modal");
    setupModalToggle("dressing", "dressing-modal");
    // "gifts" toggle is handled in section 9

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
            
            // 💡 UPDATED: Send message to background to broadcast the haunt
            // This tells your background.js script to send the haunt
            // to your paired friend.
            chrome.runtime.sendMessage({ action: "sendHaunt" }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Could not send haunt: ", chrome.runtime.lastError.message);
                    alert("Could not send haunt! Is the background service running?");
                } else {
                    console.log("Haunt message sent to background.");
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

    // --- 8. Playing sounds when hovering over menu options ---
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

    // --- 9. Gemini Gift Generation Logic ---
    const giftInput = document.getElementById("gift-input");
    const giftOutput = document.getElementById("gift-output");
    const generateButton = document.getElementById("generate-btn");
    const giftsBtn = document.getElementById('gifts');

    // Custom logic for opening the gifts modal
    if (giftsBtn) {
        giftsBtn.addEventListener('click', () => {
            openModal('gifts-modal');
            giftOutput.innerHTML = '';
            giftInput.value = '';
            chrome.storage.local.set({ giftStatus: "default", lastGift: "" });
        });
    }

    function displayGift(status, giftHtml) {
        if (!giftOutput) return; // Guard
        switch (status) {
            case "loading": giftOutput.textContent = "Summoning spooky magic..."; break;
            case "success": giftOutput.innerHTML = `<h4>✨ Gift Generated! ✨</h4><p>${giftHtml}</p>`; break;
            case "error": giftOutput.textContent = giftHtml; break;
            default: giftOutput.textContent = "Enter a prompt to generate a gift!";
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
            chrome.runtime.sendMessage({ action: "generateGift", prompt: fullPrompt });
            displayGift("loading");
        });
    }


    // --- 10. Pairing Code Logic ---
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
    
    // --- 11. Listen for Haunt from Background Script ---
    // This listens for the message from your background.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "receiveHaunt") {
            console.log("BOO! We've been haunted!");
            getHaunted();
        }
    });

});