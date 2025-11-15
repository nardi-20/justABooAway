const unavailableMessage = "Go haunt a page first!"; 

function wake(ghostContainerEl, ghostEl, menuEl) {
     console.log("Ghost is waking up! Saving state as awake.");
     available = true;
     if (available){
          ghostContainerEl.classList.remove("hidden"); // Uses passed element
          ghostEl.classList.add("shake", "glow", "float"); // Uses passed element

          setTimeout(() => {
               ghostEl.classList.remove("shake");
          }, 500);
     }
}

function sleep(ghostContainerEl) {
    console.log("Ghost is going to sleep! Saving state as asleep.");
    ghostContainerEl.classList.add("hidden"); // Uses passed element
}