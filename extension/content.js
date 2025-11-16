console.log("[JustABooAway] content script loaded on", window.location.href);

// =====================
//  Asset URLs
// =====================

const GHOST_IDLE_URL = chrome.runtime.getURL("icons/GhostIdle.gif");
const GHOST_DIE_URL  = chrome.runtime.getURL("icons/GhostDie.gif");
const GHOST_FLY_URL  = chrome.runtime.getURL("icons/GhostFly.gif");

// Dress-up overlays
const HAT1_URL      = chrome.runtime.getURL("icons/hat1.png");
const HAT2_URL      = chrome.runtime.getURL("icons/hat2.png");   // spider hat
const GLASSES1_URL  = chrome.runtime.getURL("icons/glasses1.png");
const GLASSES2_URL  = chrome.runtime.getURL("icons/glasses2.png");
const GLASSES_URL   = GLASSES1_URL; // legacy alias

// =====================
//  Animation state
// =====================

let lastLocalPetTime = 0;
const SPECIAL_WINDOW_MS = 1500;
const DIE_DURATION_MS   = 1000;

let idleAnimationId = null;
let idleStartTime   = null;

// effect: null | "wiggle" | "special"
let effect          = null;
let effectStartTime = 0;
let isDying         = false;

// =====================
//  Dress-up wrapper / overlays
// =====================

let ghostWrapper = null;  // container that moves
let ghost        = null;

let ghostHat     = null;
let ghostGlasses = null;
let ghostSpider  = null;

let currentHatId     = null; // "hat1" | "hat2" | null
let currentGlassesId = null; // "glasses1" | "glasses2" | null

let spiderTimeoutId      = null;
const SPIDER_INTERVAL_MS = 60_000;
const SPIDER_VISIBLE_MS  = 4_000;

// =====================
//  WebSocket config
// =====================

// const SERVER_URL = "ws://66.42.80.193:3000";
const SERVER_URL = "wss://justabooaway.us/ws";

let socket          = null;
let currentPairCode = null;

// =====================
//  WebSocket helpers
// =====================

function connectSocket(pairCode) {
    if (!pairCode) {
        console.log("[JustABooAway] No pairing code set yet, not connecting");
        return;
    }

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
                addGhost(false);
            } else if (data.action === "hide-ghost") {
                removeGhost(false);
            } else if (data.action === "pet-click") {
                if (!ghost) addGhost(false);

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
                console.log("[JustABooAway] BOO! We've been haunted (content)!");
                chrome.runtime.sendMessage({ action: "receiveHaunt" });
            }
        }

        if (data.type === "chat-message") {
            console.log("[JustABooAway] Received chat-message:", data.payload);

            chrome.runtime.sendMessage({
                action: "receiveMessage",
                message: data.payload
            });
        }
    });

    socket.addEventListener("error", (err) => {
        console.error("[JustABooAway] WebSocket ERROR:", err);
    });

    socket.addEventListener("close", () => {
        console.log("[JustABooAway] WebSocket CLOSED");
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

    const msg = { type: "pet-action", action, payload };
    socket.send(JSON.stringify(msg));
    console.log("[JustABooAway] Sent pet-action:", msg);
}

function sendMessageToPair(messageText) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("[JustABooAway] Cannot send message, socket not open");
        return;
    }

    const msg = {
        type: "chat-message",
        payload: { text: messageText, timestamp: Date.now() }
    };
    socket.send(JSON.stringify(msg));
    console.log("[JustABooAway] Sent chat-message:", msg);
}

// =====================
//  Idle + effect animation (APPLY TO WRAPPER)
// =====================

