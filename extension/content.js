console.log("[JustABooAway] content script loaded on", window.location.href);

// =====================
//  Assets (GIFs)
// =====================

const GHOST_IDLE_URL = chrome.runtime.getURL("icons/GhostIdle.gif");
const GHOST_DIE_URL  = chrome.runtime.getURL("icons/GhostDie.gif");
const GHOST_FLY_URL  = chrome.runtime.getURL("icons/GhostFly.gif");
const GHOST_HAUNT_URL = chrome.runtime.getURL("icons/HauntedHead.gif"); // 👈 FIX THIS LINE

// =====================
//  Animation state
// =====================

// When *this* user last clicked their ghost
let lastLocalPetTime = 0;
// How close (ms) the two clicks must be to count as "together"
const SPECIAL_WINDOW_MS = 1500;
// Approx length of GhostDie.gif in ms (tweak if needed)
const DIE_DURATION_MS = 1000;

let idleAnimationId = null;
let idleStartTime = null;

// current effect: null | "wiggle" | "special" | "haunt"
let effect = null;
let effectStartTime = 0;

// prevents new ghost / new effects while death animation is playing
let isDying = false;

// Chat bubble over the page
let chatBubbleEl = null;
let chatBubbleTimeoutId = null;

// =====================
//  Config
// =====================

// Use secure WebSocket through Caddy
const SERVER_URL = "wss://justabooaway.us/ws";

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
    if (
        socket &&
        (socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING)
    ) {
        return;
    }

    currentPairCode = pairCode;

    console.log("[JustABooAway] Connecting with pairing code:", pairCode);
    socket = new WebSocket(SERVER_URL);

    socket.addEventListener("open", () => {
        console.log(`[JustABooAway] WS OPEN - joining room ${pairCode}`);
        socket.send(
            JSON.stringify({
                type: "join-room",
                code: pairCode,
            })
        );
    });

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
                addGhost(false); // UI only (no re-broadcast)

            } else if (data.action === "hide-ghost") {
                removeGhost(false); // UI only (play death animation)

            } else if (data.action === "pet-click") {
                // Partner clicked their ghost
                if (!ghost) {
                    // If our ghost isn't visible yet, show it (no re-broadcast)
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
                // Friend triggered a haunt
                console.log("[JustABooAway] BOO! We've been haunted (from WebSocket)!");
                chrome.runtime.sendMessage({ action: "receiveHaunt" });
                triggerEffect("haunt"); // 👈 MODIFIED
            }
        }

        // ---- Chat messages ----
        if (data.type === "chat-message") {
            console.log("[JustABooAway] Received chat-message:", data.payload);

            // Forward to popup so it shows in mailbox chat UI
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
                showChatBubble(text, /*fromRemote=*/ true);
            }
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
        payload,
    };
    socket.send(JSON.stringify(msg));
    console.log("[JustABooAway] Sent pet-action:", msg);
}

// ===========================
//  Chat messaging helpers
// ===========================
function sendChatMessage(messageText) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("[JustABooAway] Cannot send message, socket not open");
        return;
    }

    const msg = {
        type: "chat-message",
        payload: {
            text: messageText,
            timestamp: Date.now(),
        },
    };
    socket.send(JSON.stringify(msg));
    console.log("[JustABooAway] Sent chat-message:", msg);

    // IMPORTANT: Do NOT show a bubble locally.
    // Only the partner (remote side) will show the bubble when they receive it.
}


// =====================
//  Idle + effect animation
// =====================

function startIdleAnimation() {
    if (!ghost) return;
    if (idleAnimationId !== null) return; // already running

    idleStartTime = performance.now();

    function frame(timestamp) {
        if (!ghost || isDying) {
            idleAnimationId = null;
            return;
        }

        const t = (timestamp - idleStartTime) / 1000; // seconds
        // Idle vertical float: up/down by ~10px over ~3s period
        const idleOffsetY = Math.sin((2 * Math.PI) * (t / 3)) * 10;

        let offsetX = 0;
        let scale = 1;
        let rotate = 0;
        let finalOffsetY = idleOffsetY;

        if (effect === "wiggle") {
            const elapsed = timestamp - effectStartTime;
            const duration = 600; // ms
            if (elapsed >= duration) {
                effect = null;
            } else {
                const phase = (elapsed / duration) * 2 * Math.PI;
                offsetX = Math.sin(phase) * 20;
                scale = 1.05;
            }
        } else if (effect === "special") {
            const elapsed = timestamp - effectStartTime;
            const duration = 1000; // ms
            if (elapsed >= duration) {
                effect = null;
            } else {
                const e = elapsed / duration; // 0 → 1
                const pathPhase = e * Math.PI;
                offsetX = Math.sin(pathPhase) * 30;
                const extraY = -15 * Math.sin(pathPhase);
                finalOffsetY = idleOffsetY + extraY;

                scale = 1 + 0.4 * Math.sin(e * Math.PI);
                rotate = 10 * Math.sin(e * 2 * Math.PI);
            }
        } else if (effect === "haunt") { // 👈 ADDED
            const elapsed = timestamp - effectStartTime;
            const duration = 3000; // 3 seconds
            if (elapsed >= duration) {
                effect = null; // End the effect
            } else {
                // Re-use the "wiggle" logic for a shake effect
                const phase = (elapsed / 600) * 2 * Math.PI; // 600ms shake period
                offsetX = Math.sin(phase) * 20;
                scale = 1.05;
            }
        }

        // If effect ended, ensure sprite goes back to idle
        if (effect === null && !isDying && ghost.src !== GHOST_IDLE_URL) {
            ghost.src = GHOST_IDLE_URL;
        }

        // Apply transform combining idle + effect
        ghost.style.transform =
            `translate(${offsetX}px, ${finalOffsetY}px) ` +
            `scale(${scale}) rotate(${rotate}deg)`;

        idleAnimationId = requestAnimationFrame(frame);
    }

    idleAnimationId = requestAnimationFrame(frame);
}

