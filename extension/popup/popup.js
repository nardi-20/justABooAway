document.addEventListener("DOMContentLoaded", () => {
    const gravestone = document.getElementById("gravestone");
    const ghostContainer = document.getElementById("ghost-container");
    const ghost = document.getElementById("ghost");
    const menu = document.getElementById("menu");

    gravestone.addEventListener("click", () => {
        ghostContainer.classList.remove("hidden"); // Show ghost container

        ghost.classList.add("shake", "glow"); // Trigger shake and glow animations

        setTimeout(() => {
            ghost.classList.remove("shake"); // Remove shake after animation ends
        }, 500);

        ghost.classList.add("float"); // Start floating animation

        menu.classList.remove("hidden"); // Show menu
    });
});
