const gravestone = document.getElementById("gravestone");
const ghostContainer = document.getElementById("ghost-container");
const ghost = document.getElementById("ghost");
const menu = document.getElementById("menu");

// Functions/Home/ghost-state.js

function wake() {
     console.log("Ghost is waking up! Saving state as awake.");
     aviabile = true 
     if (aviabile){
     ghostContainer.classList.remove("hidden");
     ghost.classList.add("shake", "glow", "float");

     setTimeout(() => {
          ghost.classList.remove("shake");
     }, 500);
     }
     message.textContent = 'Zzzzzzzzz...{unaviablemessage}';
     menu.classList.remove("hidden");
}

function sleep() {
    console.log("Ghost is going to sleep! Saving state as asleep.");
    ghostContainer.classList.add("hidden");
}

