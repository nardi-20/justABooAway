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

    // --- 2. New Haunt Function (V2) ---
    function getHaunted() {
        if (!ghostImg) return;
        const originalSrc = ghostImg.src;
        ghostImg.src = "icons/hgl042h.jpg";
        ghostImg.classList.add("shake"); 

        setTimeout(() => {
            ghostImg.classList.remove("shake");
            ghostImg.src = originalSrc;
        }, 500); 

        chrome.storage.local.set({ haunted: false }, () => {
            console.log("Haunt state cleared");
        });
    }

    // --- 2.5. Check for Haunt on Load (V2) ---
    chrome.storage.local.get("haunted", (result) => {
        if (result.haunted) {
            getHaunted();
        }
    });

    // --- 3. Helper Functions for Modals ---
    function closeAllModals() {
        document.querySelectorAll(ALL_MODAL_SELECTORS)
            .forEach(m => {
                if (!m.classList.contains('ghost-container') && !m.id.includes('popup-content')) {
                    m.classList.add("hidden");
                }
            });
    }

    function openModal(modalId) {
        closeAllModals();
        document.getElementById(modalId).classList.remove("hidden");
    }

    function setupModalToggle(buttonId, modalId) {
        const button = document.getElementById(buttonId);
        if (!button) return; 

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
                if (typeof wake === 'function') {
                    wake(ghostVisContainer, ghostImg, menu);
                }
            } else {
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
                if (!tab) {
                    return;
                }
                chrome.tabs.sendMessage(tab.id, { action: "toggleGhost" });
            });
        });
    }


    // --- 6. Dressing Room / Ghost Outfit Logic (V1) ---  
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
            
            // Send to content script (from V1 logic)
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    if (type === "hat") {
                        chrome.tabs.sendMessage(tabs[0].id, { action: "setHat", hatId: currentHat });
                    }
                    if (type === "glasses") {
                        chrome.tabs.sendMessage(tabs[0].id, { action: "setGlasses", glassesId: currentGlasses });
                    }
                }
            });
        });
    });

    // --- 7. Menu Button Toggle Logic ---
    setupModalToggle("mailbox", "mailbox-modal");
    setupModalToggle("dressing", "dressing-modal");
    // "gifts" toggle is handled in section 9

    // Logic for the "Haunt" ICON (from V2)
    const hauntButton = document.getElementById("haunt");
    if (hauntButton) {
        hauntButton.addEventListener("click", () => {
            const modal = document.getElementById("haunt-modal");
            if (!modal) return;
            const isAlreadyOpen = !modal.classList.contains("hidden");
            if (isAlreadyOpen) {
                modal.classList.add("hidden");
                updateGhostImage(); // Reset the image
            } else {
                openModal("haunt-modal");
                ghostImg.src = "icons/ghost+scary.png"; 
            }
        });
    }

    // Logic for the "Start Haunting" BUTTON (from V2)
    if (startHauntBtn) {
        startHauntBtn.addEventListener("click", () => {
            // UPDATED (V2): Send message to background
            chrome.runtime.sendMessage({ action: "sendHaunt" }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Could not send haunt: ", chrome.runtime.lastError.message);
                    alert("Could not send haunt! Is the background service running?");
                } else {
                    console.log("Haunt message sent to background.");
                }
            });
            closeAllModals();
        });
    }

    // Close buttons (from V2, with reset)
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
        if (!btn) return; 

        btn.addEventListener("mouseenter", () => {
            sounds[id].currentTime = 0;
            sounds[id].play();
        });
        btn.addEventListener("mouseleave", () => {
            sounds[id].pause();
            sounds[id].currentTime = 0;
        });
    });

    // --- 9. Gemini Gift Generation Logic (V2) ---
    const giftInput = document.getElementById("gift-input");
    const giftOutput = document.getElementById("gift-output");
    const generateButton = document.getElementById("generate-btn");
    const giftsBtn = document.getElementById('gifts');

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
                if (giftOutput) giftOutput.textContent = "Please enter a prompt!";
                return;
            }
            const fullPrompt = `You are a friendly, slightly spooky ghost. Generate a creative gift based on this user request: "${userPrompt}". Keep the tone light and fun.`;
            chrome.runtime.sendMessage({ action: "generateGift", prompt: fullPrompt });
            displayGift("loading");
        });
    }


    // --- 10. Pairing Code Logic (V2) ---
    if (pairCodeInput && savePairCodeBtn) {
        chrome.storage.local.get(["pairCode"], (res) => {
            if (res.pairCode) {
                pairCodeInput.value = res.pairCode;
            }
        })
        savePairCodeBtn.addEventListener("click", () => {
            const code = pairCodeInput.value.trim();
            if (!code) return;
            chrome.storage.local.set({ pairCode: code }, () => {
                console.log("[JustABooAway] Saved pairing code:", code);
                // Send to content script to re-initiate WebSocket
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0] && tabs[0].id) {
                         chrome.tabs.sendMessage(tabs[0].id, {
                            action: "setPairCode",
                            code: code
                        });
                    }
                });
            });
        });
    };

    // --- 11. Listen for Haunt from Background Script (V2) ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "receiveHaunt") {
            console.log("BOO! We've been haunted!");
            getHaunted();
        }
        // NOTE: The V2 simple chat does NOT listen for 'receiveMessage'
        // This is intentional per your request for the "new chat/mailbox"
    });

    // --- 12. Messaging (SIMPLE V2) ---
    const chatInput = document.getElementById("modal-chat-input");
    const sendBtn = document.getElementById("modal-send-btn");

    if (sendBtn && chatInput) {
        sendBtn.addEventListener("click", () => {
            const text = chatInput.value.trim();
            if (!text) return;

            chatInput.value = "";

            // Send to active tab → content.js → WebSocket → partner
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (!tab) return;

                chrome.tabs.sendMessage(tab.id, {
                    action: "sendChat", // content.js listens for this
                    text,
                });
            });
        });
    }
});