function startIdleAnimation() {
    if (!ghost) return;
    if (!ghostWrapper) ensureGhostWrapper();
    if (!ghostWrapper) return;
    if (idleAnimationId !== null) return;

    idleStartTime = performance.now();

    function frame(timestamp) {
        if (!ghost || !ghostWrapper || isDying) {
            idleAnimationId = null;
            return;
        }

        const t = (timestamp - idleStartTime) / 1000;
        let idleOffsetY = Math.sin((2 * Math.PI / 3) * t) * 10;

        let offsetX = 0;
        let scale   = 1;
        let rotate  = 0;
        let y       = idleOffsetY;

        if (effect === "wiggle") {
            const elapsed  = timestamp - effectStartTime;
            const duration = 600;
            if (elapsed >= duration) {
                effect = null;
            } else {
                const phase = (elapsed / duration) * 2 * Math.PI;
                offsetX = Math.sin(phase) * 20;
                scale   = 1.05;
            }
        } else if (effect === "special") {
            const elapsed  = timestamp - effectStartTime;
            const duration = 1000;
            if (elapsed >= duration) {
                effect = null;
            } else {
                const e        = elapsed / duration;
                const pathPhase = e * Math.PI;
                offsetX = Math.sin(pathPhase) * 30;
                const extraY = -15 * Math.sin(pathPhase);
                y = idleOffsetY + extraY;
                scale  = 1 + 0.4 * Math.sin(e * Math.PI);
                rotate = 10 * Math.sin(e * 2 * Math.PI);
            }
        }

        if (effect === null && !isDying && ghost.src !== GHOST_IDLE_URL) {
            ghost.src = GHOST_IDLE_URL;
        }

        // Apply transform to the WRAPPER so overlays move with it
        ghostWrapper.style.transform =
            `translate(${offsetX}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`;

        idleAnimationId = requestAnimationFrame(frame);
    }

    idleAnimationId = requestAnimationFrame(frame);
}

function stopIdleAnimation() {
    if (idleAnimationId !== null) {
        cancelAnimationFrame(idleAnimationId);
        idleAnimationId = null;
    }
    const target = ghostWrapper || ghost;
    if (target) target.style.transform = "";
}

function triggerEffect(kind) {
    if (!ghost || isDying) return;
    if (kind !== "wiggle" && kind !== "special") return;

    if (effect !== null) {
        console.log("[JustABooAway] Effect already running, ignoring", kind);
        return;
    }

    effect = kind;
    effectStartTime = performance.now();

    if (ghost.src !== GHOST_FLY_URL) {
        ghost.src = GHOST_FLY_URL;
    }
}

// =====================
//  Wrapper & overlays
// =====================

function ensureGhostWrapper() {
    if (ghostWrapper && ghostWrapper.contains(ghost)) return;
    if (!ghost) return;

    const wrapper = document.createElement("div");
    wrapper.id = "ghost-overlay-wrapper";
    wrapper.style.position = "fixed";
    wrapper.style.bottom   = "20px";
    wrapper.style.right    = "20px";
    wrapper.style.width    = "120px";
    wrapper.style.zIndex   = "999999999";
    wrapper.style.pointerEvents = "none";

    ghost.style.position      = "relative";
    ghost.style.bottom        = "0";
    ghost.style.right         = "0";
    ghost.style.width         = "100%";
    ghost.style.pointerEvents = "auto";

    wrapper.appendChild(ghost);
    document.body.appendChild(wrapper);

    ghostWrapper = wrapper;
}

function ensureHatOverlay() {
    if (!ghostWrapper) return;
    if (ghostHat) return;

    ghostHat = document.createElement("img");
    ghostHat.id = "ghost-overlay-hat";
    ghostHat.style.position = "absolute";
    ghostHat.style.width    = "105%";
    ghostHat.style.left     = "55%";
    ghostHat.style.top      = "8%";
    ghostHat.style.transform = "translate(-50%, -39%)";
    ghostHat.style.pointerEvents = "none";
    ghostHat.style.display  = "none";

    ghostWrapper.appendChild(ghostHat);
}

function ensureGlassesOverlay() {
    if (!ghostWrapper) return;
    if (ghostGlasses) return;

    ghostGlasses = document.createElement("img");
    ghostGlasses.id = "ghost-overlay-glasses";
    ghostGlasses.style.position = "absolute";
    ghostGlasses.style.width    = "55%";
    ghostGlasses.style.left     = "50%";
    ghostGlasses.style.top      = "52%"; // lower & centered
    ghostGlasses.style.transform = "translate(-50%, -50%)";
    ghostGlasses.style.pointerEvents = "none";
    ghostGlasses.style.display  = "none";

    ghostWrapper.appendChild(ghostGlasses);
}

function ensureSpiderOverlay() {
    if (!ghostWrapper) return;
    if (ghostSpider) return;

    ghostSpider = document.createElement("img");
    ghostSpider.id  = "ghost-overlay-spider";
    ghostSpider.src = HAT2_URL; // reuse spider art
    ghostSpider.style.position = "absolute";
    ghostSpider.style.width    = "32%";
    ghostSpider.style.left     = "50%";
    ghostSpider.style.top      = "4%";
    ghostSpider.style.transform = "translate(-50%, 0)";
    ghostSpider.style.pointerEvents = "none";
    ghostSpider.style.display  = "none";

    ghostWrapper.appendChild(ghostSpider);
}

