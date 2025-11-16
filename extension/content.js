console.log("[JustABooAway] content script loaded on", window.location.href);

// 
// 👇 --- 1. ADDED THIS SECTION (from V2) ---
// 
// Inject animation styles for the "fun" bubble
(function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes justaboo-bubble-shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px) rotate(-3deg); }
            40% { transform: translateX(8px) rotate(3deg); }
            60% { transform: translateX(-8px) rotate(-3deg); }
            80% { transform: translateX(8px) rotate(3deg); }
        }
    `;
    document.head.appendChild(style);
})();
// 
// 👆 --- END OF ADDED SECTION ---
// 


// =====================
//  Assets (GIFs)
// =====================

const GHOST_IDLE_URL = chrome.runtime.getURL("icons/GhostIdle.gif");
const GHOST_DIE_URL  = chrome.runtime.getURL("icons/GhostDie.gif");
const GHOST_FLY_URL  = chrome.runtime.getURL("icons/GhostFly.gif");
const GHOST_HAUNT_URL = chrome.runtime.getURL("icons/HauntedHead.gif"); // <-- ADDED FROM V2

// Dress-up overlays (from V1)
const HAT1_URL      = chrome.runtime.getURL("icons/hat1.png");
const HAT2_URL      = chrome.runtime.getURL("icons/hat2.png");
const GLASSES1_URL  = chrome.runtime.getURL("icons/glasses1.png");
const GLASSES2_URL  = chrome.runtime.getURL("icons/glasses2.png");


// =====================
//  State
// =====================

let ghost        = null;
let hatOverlay   = null; // (from V1)
let glassesOverlay = null; // (from V1)
let chatBubbleEl   = null;
let chatBubbleTimeoutId = null;

let currentPairCode  = null;
let socket           = null;
let socketRetryCount = 0;
const SOCKET_MAX_RETRIES = 5;

let lastLocalPetTime = 0;
const SPECIAL_WINDOW_MS = 1500;
const DIE_DURATION_MS   = 1000;

let idleAnimationId = null;
let idleStartTime   = null;
let effect          = null;
let effectStartTime = 0;
let isDying         = false;

// =====================
//  WebSocket
// =====================

// (Assuming connectSocket, sendPetAction, sendChatMessage, etc., exist from the full file)
// ... (omitting identical WebSocket connection logic for brevity) ...

/* Assuming the full file has the WebSocket listener.
  The V2 diff MODIFIED this listener, so we are replacing the
  'chat-message' block with the new V2 logic.
*/
function connectSocket(code) {
    // ... (socket connection logic) ...
    // ...
    socket.addEventListener("message", (event) => {
        console.log("[JustABooAway] WebSocket MESSAGE:", event.data);
        let data;
        try {
            data = JSON.parse(event.data);
        } catch {
            return;
        }

        // ---- Pet / haunt actions ----
        if (data.type === "pet-action") {
            if (data.action === "show-ghost") {
                addGhost(false); 
            } else if (data.action === "hide-ghost") {
                removeGhost(false); 
            } else if (data.action === "pet-click") {
                if (!ghost) {
                    addGhost(false);
                }
                const now = performance.now();
                const remoteTime =
                    data.payload && typeof data.payload.time === "number"
                        ? data.payload.time
                        : now;
                const delta = Math.abs(remoteTime - lastLocalPetTime);
                console.log("[JustABooAway] Remote click delta ms:", delta);
                const isSpecial = delta <= SPECIAL_WINDOW_MS;
                triggerEffect(isSpecial ? "special" : "wiggle");
            } else if (data.action === "haunt-action") {
                console.log("[JustABooAway] BOO! We've been haunted (from WebSocket)!");
                chrome.runtime.sendMessage({ action: "receiveHaunt" });
                triggerEffect("haunt"); 
            }
        }

        // 
        // 👇 --- 2. MODIFIED THIS SECTION (from V2) ---
        // 
        // ---- Chat messages ----
        if (data.type === "chat-message") {
            console.log("[JustABooAway] Received chat-message:", data.payload);

            // Forward to popup so it shows in mailbox chat UI
            // (V2 popup doesn't listen, but this doesn't break anything)
            chrome.runtime.sendMessage({
                action: "receiveMessage",
                message: data.payload,
            });

            // Show as bubble over our page ghost
            const text =
                data.payload && typeof data.payload.text === "string"
                    ? data.payload.text
                    : "";
            
            if (text) {
                // Check if this is the special haunt message
                const isHauntMessage = (text.toLowerCase().includes("never gonna give you up"));
                showChatBubble(text, /*fromRemote=*/ true, /*isFun=*/ isHauntMessage);
            }
        }
        // 
        // 👆 --- END OF MODIFIED SECTION ---
        // 
    });
    // ... (rest of socket logic) ...
}

// (Assuming sendPetAction and sendChatMessage functions exist)
function sendPetAction(action, payload) { /* ... */ }
function sendChatMessage(text) { /* ... */ }


// =====================
//  Chat bubble over page ghost
// =====================

// 
// 👇 --- 3. MODIFIED THIS FUNCTION (from V2) ---
// 
function showChatBubble(text, fromRemote, isFun = false) { // Added 'isFun' parameter
    if (!ghost) {
        // Ensure our ghost exists (local only, no broadcast)
        addGhost(false);
    }
    if (!ghost) return;

    // Remove any previous bubble
    if (chatBubbleEl) {
        chatBubbleEl.remove();
        chatBubbleEl = null;
    }
    if (chatBubbleTimeoutId) {
        clearTimeout(chatBubbleTimeoutId);
        chatBubbleTimeoutId = null;
    }

    const bubble = document.createElement("div");
    bubble.id = "justaboo-chat-bubble";
    bubble.textContent = text;

    // Style: simple speech bubble near ghost
    Object.assign(bubble.style, {
        position: "fixed",
        bottom: "150px",        // above the ghost (which is at bottom: 20px)
        right: "20px",
        maxWidth: "240px",
        padding: "8px 10px",
        background: "rgba(0, 0, 0, 0.8)",
        color: "#fff",
        borderRadius: "10px",
        border: "1px solid #ff6600",
        fontFamily: '"Creepster", Arial, sans-serif',
        fontSize: "13px",
        zIndex: "1000000000",
        pointerEvents: "none",
        boxShadow: "0 0 10px rgba(0,0,0,0.8)",
        whiteSpace: "pre-wrap",
    });
    
    // If this is the "fun" haunt message, add the shake animation and change color
    if (isFun) {
        bubble.style.animation = "justaboo-bubble-shake 0.5s ease-in-out 2"; // Run shake twice
        bubble.style.borderColor = "#CC0000"; // Make it red
        bubble.style.color = "#FF6666";
        bubble.style.fontSize = "14px"; // Make it slightly bigger
    }

    document.body.appendChild(bubble);
    chatBubbleEl = bubble;

    // Auto-hide after a few seconds
    chatBubbleTimeoutId = setTimeout(() => {
        if (chatBubbleEl) {
            chatBubbleEl.remove();
            chatBubbleEl = null;
        }
        chatBubbleTimeoutId = null;
    }, 5000); // 5 seconds
}
// 
// 👆 --- END OF MODIFIED SECTION ---
// 

// =====================
//  Ghost overlay creation/removal
// =====================

// (This is the V1 logic, to keep the dress-up overlays)
function addGhost(broadcast = true) {
    if (ghost || isDying) return;

    ghost = document.createElement("img");
    ghost.id = "ghost-overlay";
    ghost.src = GHOST_IDLE_URL; // idle GIF

    // ... (ghost styling) ...
    ghost.style.position = "fixed";
    ghost.style.bottom = "20px";
    ghost.style.right = "20px";
    ghost.style.width = "120px";
    ghost.style.zIndex = "999999999";
    ghost.style.pointerEvents = "auto"; // allow clicks

    // Click on ghost on the page
    ghost.addEventListener("click", () => {
        if (isDying) return;
        const now = performance.now();
        lastLocalPetTime = now;
        console.log("[JustABooAway] Local ghost click at", now);
        triggerEffect("wiggle");
        sendPetAction("pet-click", { time: now });
    });

    // --- V1 Dressing Room Logic ---
    hatOverlay = document.createElement("img");
    hatOverlay.style.position = "fixed";
    hatOverlay.style.bottom = "20px";
    hatOverlay.style.right = "20px";
    hatOverlay.style.width = "120px";
    hatOverlay.style.zIndex = "1000000000"; // above ghost
    hatOverlay.style.pointerEvents = "none";

    glassesOverlay = document.createElement("img");
    glassesOverlay.style.position = "fixed";
    glassesOverlay.style.bottom = "20px";
    glassesOverlay.style.right = "20px";
    glassesOverlay.style.width = "120px";
    glassesOverlay.style.zIndex = "1000000000"; // above ghost
    glassesOverlay.style.pointerEvents = "none";

    document.body.appendChild(ghost);
    document.body.appendChild(hatOverlay);
    document.body.appendChild(glassesOverlay);
    console.log("[JustABooAway] Ghost added");
    
    startIdleAnimation(); // (Assuming this function exists)

    if (broadcast) {
        sendPetAction("show-ghost");
    }
}

function removeGhost(broadcast = true) {
    if (!ghost || isDying) return;

    isDying = true;
    stopIdleAnimation(); // (Assuming this function exists)
    effect = null;

    ghost.src = GHOST_DIE_URL;
    ghost.style.pointerEvents = "none";
    ghost.style.transform = "";

    const dyingGhost = ghost;
    const dyingHat = hatOverlay; // --- V1 ---
    const dyingGlasses = glassesOverlay; // --- V1 ---

    // --- V1: Remove overlays ---
    if (dyingHat) dyingHat.remove();
    if (dyingGlasses) dyingGlasses.remove();
    hatOverlay = null;
    glassesOverlay = null;

    setTimeout(() => {
        if (ghost === dyingGhost) {
            dyingGhost.remove();
            ghost = null;
            console.log("[JustABooAway] Ghost removed after death animation");
        }
        isDying = false; 
    }, DIE_DURATION_MS);

    if (broadcast) {
        sendPetAction("hide-ghost");
    }
}

// --- V1 Dressing Room Functions ---
function applyHat(hatId) {
    if (!hatOverlay) return;
    if (hatId === "hat1") {
        hatOverlay.src = HAT1_URL;
    } else if (hatId === "hat2") {
        hatOverlay.src = HAT2_URL;
    } else {
        hatOverlay.src = ""; // clear
    }
}

function applyGlasses(glassesId) {
    if (!glassesOverlay) return;
    if (glassesId === "glasses1") {
        glassesOverlay.src = GLASSES1_URL;
    } else if (glassesId === "glasses2") {
        glassesOverlay.src = GLASSES2_URL;
    } else {
        glassesOverlay.src = ""; // clear
    }
}


// (Assuming triggerEffect, startIdleAnimation, stopIdleAnimation functions exist)
function triggerEffect(name) { /* ... */ }
function startIdleAnimation() { /* ... */ }
function stopIdleAnimation() { /* ... */ }


// =====================
//  Messages from popup / background
// =====================

chrome.runtime.onMessage.addListener((msg) => {
    console.log("[JustABooAway] onMessage:", msg);

    if (msg.action === "toggleGhost") {
        // This path still broadcasts show/hide to partner
        if (ghost) {
            removeGhost(true);
        } else {
            addGhost(true);
        }

    } else if (msg.action === "setPairCode") {
        currentPairCode = msg.code || null;
        if (socket) {
            socket.close();
            socket = null;
        }
        if (currentPairCode) {
            connectSocket(currentPairCode);
        }

    } else if (msg.action === "startHaunting") {
        // This is triggered by the service-worker (from V2 flow)
        // OR a V1 popup (if logic was mixed).
        // The V2 popup *also* sends a chat message, but that's a separate flow.
        // This will just trigger the GIF change.
        console.log("[JustABooAway] Received startHaunting, sending haunt-action to friend...");
        sendPetAction("haunt-action");
        
        // ** V2's haunt *also* sends a message. The V2 popup does this.
        // But the V2 *service worker* flow doesn't.
        // To be safe and combine *both* haunt features, we send the message here.
        sendChatMessage("NEVER gonna give you up, NEVER gonna let you DOWN, Never gonna turn around and DESERT YOU");

    } else if (msg.action === "sendChat" && msg.text) { 
        // V2 popup.js uses "sendChat"
        sendChatMessage(msg.text);

    } else if (msg.action === "sendMessage" && msg.text) {
        // V1 popup.js used "sendMessage"
        sendChatMessage(msg.text);
    
    // --- V1 Dressing Room Listeners ---
    } else if (msg.action === "setHat") {
        applyHat(msg.hatId || null);
    } else if (msg.action === "setGlasses") {
        applyGlasses(msg.glassesId || null);
    
    // V2 Tombstone logic
    } else if (msg.action === "ensureLocalGhost") {
        const visible = !!msg.visible;
        if (visible) {
            if (!ghost) addGhost(false);
        } else {
            if (ghost) removeGhost(false);
        }
    }
});

// =====================
//  Init: load pair code and connect
// =====================

chrome.storage.local.get(["pairCode"], (res) => {
    const code = res.pairCode || null;
    currentPairCode = code;
    if (code) {
        console.log("[JustABooAway] Found stored pairing code:", code);
        connectSocket(code);
    } else {
        console.log("[JustABooAway] No pairing code stored yet");
    }
});

// Close socket when tab unloads
window.addEventListener("unload", () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("[JustABooAway] Closing socket on unload");
        socket.close();
    }
});