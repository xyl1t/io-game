// global variables
let ctx;
let socket;

let players = {};
let bullets = {};
let randomNumber = Math.floor(Math.random() * 2) + 1;

const gridOffset = 80;
const gridColor = "#f2f";

let map = {};
let obstacles = {};
let visibleObstacleIds = {};

let renderScaleX = 1;
let renderScaleY = 1;

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

let curTime = Date.now()
let lastTime = Date.now()

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
  window.addEventListener(
    "resize",
    () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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
      screenHeight: window.innerHeight
    }
  });

  socket.on("welcome", (me, mapFromServer, obstaclesFromServer) => {
    player = me;
    map = mapFromServer;
    map.htmlImage = document.createElement("img");
    map.htmlImage.src = `/img/${map.name}.png`;
    obstacles = obstaclesFromServer;
    for (const id in obstacles) {
      obstacles[id].htmlImage = document.createElement("img");
      obstacles[id].htmlImage.src = `/img/${obstacles[id].type}.png`;
    }
  });

  socket.on("serverUpdate", (playersFromServer, bulletsFromServer, obstacleIds) => {
    players = playersFromServer;
    bullets = bulletsFromServer;
    visibleObstacleIds = obstacleIds;

    if (players[player.id]) {
      const oldX = player.x;
      const oldY = player.y;
      player = players[player.id];
      player.x = oldX;
      player.y = oldY;
    }
  });

  socket.on("leaderboardUpdate", (sortedTop10) => {
    let strToDisplay = ''
    for(let i=0;i<sortedTop10.length;i++) {
      strToDisplay += `<tr class="row"><td class="col-2">${i+1}</td><td class="col">${sortedTop10[i].name}</td></tr>`
      
    }
    $('#leaderboard').html(strToDisplay)
  });

  socket.on("died", () => {
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
  socket.emit("join", player);
}

function loop() {
  renderScaleX =  1/window.devicePixelRatio;
  renderScaleY = 1/window.devicePixelRatio;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(renderScaleX,renderScaleY);
  ctx.translate(-player.x, -player.y);

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

  // players
  drawPlayer(player);
  for (const id in players) {
    if (player.id != id) {
      drawPlayer(players[id]);
    }
  }

  // bullets
  for (const id in bullets) {
    drawBullet(bullets[id]);
  }

  // obstacles
  for (const id in visibleObstacleIds) {
    if(obstacles[id]){
      const obs = obstacles[id];
      if (obs.htmlImage)
      drawObstacle(obs);
    }
  }

  ctx.restore();

  // game logic /////////////////////////////////////////////


  lastTime = curTime;
  curTime = Date.now()
  const deltaTime = (curTime - lastTime) / 10

  if (keyboard["w"]) {
    player.y -= player.speed * deltaTime;
    socket.emit("playerUpdate", player);
  }
  if (keyboard["s"]) {
    player.y += player.speed * deltaTime;
    socket.emit("playerUpdate", player);
  }
  if (keyboard["a"]) {
    player.x -= player.speed * deltaTime;
    socket.emit("playerUpdate", player);
  }
  if (keyboard["d"]) {
    player.x += player.speed * deltaTime;
    socket.emit("playerUpdate", player);
  }

  player.screenWidth = window.innerWidth*window.devicePixelRatio;         //adjust render distance to window
  player.screenHeight = window.innerHeight*window.devicePixelRatio;       //multiply with pixel-ratio to get actual height and width to render

  window.requestAnimationFrame(loop);
}

function drawPlayer(player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  const radius = player.radius;

  ctx.lineWidth = 4;
  // ctx.fillStyle = "#888";
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

  const width = 100;
  const height = 10;
  ctx.fillStyle = "#0f0";
  ctx.fillRect(-width / 2, -radius * 2.5, (width * player.hp) / 100, height);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(-width / 2, -radius * 2.5, width, height);

  ctx.restore();
}

function drawBullet(bullet) {
  ctx.save();
  // ctx.translate(bullet.x, bullet.y);
  // ctx.rotate(bullet.angle);
  ctx.translate(bullet.x, bullet.y);
  // ctx.rotate(bullet.angle);

  const radius = bullet.radius;

  ctx.fillStyle = bullet.color;
  ctx.beginPath();
  ctx.arc(0, 0, bullet.radius, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(obs) {
  ctx.save();
  ctx.translate(obs.x, obs.y);

    ctx.drawImage(
      obs.htmlImage,
      -obs.htmlImage.width / 2,
      -obs.htmlImage.height / 2,
      obs.htmlImage.width,
      obs.htmlImage.height
    );

  ctx.restore();
}

function mousedown(e) {
  mouse.x = e.pageX - canvas.offsetLeft;
  mouse.y = e.pageY - canvas.offsetTop;
  mouse.leftDown = (e.buttons & 1) == 1;
  mouse.rightDown = (e.buttons & 2) == 2;
  //console.log("Event: mousedown", mouse);

  socket.emit("shoot", player);
}

function mouseup(e) {
  mouse.x = e.pageX - canvas.offsetLeft;
  mouse.y = e.pageY - canvas.offsetTop;
  mouse.leftDown = (e.buttons & 1) == 1;
  mouse.rightDown = (e.buttons & 2) == 2;
  //console.log("Event: mouseup", mouse);
}

function mousemove(e) {
  mouse.x = e.pageX - canvas.offsetLeft;
  mouse.y = e.pageY - canvas.offsetTop;
  mouse.leftDown = (e.buttons & 1) == 1;
  mouse.rightDown = (e.buttons & 2) == 2;
  const dx = mouse.x - canvas.width / 2;
  const dy = mouse.y - canvas.height / 2;
  mouse.angle = Math.atan2(dy, dx);
  //console.log("Event: mosemove", mouse);

  player.angle = mouse.angle;

  socket.emit("playerUpdate", player);
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
