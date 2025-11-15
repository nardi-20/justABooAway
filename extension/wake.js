const home = document.getElementById('TombStone');
const message = document.getElementById('greetingMessage');
const untilFound = document.querySelector("#until-found-ghost");


home.addEventListener('click', function() {
     message.textContent = 'Yawwwwnnnn';
     aviable = true 
     if (aviabile){
          //pop ghost up screen 
          untilFound.addEventListener(
               "beforematch",
               () => (untilFound.textContent = "Boo!"),
          );
     }
     message.textContent = 'Zzzzzzzzz...{unaviablemessage}';
});