function applyHat(id) {
    currentHatId = id || null;
    if (!ghostWrapper) return;
    ensureHatOverlay();

    if (!currentHatId) {
        ghostHat.style.display = "none";
        return;
    }
    ghostHat.src = currentHatId === "hat2" ? HAT2_URL : HAT1_URL;
    ghostHat.style.display = "block";
}

function applyGlasses(id) {
    currentGlassesId = id || null;
    if (!ghostWrapper) return;
    ensureGlassesOverlay();

    if (!currentGlassesId) {
        ghostGlasses.style.display = "none";
        return;
    }
    ghostGlasses.src =
        currentGlassesId === "glasses2" ? GLASSES2_URL : GLASSES1_URL;
    ghostGlasses.style.display = "block";
}

// spider photobomb

function scheduleSpider() {
    if (!ghostWrapper) return;
    if (spiderTimeoutId !== null) return;

    const jitter = (Math.random() * 0.5 + 0.75);
    const delay  = SPIDER_INTERVAL_MS * jitter;

    spiderTimeoutId = setTimeout(() => {
        spiderTimeoutId = null;
        showSpiderOnce();
    }, delay);
}

function showSpiderOnce() {
    if (!ghostWrapper) return;
    ensureSpiderOverlay();
    ghostSpider.style.display = "block";

    setTimeout(() => {
        if (ghostSpider) ghostSpider.style.display = "none";
        scheduleSpider();
    }, SPIDER_VISIBLE_MS);
}

function cancelSpider() {
    if (spiderTimeoutId !== null) {
        clearTimeout(spiderTimeoutId);
        spiderTimeoutId = null;
    }
    if (ghostSpider) ghostSpider.style.display = "none";
}

// =====================
//  Ghost overlay
// =====================

function addGhost(broadcast = true) {
    if (ghost || isDying) return;

    ghost = document.createElement("img");
    ghost.id  = "ghost-overlay";
    ghost.src = GHOST_IDLE_URL;
    ghost.style.cursor = "pointer";

    ensureGhostWrapper();

    if (ghostWrapper && !ghostWrapper.contains(ghost)) {
        ghostWrapper.appendChild(ghost);
    }

    ghost.addEventListener("click", () => {
        if (isDying) return;
        const now = performance.now();
        lastLocalPetTime = now;
        triggerEffect("wiggle");
        sendPetAction("pet-click", { time: now });
    });

    console.log("[JustABooAway] Ghost added");

    startIdleAnimation();
    applyHat(currentHatId);
    applyGlasses(currentGlassesId);
    scheduleSpider();

    if (broadcast) {
        sendPetAction("show-ghost");
    }
}

function removeGhost(broadcast = true) {
    if (!ghost || isDying) return;

    isDying = true;
    stopIdleAnimation();
    effect = null;

    ghost.src = GHOST_DIE_URL;
    ghost.style.pointerEvents = "none";

    const dyingGhost   = ghost;
    const dyingWrapper = ghostWrapper;

    setTimeout(() => {
        if (ghost === dyingGhost && dyingWrapper) {
            dyingWrapper.remove();
        } else if (ghost === dyingGhost) {
            dyingGhost.remove();
        }

        ghost        = null;
        ghostWrapper = null;
        ghostHat     = null;
        ghostGlasses = null;
        ghostSpider  = null;
        isDying      = false;
        cancelSpider();
        console.log("[JustABooAway] Ghost removed after death animation");
    }, DIE_DURATION_MS);

    if (broadcast) {
        sendPetAction("hide-ghost");
    }
}

// =====================
//  Messages from popup
// =====================

chrome.runtime.onMessage.addListener((msg) => {
    console.log("[JustABooAway] onMessage:", msg);

    if (msg.action === "toggleGhost") {
        if (ghost) {
            removeGhost(false);
        } else {
            addGhost(false);
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
    } else if (msg.action === "sendMessage" && msg.text) {
        sendMessageToPair(msg.text);
    } else if (msg.action === "setHat") {
        applyHat(msg.hatId || null);
    } else if (msg.action === "setGlasses") {
        applyGlasses(msg.glassesId || null);
    }
});

// =====================
//  Init
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

window.addEventListener("unload", () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("[JustABooAway] Closing socket on unload");
        socket.close();
    }
});
