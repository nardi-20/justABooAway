document.addEventListener("DOMContentLoaded", () => {
    const gravestone = document.getElementById("gravestone");
    const popupContent = document.getElementById("popup-content");
    const ghost = document.getElementById("ghost");
    const menu = document.getElementById("menu");

    // Click gravestone to show ghost and menu
    gravestone.addEventListener("click", () => {
        const isGhostVisible = !popupContent.classList.contains("hidden");
        if (!isGhostVisible) {
            if (typeof wake === 'function') {
                wake();
            }
        } else {
            // GO TO SLEEP
            if (typeof sleep === 'function') {
                sleep();
            }
        }
    });

    // Open a modal and close others
    function openModal(modalId) {
        document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
        document.getElementById(modalId).classList.remove("hidden");
    }

    // Close all modals
    function closeAllModals() {
        document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
    }

    // Outfit changes
    const ghostImg = document.getElementById("ghost");

    let currentHat = null;
    let currentGlasses = null;

    function updateGhostImage() {
        let src = "icons/ghost.png";

        if (currentHat && currentGlasses) {
            src = `icons/ghost+${currentHat}+${currentGlasses}.png`;
        } else if (currentHat) {
            src = `icons/ghost+${currentHat}.png`;
        } else if (currentGlasses) {
            src = `icons/ghost+${currentGlasses}.png`;
        }

        ghostImg.src = src;
    }

    document.querySelectorAll(".dress-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.dataset.type;
            const id = btn.dataset.id;

            if (type === "hat") {
                currentHat = id;
            } else if (type === "glasses") {
                currentGlasses = id;
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
