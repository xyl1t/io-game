// global variables
let ctx;
let socket;

let players = {};
let bullets = {};
let randomNumber = Math.floor(Math.random() * 2) + 1;

const gridOffset = 80;
const gridColor = "#f2f";

let map = {};
let decoSprites = {};
let visibleDecoSpriteIds = {};
let obstacles = [];

let renderScaleWidth = 1;
let renderScaleHeight = 1;

let constWidth = 800;
let constHeight = 800;

const mouse = {
  x: 0,
  y: 0,
  angle: 0,
  scrollX: 0,
  scrollY: 0,
  leftDown: false,
  rightDown: false,
};
const keyboard = {};

let player = {};

let curTime = Date.now();
let lastTime = Date.now();

$(() => {
  setup();
  loop();
});

function setup() {
  $("#start_game").click(startGame);

  // Execute a function when the user presses a key on the keyboard
  document
    .getElementById("username")
    .addEventListener("keypress", function (event) {
      // If the user presses the "Enter" key on the keyboard
      if (event.key === "Enter") {
        startGame(event);
      }
    });

  // setup client
  console.log("Loading canvas and context...");
  const canvas = document.querySelector("#canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const accountForRatio = () => {
      if (window.innerWidth > window.innerHeight) {
        let ratio = window.innerHeight / constHeight;
        // ratio = Math.max(0.7, ratio);
        renderScaleWidth = ratio;
        renderScaleHeight = ratio;
      }
      else {
        let ratio = window.innerWidth / constWidth;
        // ratio = Math.max(0.7, ratio);
        renderScaleWidth = ratio;
        renderScaleHeight = ratio;
      }
  }
  accountForRatio();
  window.addEventListener(
    "resize",
    () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      accountForRatio();
      // player.screenWidth = window.innerWidth*renderScaleWidth;         //adjust render distance to window
      // player.screenHeight = window.innerHeight*renderScaleWidth;       //multiply with pixel-ratio to get actual height and width to render
    },
    false
  );
  canvas.addEventListener("mousedown", mousedown, false);
  canvas.addEventListener("mouseup", mouseup, false);
  canvas.addEventListener("mousemove", mousemove, false);
  canvas.addEventListener("wheel", wheel, false);

  window.addEventListener("keydown", keydown, true);
  window.addEventListener("keyup", keyup, true);

  // disabling alpha for performance.... or maybe not
  ctx = canvas.getContext("2d");

  // socket stuff ////////////////////////////////////////

  console.log("Establishing connection...");
  socket = io({
    auth: {
      token: "actualUser", // authorize as a legit user
    },
    query: {
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    },
  });

  socket.on(
    "welcome",
    (me, mapFromServer, decoSpritesFromServer, obstaclesFromServer) => {
      player = me;

      map = mapFromServer;
      map.htmlImage = document.createElement("img");
      map.htmlImage.src = `/img/${map.name}.png`;

      decoSprites = decoSpritesFromServer;
      for (const id in decoSprites) {
        decoSprites[id].htmlImage = document.createElement("img");
        decoSprites[id].htmlImage.src = `/img/${decoSprites[id].type}.png`;
      }

      obstacles = obstaclesFromServer;
    }
  );

  socket.on(
    "serverUpdate",
    (playersFromServer, bulletsFromServer, decoSpriteIds) => {
      players = playersFromServer;
      bullets = bulletsFromServer;
      visibleDecoSpriteIds = decoSpriteIds;

      if (players[player.id]) {
        // const oldX = player.x;
        // const oldY = player.y;
        player = players[player.id];
        // player.x = oldX;
        // player.y = oldY;
      }
    }
  );

  socket.on("leaderboardUpdate", (sortedTop10) => {
    let strToDisplay = "";
    for (let i = 0; i < sortedTop10.length; i++) {
      strToDisplay += `<tr class="row"><td class="col-2">${
        i + 1
      }</td><td class="col">${sortedTop10[i].name}</td></tr>`;
    }
    $("#leaderboard").html(strToDisplay);
  });

  socket.on("died", (newPlayer) => {
    player = newPlayer
    $("#game_elements").css("display", "none");
    $("#settings_elements").css("display", "inline");
    $("#died_screen").css("display", "inline");
    $("#site_wrapper").addClass(
      "jumbotron d-flex align-items-center vertical-center"
    );
    $("#deathText").css("display", "block");
  });
}

