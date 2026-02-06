const firebaseConfig={
  apiKey:"YOUR_API_KEY",
  authDomain:"YOUR_PROJECT.firebaseapp.com",
  databaseURL:"https://YOUR_PROJECT.firebaseio.com",
  projectId:"YOUR_PROJECT"
};
firebase.initializeApp(firebaseConfig);
const db=firebase.database();

const symbols=["★","●","▲","■","◆","✿","✦","⬟","⬢"];

let towers=[],selected=null,moves=0,total,startTime;
let gameFinished=false;
let totalPlayers=1;
let resultsShown=false;

const playerId="p_"+Math.random().toString(36).slice(2,8);

/* DOM */
const towersEl=document.querySelectorAll(".tower");
const movesEl=document.getElementById("moves");
const playerCount=document.getElementById("playerCount");
const resultModal=document.getElementById("resultModal");
const resultTitle=document.getElementById("resultTitle");
const resultStats=document.getElementById("resultStats");

startBtn.onclick=startGame;
sendChatBtn.onclick=sendChat;
inviteBtn.onclick=copyLink;
playAgainBtn.onclick=startGame;
exitBtn.onclick=exitGame;

function startGame(){
  resultModal.style.display="none";
  gameFinished=false;
  resultsShown=false;
  selected=null;
  moves=0;
  movesEl.textContent=0;

  total=+diskCount.value;
  startTime=Date.now();

  towers=[[],[],[]];
  for(let i=total;i>=1;i--)towers[0].push(i);
  render();

  if(mode.value==="multi"){
    joinMultiplayer();
  }else{
    chatSection.style.display="none";
    totalPlayers=1;
    playerCount.textContent="Single Player Mode";
  }
}

function render(){
  towersEl.forEach((towerEl,i)=>{
    towerEl.querySelectorAll(".disk").forEach(d=>d.remove());
    towers[i].forEach(d=>{
      const disk=document.createElement("div");
      disk.className="disk";
      disk.style.width=50+d*22+"px";
      disk.style.background=`hsl(${d*40},90%,60%)`;
      disk.textContent=symbols[d-1]+" "+d;
      towerEl.appendChild(disk);
    });
  });
}

towersEl.forEach(t=>{
  t.onclick=()=>{
    if(gameFinished)return;
    const i=+t.dataset.i;

    if(selected===null){
      if(!towers[i].length)return;
      selected=i; return;
    }

    const disk=towers[selected].at(-1);
    const top=towers[i].at(-1);
    if(top && top<disk){selected=null;return;}

    towers[selected].pop();
    towers[i].push(disk);
    selected=null;
    movesEl.textContent=++moves;
    render();

    if(towers[2].length===total){
      finishGame();
    }
  };
});

function joinMultiplayer(){
  if(!playerName.value||!roomId.value){
    alert("Enter name & room"); return;
  }

  chatSection.style.display="block";
  const room=db.ref(`rooms/${roomId.value}`);

  room.child("maxPlayers").transaction(v=>v||+maxPlayers.value);

  room.child(`players/${playerId}`).set({
    id:playerId,
    name:playerName.value
  });

  room.child("players").on("value",snap=>{
    const players=snap.val()||{};
    totalPlayers=Object.keys(players).length;
    playerCount.textContent=
      `Players in room: ${totalPlayers} / ${maxPlayers.value}`;
  });

  listenResults();
  loadChat();
}

function finishGame(){
  if(gameFinished)return;
  gameFinished=true;

  if(mode.value==="single"){
    showResult(1,[{name:"You"}]);
    return;
  }

  const ref=db.ref(`rooms/${roomId.value}/finishOrder`);
  ref.transaction(list=>{
    list=list||[];
    if(list.some(p=>p.id===playerId)) return list;
    list.push({id:playerId,name:playerName.value,time:Date.now()});
    return list;
  });
}

function listenResults(){
  if(mode.value==="single") return;

  db.ref(`rooms/${roomId.value}/finishOrder`)
    .on("value",snap=>{
      const list=snap.val();
      if(!list) return;
      if(list.length < totalPlayers) return;
      if(resultsShown) return;
      resultsShown=true;

      const pos=list.findIndex(p=>p.id===playerId);
      if(pos===-1) return;

      showResult(pos+1,list);
    });
}

function showResult(position,list){
  resultModal.style.display="flex";
  resultTitle.textContent=
    position===1 ? "🏆 YOU WON!" : `Finished #${position}`;

  let html="<strong>Final Rankings</strong><ol>";
  list.forEach(p=>html+=`<li>${p.name}</li>`);
  html+="</ol>";

  const time=Math.floor((Date.now()-startTime)/1000);
  html+=`<p>Moves: ${moves} | Time: ${time}s</p>`;
  resultStats.innerHTML=html;
}

function sendChat(){
  if(!chatInput.value.trim())return;
  db.ref(`rooms/${roomId.value}/chat`).push({
    name:playerName.value,
    msg:chatInput.value
  });
  chatInput.value="";
}

function loadChat(){
  chatBox.innerHTML="";
  db.ref(`rooms/${roomId.value}/chat`)
    .on("child_added",s=>{
      const c=s.val();
      chatBox.innerHTML+=`<div>${c.name}: ${c.msg}</div>`;
    });
}

function copyLink(){
  if(!roomId.value)return;
  const link=`${location.origin}${location.pathname}?room=${roomId.value}`;
  navigator.clipboard.writeText(link);
  alert("Invite link copied!");
}

function exitGame(){
  resultModal.style.display="none";
  chatSection.style.display="none";
  if(mode.value==="multi"&&roomId.value){
    db.ref(`rooms/${roomId.value}/players/${playerId}`).remove();
  }
}
