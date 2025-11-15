document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Variable Declarations & Selectors ---
    const gravestone = document.getElementById("gravestone");
    const ghostContainer = document.getElementById("ghost-container"); 
    const ghost = document.getElementById("ghost");
    const menu = document.getElementById("menu");
    const ALL_MODAL_SELECTORS = ".mailbox-background, .dressing-background, .gifts-background, .haunt-background";


    // --- 2. Helper Functions for Modals ---

    // Closes ALL modals by selecting every element with a background class
    function closeAllModals() {
        document.querySelectorAll(ALL_MODAL_SELECTORS)
            .forEach(m => m.classList.add("hidden"));
    }

    // Opens a modal: closes all others first, then shows the target modal
    function openModal(modalId) {
        closeAllModals(); 
        document.getElementById(modalId).classList.remove("hidden");
    }


    // --- 3. Gravestone Toggle Logic ---
    gravestone.addEventListener("click", () => {
        // Check visibility of the ghost's container (assuming it's what toggles the state)
        const isGhostVisible = !ghostContainer.classList.contains("hidden");

        if (!isGhostVisible) {
            // ACTION: WAKE UP
            if (typeof wake === 'function') {
                wake();
            }
            
            // UI Changes: SHOW ghost and menu
            ghostContainer.classList.remove("hidden");
            menu.classList.remove("hidden");
            
            // Apply animations
            ghost.classList.add("shake", "glow", "float");
            setTimeout(() => {
                ghost.classList.remove("shake");
            }, 500);

        } else {
            // ACTION: GO TO SLEEP
            if (typeof sleep === 'function') {
                sleep();
            }
            
            // UI Changes: HIDE ghost and menu
            closeAllModals(); // Close any open modals first
            ghostContainer.classList.add("hidden");
            menu.classList.add("hidden");
            
            // Remove lingering animation classes
            ghost.classList.remove("glow", "float");
        }
    });


    // --- 4. Dressing Room / Ghost Outfit Logic ---
    // Outfit changes
    const ghostImg = document.getElementById("ghost");

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
    
    // Menu button event listeners
    document.getElementById("mailbox").addEventListener("click", () => openModal("mailbox-modal"));
    document.getElementById("dressing").addEventListener("click", () => openModal("dressing-modal"));
    document.getElementById("gifts").addEventListener("click", () => openModal("gifts-modal"));
    document.getElementById("haunt").addEventListener("click", () => openModal("haunt-modal"));

    // Close buttons
    document.querySelectorAll(".close-btn").forEach(btn => btn.addEventListener("click", closeAllModals));
});