function stopIdleAnimation() {
    if (idleAnimationId !== null) {
        cancelAnimationFrame(idleAnimationId);
        idleAnimationId = null;
    }
    if (ghost) {
        ghost.style.transform = "";
    }
}

/**
 * Start a new effect if none is currently running.
 * kind: "wiggle" | "special" | "haunt"
 */
function triggerEffect(kind) {
    if (!ghost || isDying) return;
    // 👈 MODIFIED
    if (kind !== "wiggle" && kind !== "special" && kind !== "haunt") return;

    // If an effect is already running, ignore new triggers
    if (effect !== null) {
        console.log("[JustABooAway] Effect already running, ignoring new", kind);
        return;
    }

    effect = kind;
    effectStartTime = performance.now();

    // 👈 MODIFIED: Switch sprite based on effect
    if (kind === "haunt") {
        if (ghost.src !== GHOST_HAUNT_URL) {
            ghost.src = GHOST_HAUNT_URL;
        }
    } else { // "wiggle" or "special"
        if (ghost.src !== GHOST_FLY_URL) {
            ghost.src = GHOST_FLY_URL;
        }
    }
}

// =====================
//  Chat bubble over page ghost
// =====================

function showChatBubble(text, fromRemote) {
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

    document.body.appendChild(bubble);
    chatBubbleEl = bubble;

    // Auto-hide after a few seconds
    chatBubbleTimeoutId = setTimeout(() => {
        if (chatBubbleEl) {
            chatBubbleEl.remove();
            chatBubbleEl = null;
        }
        chatBubbleTimeoutId = null;
    }, 5000);
}

// =====================
//  Ghost overlay creation/removal
// =====================

function addGhost(broadcast = true) {
    if (ghost || isDying) return;

    ghost = document.createElement("img");
    ghost.id = "ghost-overlay";
    ghost.src = GHOST_IDLE_URL; // idle GIF

    ghost.style.position = "fixed";
    ghost.style.bottom = "20px";
    ghost.style.right = "20px";
    ghost.style.width = "120px";
    ghost.style.zIndex = "999999999";
    ghost.style.pointerEvents = "auto"; // allow clicks

    // Click on ghost on the page → flying effect + notify partner
    ghost.addEventListener("click", () => {
        if (isDying) return;

        const now = performance.now();
        lastLocalPetTime = now;

        console.log("[JustABooAway] Local ghost click at", now);
        triggerEffect("wiggle"); // normal flying effect

        sendPetAction("pet-click", { time: now });
    });

    document.body.appendChild(ghost);
    console.log("[JustABooAway] Ghost added");

    startIdleAnimation(); // start idle float

    if (broadcast) {
        sendPetAction("show-ghost");
    }
}

function removeGhost(broadcast = true) {
    if (!ghost || isDying) return;

    isDying = true;

    // Stop JS idle/effect animation so the death GIF is clean
    stopIdleAnimation();
    effect = null;

    // Swap to death GIF and stop taking clicks
    ghost.src = GHOST_DIE_URL;
    ghost.style.pointerEvents = "none";
    ghost.style.transform = "";

    const dyingGhost = ghost;

    setTimeout(() => {
        if (ghost === dyingGhost) {
            dyingGhost.remove();
            ghost = null;
            console.log("[JustABooAway] Ghost removed after death animation");
        }
        isDYing = false;
    }, DIE_DURATION_MS);

    if (broadcast) {
        sendPetAction("hide-ghost");
    }
}

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
        console.log("[JustABooAway] Sending haunt-action to friend...");
        sendPetAction("haunt-action");

    } else if ((msg.action === "sendMessage" || msg.action === "sendChat") && msg.text) {
        // Mailbox modal sending a chat → go over WebSocket
        sendChatMessage(msg.text);

    } else if (msg.action === "ensureLocalGhost") {
        // Tombstone controls only THIS user's page ghost, no broadcast
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