// =====================
//  Config
// =====================

const SERVER_URL = "ws://66.42.80.193:3000";

let socket = null;
let ghost = null;
let currentPairCode = null;

// =====================
//  WebSocket helpers
// =====================

function connectSocket(pairCode) {
    if (!pairCode) {
        console.log("[JustABooAway] No pairing code set yet, not connecting");
        return;
    }

    // Avoid duplicate connections
    if (socket &&
        (socket.readyState === WebSocket.OPEN ||
         socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    currentPairCode = pairCode;

    console.log("[JustABooAway] Connecting with pairing code:", pairCode);
    socket = new WebSocket(SERVER_URL);

    socket.addEventListener("open", () => {
        console.log(`[JustABooAway] WS OPEN - joining room ${pairCode}`);
        socket.send(JSON.stringify({
            type: "join-room",
            code: pairCode
        }));
    });

    socket.addEventListener("message", (event) => {
        console.log("[JustABooAway] WebSocket MESSAGE:", event.data);
        let data;
        try {
            data = JSON.parse(event.data);
        } catch {
            return;
        }

        if (data.type === "pet-action") {
            if (data.action === "show-ghost") {
                addGhost(false);      // UI only
            } else if (data.action === "hide-ghost") {
                removeGhost(false);   // UI only
                
            // 💡 --- ADDED THIS SECTION ---
            // 3. We receive a haunt from our friend
            } else if (data.action === "haunt-action") {
                console.log("[JustABooAway] BOO! We've been haunted!");
                // Tell the popup (if open) and service-worker (if closed)
                chrome.runtime.sendMessage({ action: "receiveHaunt" });
            }
            // 💡 --- END OF ADDED SECTION ---

        }
    });

    socket.addEventListener("error", (err) => {
        console.error("[JustABooAway] WebSocket ERROR:", err);
    });

    socket.addEventListener("close", () => {
        console.log("[JustABooAway] WebSocket CLOSED");
        // simple reconnect
        setTimeout(() => {
            console.log("[JustABooAway] Reconnecting WebSocket...");
            connectSocket(currentPairCode);
        }, 5000);
    });
}

function sendPetAction(action, payload = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("[JustABooAway] Cannot send pet action, socket not open");
        return;
    }

    const msg = {
        type: "pet-action",
        action,
        payload
    };
    socket.send(JSON.stringify(msg));
    console.log("[JustABooAway] Sent pet-action:", msg);
}

// =====================
//  Ghost overlay
// =====================

function addGhost(broadcast = true) {
    if (ghost) return;

    ghost = document.createElement("img");
    ghost.id = "ghost-overlay";
    ghost.src = chrome.runtime.getURL("icons/ghost.png");

    ghost.style.position = "fixed";
    ghost.style.bottom = "20px";
    ghost.style.right  = "20px";
    ghost.style.width  = "120px";
    ghost.style.zIndex = "999999999";
    ghost.style.pointerEvents = "none";

    document.body.appendChild(ghost);
    console.log("[JustABooAway] Ghost added");

    if (broadcast) {
        sendPetAction("show-ghost");
    }
}

function removeGhost(broadcast = true) {
    if (!ghost) return;

    ghost.remove();
    ghost = null;
    console.log("[JustABooAway] Ghost removed");

    if (broadcast) {
        sendPetAction("hide-ghost");
    }
}

// =====================
//  Popup → content messages
// =====================

chrome.runtime.onMessage.addListener((msg) => {
    console.log("[JustABooAway] onMessage:", msg);

    if (msg.action === "toggleGhost") {
        if (ghost) {
            removeGhost(true);
        } else {
            addGhost(true);
        }
    } else if (msg.action === "setPairCode") {
        // popup tells us the code changed
        currentPairCode = msg.code || null;
        if (socket) {
            socket.close();
            socket = null;
        }
        if (currentPairCode) {
            connectSocket(currentPairCode);
        }

    // 💡 --- ADDED THIS SECTION ---
    // 1. Popup told us to "Start Haunting"
    } else if (msg.action === "startHaunting") {
        console.log("[JustABooAway] Sending haunt-action to friend...");
        // 2. We send the new "haunt-action" message over the WebSocket
        sendPetAction("haunt-action");
    }
    // 💡 --- END OF ADDED SECTION ---
});

// =====================
//  Init: load pair code and connect
// =====================

chrome.storage.local.get(["pairCode"], (res) => {
    const code = res.pairCode || null;
    currentPairCode = code;
    if (code) {
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