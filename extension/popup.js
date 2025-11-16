document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Variable Declarations & Selectors ---
    const gravestone       = document.getElementById("gravestone");
    const ghostContainer   = document.getElementById("ghost-container");
    const ghostVisContainer = document.getElementById("popup-content");
    const ghostImg         = document.getElementById("ghost");
    const menu             = document.getElementById("menu");
    const ALL_MODAL_SELECTORS =
        ".mailbox-background, .dressing-background, .gifts-background, .haunt-background";
    const startHauntBtn    = document.getElementById("start-haunt-btn");

    const pairCodeInput    = document.getElementById("pair-code");
    const savePairCodeBtn  = document.getElementById("save-code");

    // --- 2. Haunt visual (popup ghost gets scared) ---
    // This is the haunt feature you wanted to preserve
    function getHaunted() {
        if (!ghostImg) return;

        const originalSrc = ghostImg.src;
        ghostImg.src = "icons/hgl042h.jpg"; // Haunt image
        ghostImg.classList.add("shake");

        setTimeout(() => {
            ghostImg.classList.remove("shake");
            ghostImg.src = originalSrc;
        }, 500);

        chrome.storage.local.set({ haunted: false }, () => {
            console.log("Haunt state cleared");
        });
    }

    // Check if we were haunted while popup was closed
    chrome.storage.local.get("haunted", (result) => {
        if (result.haunted) {
            getHaunted();
        }
    });

    // --- 3. Helper functions for modals ---
    function closeAllModals() {
        document.querySelectorAll(ALL_MODAL_SELECTORS).forEach(m => {
            if (!m.classList.contains("ghost-container") &&
                !m.id.includes("popup-content")) {
                m.classList.add("hidden");
            }
        });
    }

    function openModal(modalId) {
        closeAllModals();
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove("hidden");
    }

    function setupModalToggle(buttonId, modalId) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        button.addEventListener("click", () => {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            const isOpen = !modal.classList.contains("hidden");
            if (isOpen) {
                modal.classList.add("hidden");
            } else {
                openModal(modalId);
            }
        });
    }

    // --- 4. Gravestone wake/sleep logic (popup ghost only) ---
    // Prioritizing file code
    if (gravestone) {
        gravestone.addEventListener("click", () => {
            const isGhostVisible =
                ghostVisContainer && !ghostVisContainer.classList.contains("hidden");

            if (!isGhostVisible) {
                // WAKE
                if (typeof wake === "function") {
                    wake(ghostVisContainer, ghostImg, menu);
                } else if (ghostVisContainer) {
                    ghostVisContainer.classList.remove("hidden");
                    if (menu) menu.classList.remove("hidden");
                }
            } else {
                // SLEEP
                if (typeof sleep === "function") {
                    sleep(ghostVisContainer, menu);
                } else if (ghostVisContainer) {
                    ghostVisContainer.classList.add("hidden");
                    if (menu) menu.classList.add("hidden");
                }
            }

            // Tell content script to toggle page ghost
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (!tab) return;
                chrome.tabs.sendMessage(tab.id, { action: "toggleGhost" });
            });
        });
    }

    // --- 5. Clicking the popup ghost also toggles page ghost ---
    // Prioritizing file code
    if (ghostImg) {
        ghostImg.addEventListener("click", () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (!tab) return;
                chrome.tabs.sendMessage(tab.id, { action: "toggleGhost" });
            });
        });
    }

    // --- 6. Dressing Room / Ghost Outfit Logic (popup + page) ---
    // Prioritizing file code
    let currentHat      = null;   // "hat1" | "hat2" | null
    let currentGlasses  = null;   // "glasses1" | "glasses2" | null

    function updateGhostImage() {
        if (!ghostImg) return;
        let parts = ["ghost"];
        if (currentHat)     parts.push(currentHat);
        if (currentGlasses) parts.push(currentGlasses);
        ghostImg.src = "icons/" + parts.join("+") + ".png";
    }

    function notifyContentDressState() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab) return;

            chrome.tabs.sendMessage(tab.id, {
                action: "setHat",
                hatId: currentHat
            });

            chrome.tabs.sendMessage(tab.id, {
                action: "setGlasses",
                glassesId: currentGlasses
            });
        });
    }

    document.querySelectorAll(".dress-item").forEach(button => {
        button.addEventListener("click", () => {
            const type = button.dataset.type;  // "hat" | "glasses"
            const id   = button.dataset.id;    // "hat1", "hat2", "glasses1", "glasses2"

            if (type === "hat") {
                currentHat = (currentHat === id ? null : id);
            } else if (type === "glasses") {
                currentGlasses = (currentGlasses === id ? null : id);
            }

            updateGhostImage();
            notifyContentDressState();
        });
    });

    // --- 7. Menu buttons -> modals ---
    setupModalToggle("mailbox", "mailbox-modal");
    setupModalToggle("dressing", "dressing-modal");
    // gifts modal handled in section 9

    // Haunt icon in menu (Preserved haunt feature)
    const hauntButton = document.getElementById("haunt");
    if (hauntButton) {
        hauntButton.addEventListener("click", () => {
            const modal = document.getElementById("haunt-modal");
            if (!modal) return;

            const isOpen = !modal.classList.contains("hidden");
            if (isOpen) {
                modal.classList.add("hidden");
                updateGhostImage();
            } else {
                openModal("haunt-modal");
                if (ghostImg) {
                    ghostImg.src = "icons/ghost+scary.png"; // Scary ghost image
                }
            }
        });
    }

    // "Start Haunting" button (Preserved haunt feature)
    if (startHauntBtn) {
        startHauntBtn.addEventListener("click", () => {
            // Ask background to send haunt
            chrome.runtime.sendMessage({ action: "sendHaunt" }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Could not send haunt:", chrome.runtime.lastError.message);
                    alert("Could not send haunt! Is the background service running?");
                } else {
                    console.log("Haunt message sent to background.");
                }
            });
            closeAllModals();
        });
    }

    // Close buttons (and reset popup ghost image)
    document.querySelectorAll(".close-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            closeAllModals();
            updateGhostImage();
        });
    });

    // --- 8. Hover sounds for menu & gravestone/ghost ---
    const sounds = {
        mailbox:   new Audio("sounds/mail.mp3"),
        dressing:  new Audio("sounds/dresser.mp3"),
        gifts:     new Audio("sounds/gift.mp3"),
        haunt:     new Audio("sounds/haunt.mp3"),
        gravestone:new Audio("sounds/gravestone.mp3"),
        ghost:     new Audio("sounds/ghost.mp3")
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

    // --- 9. Gemini Gift Generation Logic ---
    // Prioritizing file code
    const giftInput    = document.getElementById("gift-input");
    const giftOutput   = document.getElementById("gift-output");
    const generateButton = document.getElementById("generate-btn");
    const giftsBtn     = document.getElementById("gifts");

    if (giftsBtn) {
        giftsBtn.addEventListener("click", () => {
            openModal("gifts-modal");
            if (giftOutput) giftOutput.innerHTML = "";
            if (giftInput)  giftInput.value = "";
            chrome.storage.local.set({ giftStatus: "default", lastGift: "" });
        });
    }

    function displayGift(status, giftHtml) {
        if (!giftOutput) return;
        switch (status) {
            case "loading":
                giftOutput.textContent = "Summoning spooky magic...";
                break;
            case "success":
                giftOutput.innerHTML =
                    `<h4>✨ Gift Generated! ✨</h4><p>${giftHtml}</p>`;
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
                if (giftOutput) giftOutput.textContent = "Please enter a prompt!";
                return;
            }
            const fullPrompt =
                `You are a friendly, slightly spooky ghost. ` +
                `Generate a creative gift based on this user request: "${userPrompt}". ` +
                `Keep the tone light and fun.`;

            chrome.runtime.sendMessage(
                { action: "generateGift", prompt: fullPrompt }
            );
            displayGift("loading");
        });
    }

    // --- 10. Pairing Code Logic ---
    // Prioritizing file code (sends to runtime/service-worker)
    if (pairCodeInput && savePairCodeBtn) {
        chrome.storage.local.get(["pairCode"], (res) => {
            if (res.pairCode) {
                pairCodeInput.value = res.pairCode;
                console.log("[JustABooAway] Loaded stored pairCode:", res.pairCode);
            }
        });

        savePairCodeBtn.addEventListener("click", () => {
            const code = pairCodeInput.value.trim();
            if (!code) {
                console.log("[JustABooAway] Empty code, not saving");
                return;
            }
            chrome.storage.local.set({ pairCode: code }, () => {
                console.log("[JustABooAway] Saved pairing code:", code);
                // This message goes to the service worker, which is more reliable
                chrome.runtime.sendMessage({
                    action: "setPairCode",
                    code: code
                });
            });
        });
    }

    // --- 11. Listen for Haunt from background ---
    // (Preserved haunt feature)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "receiveHaunt") {
            console.log("BOO! We've been haunted (popup)!");
            getHaunted();
        }
        if (request.action === "receiveMessage" && request.message) {
            // Show partner's message in mailbox (from file code)
            addMessage(request.message.text, "friend");
        }
    });

    // --- 12. Mailbox chat UI ---
    // Prioritizing file code (which includes a chat log)
    const input       = document.getElementById("modal-chat-input");
    const chatDisplay = document.getElementById("modal-chat-display"); // Required by this logic
    const sendBtn     = document.getElementById("modal-send-btn");

    const chatMessages = []; // This is not used in the file, but harmless

    function addMessage(text, type) {
        if (!chatDisplay) return;
        const msgEl = document.createElement("div");
        msgEl.classList.add(type);    // "you" or "friend"
        msgEl.textContent = text;
        chatDisplay.appendChild(msgEl);
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
        chatMessages.push({ text, type }); // Harmless
    }

    if (sendBtn) {
        sendBtn.addEventListener("click", () => {
            const text = input.value.trim();
            if (!text) return;

            addMessage(text, "you");
            input.value = "";

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (!tab) return;
                // Send "sendMessage" as required by your file's content script
                chrome.tabs.sendMessage(tab.id, {
                    action: "sendMessage",
                    text: text
                });
            });
        });
    }
});
