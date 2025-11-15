document.addEventListener("DOMContentLoaded", () => {
    const gravestone = document.getElementById("gravestone");
    const popupContent = document.getElementById("popup-content");
    const ghost = document.getElementById("ghost");
    const menu = document.getElementById("menu");

    // Click gravestone to show ghost and menu
    gravestone.addEventListener("click", () => {
        const isGhostVisible = !ghostContainer.classList.contains("hidden");
        if (!isGhostVisible) {
            // WAKE UP
            if (typeof wake === 'function') {
                wake();
            }
            // ... UI changes to SHOW ghost ...

        } else {
            // GO TO SLEEP
            if (typeof sleep === 'function') {
                sleep(); // Call the dedicated sleep function
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

    // Menu button event listeners
    document.getElementById("mailbox").addEventListener("click", () => openModal("mailbox-modal"));
    document.getElementById("dressing").addEventListener("click", () => openModal("dressing-modal"));
    document.getElementById("gifts").addEventListener("click", () => openModal("gifts-modal"));
    document.getElementById("haunt").addEventListener("click", () => openModal("haunt-modal"));

    // Close buttons
    document.querySelectorAll(".close-btn").forEach(btn => btn.addEventListener("click", closeAllModals));
});