function startGame(e) {
  $("#settings_elements").css("display", "none");
  $("#game_elements").css("display", "inline");
  $("#site_wrapper").removeClass(
    "jumbotron d-flex align-items-center vertical-center"
  );
  $("#deathText").css("display", "none");

  player.name = $("#username").val();
  player.dead = false;
  socket.emit("join", player);
}

function loop() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  ctx.scale(renderScaleWidth, renderScaleHeight);

  let translateMapX = -player.x
  let translateMapY = -player.y

  player.reachedLeftEnd = false
  player.reachedRightEnd = false
  player.reachedDownEnd = false
  player.reachedUpEnd = false
  //rechts
  if(player.x * 2 + window.innerWidth >= map.width){
    translateMapX = -(map.width / 2 - window.innerWidth / 2)
    player.reachedRightEnd = true
  }
  //links
  if(player.x * 2 - window.innerWidth < -map.width){
    translateMapX = map.width / 2 - window.innerWidth / 2
    player.reachedLeftEnd = true
  }
  //unten
  if(player.y * 2 + window.innerHeight >= map.height){
    translateMapY = -(map.height / 2 - window.innerHeight / 2)
    player.reachedDownEnd = true
  }
  //oben
  if(player.y * 2 - window.innerHeight < -map.height){
    translateMapY = map.height / 2 - window.innerHeight / 2
    player.reachedUpEnd = true
  }
  ctx.translate(translateMapX, translateMapY);

  // draw map
  if (map.htmlImage) {
    ctx.drawImage(
      map.htmlImage,
      -map.width / 2,
      -map.height / 2,
      map.width,
      map.height
    );
  }

  // bullets
  for (const id in bullets) {
    drawBullet(bullets[id]);
  }

  // players
  drawPlayer(player);
  for (const id in players) {
    
    if (player.id != id) {
      drawPlayer(players[id]);
    }
  }

  // deco sprites
  for (const id in visibleDecoSpriteIds) {
    if (decoSprites[id]) {
      const ds = decoSprites[id];
      drawDecoSprite(ds);
    }
  }

  for (const obs of obstacles) {
    ctx.save();
    ctx.strokeStyle = "#000";
    for (let i = 0; i < obs.coords.length - 1; i++) {
      let s = obs.coords[i];
      let e = obs.coords[i + 1];

      let nx = -(e.y - s.y);
      let ny = e.x - s.x;
      let d = Math.sqrt(nx * nx + ny * ny);
      nx /= d;
      ny /= d;

      ctx.beginPath();
      ctx.arc(s.x, s.y, obs.radius, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(e.x, e.y, obs.radius, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(s.x + nx * obs.radius, s.y + ny * obs.radius);
      ctx.lineTo(e.x + nx * obs.radius, e.y + ny * obs.radius);

      ctx.moveTo(s.x - nx * obs.radius, s.y - ny * obs.radius);
      ctx.lineTo(e.x - nx * obs.radius, e.y - ny * obs.radius);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();

  // game logic /////////////////////////////////////////////

  lastTime = curTime;
  curTime = Date.now();
  const deltaTime = (curTime - lastTime) / 10;

  let moveX = 0;
  let moveY = 0;

  if (keyboard["w"]) {
    moveY = -1;
  }
  if (keyboard["s"]) {
    moveY = 1;
  }
  if (keyboard["a"]) {
    moveX = -1;
  }
  if (keyboard["d"]) {
    moveX = 1;
  }

  if (moveX != 0 || moveY != 0) {
    let len = dist(0, 0, moveX, moveY);
    moveX /= len;
    moveY /= len;

    socket.emit("playerMove", player, moveX, moveY);
  }

  if(mouse.leftDown || mouse.rightDown) {
    socket.emit("shoot", player);
  }

  player.screenWidth = window.innerWidth; //adjust render distance to window
  player.screenHeight = window.innerHeight;

  window.requestAnimationFrame(loop);
}

function drawPlayer(player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  const radius = player.radius;

  ctx.lineWidth = 4;
  ctx.fillStyle = player.specialColor ?? player.color;
  ctx.strokeStyle = "#333";
  ctx.strokeRect(radius * 0.8, -0.333 * radius, radius * 1.5, radius * 0.666);
  ctx.fillRect(radius * 0.8, -0.333 * radius, radius * 1.5, radius * 0.666);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = player.specialColor ?? player.color;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.font = "12px Helvetica";
  ctx.fillStyle = "#333";
  ctx.fillText(
    player.name,
    0 - ctx.measureText(player.name).width / 2,
    radius * 2
  );

  // healthbar
  const width = 100;
  const height = 10;
  ctx.fillStyle = "#0f0";
  ctx.fillRect(-width / 2, -radius * 3, (width * player.hp) / 100, height);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(-width / 2, -radius * 3, width, height);

  ctx.restore();
}

function drawBullet(bullet) {
  // const bp = players[bullet.playerId];
  // if (!bp) return;

  ctx.save();
  // const offX = (bp.radius * 1.5 + bullet.radius) * Math.cos(bp.angle);
  // const offY = (bp.radius * 1.5 + bullet.radius) * Math.sin(bp.angle);
  // ctx.translate(bullet.x + offX, bullet.y + offY);
  ctx.translate(bullet.x, bullet.y);

  const radius = bullet.radius;

  ctx.fillStyle = bullet.color;
  ctx.beginPath();
  ctx.arc(0, 0, bullet.radius, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, bullet.radius, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

function drawDecoSprite(ds) {
  ctx.save();
  ctx.translate(ds.x, ds.y);

  if (ds.htmlImage) {
    ctx.drawImage(
      ds.htmlImage,
      -ds.htmlImage.width / 2,
      -ds.htmlImage.height / 2,
      ds.htmlImage.width,
      ds.htmlImage.height
    );
  }

  ctx.restore();
}

function mousedown(e) {
  mouse.x = e.pageX - canvas.offsetLeft;
  mouse.y = e.pageY - canvas.offsetTop;
  mouse.leftDown = (e.buttons & 1) == 1;
  mouse.rightDown = (e.buttons & 2) == 2;

  socket.emit("shoot", player);
}

function mouseup(e) {
  mouse.x = e.pageX - canvas.offsetLeft;
  mouse.y = e.pageY - canvas.offsetTop;
  mouse.leftDown = (e.buttons & 1) == 1;
  mouse.rightDown = (e.buttons & 2) == 2;
}

function mousemove(e) {
  mouse.x = e.pageX - canvas.offsetLeft;
  mouse.y = e.pageY - canvas.offsetTop;
  mouse.leftDown = (e.buttons & 1) == 1;
  mouse.rightDown = (e.buttons & 2) == 2;
  

  let playerX = canvas.width / 2
  let playerY = canvas.height / 2

  console.log('playerX: ', playerX)
  console.log('playerY: ', playerY)

  if(player.reachedLeftEnd)
    playerX = map.width / 2 + player.x
  
  if(player.reachedRightEnd)
    playerX = canvas.width - (map.width / 2 - player.x)

  if(player.reachedUpEnd)
    playerY = map.height / 2 + player.y
  
  if(player.reachedDownEnd)
    playerY = canvas.height - (map.height / 2 - player.y)
  
  const dx = mouse.x - playerX
  const dy = mouse.y - playerY
  mouse.angle = Math.atan2(dy, dx);

  player.angle = mouse.angle;
  socket.emit("mouseMove", player);
}

function wheel(e) {
  e.preventDefault();

  let deltaX = e.deltaX;
  let deltaY = e.deltaY;

  if (e.shiftKey) {
    deltaY = 0;
    deltaX = e.deltaY || e.deltaX;
  }

  const finalX = (Math.max(-100, Math.min(100, deltaX)) / 100) * 100;
  const finalY = (Math.max(-100, Math.min(100, deltaY)) / 100) * 100;

  //console.log("Event: wheel", finalX, finalY);
}

function keydown(e) {
  keyboard[e.key.toLowerCase()] = true;
  //console.log("down", e.key.toLowerCase());
}

function keyup(e) {
  keyboard[e.key.toLowerCase()] = false;
  //console.log("up", e.key.toLowerCase());
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
