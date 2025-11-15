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
