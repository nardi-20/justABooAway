// Functions/Home/ghost-state.js
// Define the elements (You need to ensure these IDs exist in your HTML)
const gravestone = document.getElementById("gravestone"); // Not strictly needed here, but good practice
const ghostContainer = document.getElementById("popup-content"); // Use 'popup-content' as it holds the 'hidden' class
const ghost = document.getElementById("ghost");
const menu = document.getElementById("menu");
const message = document.getElementById("greetingMessage"); // Assuming you have a message element
const unavailableMessage = "Go haunt a page first!"; // Define the message content

let available = true; // Initialize the state variable

// Functions/Home/ghost-state.js

function wake() {
     console.log("Ghost is waking up! Saving state as awake.");
     available = true; // Corrected typo and removed `const/let`
     
     if (available){
          ghostContainer.classList.remove("hidden"); // Shows the ghost container
          ghost.classList.add("shake", "glow", "float");

          setTimeout(() => {
               ghost.classList.remove("shake");
          }, 500);
     }
     
     // Corrected variable names
     message.textContent = `Hello! ${available ? '' : unavailableMessage}`; 
     menu.classList.remove("hidden");
}

function sleep() {
    console.log("Ghost is going to sleep! Saving state as asleep.");
    available = false; // Update state
    ghostContainer.classList.add("hidden"); // Hides the ghost container
    menu.classList.add("hidden"); // You probably want to hide the menu too!
}