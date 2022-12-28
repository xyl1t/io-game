import { game } from "/game.js";

// global variables
let ctx;

let curTime = Date.now();
let lastTime = Date.now();

$(() => {
  setup();
  loop();
});

function setup() {
  // setup client /////////////////////////////////////////////////////////////
  console.log("Loading canvas and context...");
  const canvas = document.querySelector("#canvas");
  resize(); // initialize render scale and canvas size and send that to the server
  window.addEventListener("resize", resize, false);
  canvas.addEventListener("mousedown", mousedown, false);
  canvas.addEventListener("mouseup", mouseup, false);
  canvas.addEventListener("mouseleave", mouseleave, false);
  canvas.addEventListener("mousemove", mousemove, false);
  canvas.addEventListener("wheel", wheel, false);
  window.addEventListener("keydown", keydown, true);
  window.addEventListener("keyup", keyup, true);

  $("#btnStartGame").click(startClick);
  $("#inputUsername").keypress((e) => {
    if (event.key === "Enter") {
      $("#btnStartGame").click();
    }
  });

  // disabling alpha for performance.... or maybe not
  ctx = canvas.getContext("2d");

  // socket stuff /////////////////////////////////////////////////////////////

  console.log("Establishing connection...");
  game.socket = io({
    auth: {
      token: "actualUser", // authorize as a legit user
    },
  });

  game.socket.on(
    "welcome",
    (socketId, mapFromServer, decoSpritesFromServer, obstaclesFromServer) => {
      game.player.id = socketId;

      game.map = mapFromServer;
      game.map.htmlImage = document.createElement("img");
      game.map.htmlImage.src = `/img/${game.map.name}.png`;

      game.map.decoSprites = decoSpritesFromServer;
      for (const id in game.map.decoSprites) {
        game.map.decoSprites[id].htmlImage = document.createElement("img");
        game.map.decoSprites[
          id
        ].htmlImage.src = `/img/${game.map.decoSprites[id].type}.png`;
      }

      game.obstacles = obstaclesFromServer;

      $("#btnStartGame").removeAttr("disabled");
      $("#inputUsername").removeAttr("disabled").focus();
    }
  );

  game.socket.on("playerJoin", (newPlayer) => {
    if (game.player.id == newPlayer.id) {
      game.player = newPlayer;
      game.onJoinCallback();
    }
  });

  game.socket.on(
    "serverUpdate",
    (playersFromServer, bulletsFromServer, decoSpriteIds) => {
      game.players = playersFromServer;
      game.bullets = bulletsFromServer;
      game.visibleDecoSpriteIds = decoSpriteIds;

      if (game.players[game.player.id]) {
        game.player = game.players[game.player.id];
      }
    }
  );

  game.socket.on("leaderboardUpdate", (sortedTop10) => {
    let strToDisplay = "";
    for (let i = 0; i < sortedTop10.length; i++) {
      strToDisplay += `<tr class="row"><td class="col-2">${
        i + 1
      }</td><td class="col">${sortedTop10[i].name}</td></tr>`;
    }
    $("#leaderboard").html(strToDisplay);
  });

  game.socket.on("died", (playerId) => {
    // game.player = newPlayer
    $("#game_elements").css("display", "none");
    $("#settings_elements").css("display", "inline");
    $("#died_screen").css("display", "inline");
    $("#site_wrapper").addClass(
      "jumbotron d-flex align-items-center vertical-center"
    );
    $("#deathText").css("display", "block");

    game.onDeathCallback();
  });
}

let oldTimestamp = 0;
function loop(timestamp) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(game.renderScale, game.renderScale);
  ctx.translate(-game.player.x, -game.player.y);

  // draw map
  if (game.map.htmlImage) {
    ctx.drawImage(
      game.map.htmlImage,
      -game.map.width / 2,
      -game.map.height / 2,
      game.map.width,
      game.map.height
    );
  }

  // draw bullets
  for (const [id, bullet] of Object.entries(game.bullets)) {
    drawBullet(bullet);
  }

  // draw players
  drawPlayer(game.player);
  for (const [id, player] of Object.entries(game.players)) {
    if (game.player.id != id) {
      drawPlayer(player);
    }
  }

  // only draw visible deco sprites
  if (game.visibleDecoSpriteIds) {
    for (const id of game.visibleDecoSpriteIds) {
      const ds = game.map.decoSprites[id];
      if (ds) {
        drawDecoSprite(ds);
      }
    }
  }

  // draw obstacles for debug purposes
  for (const obs of game.obstacles) {
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
  const elapsedTime = timestamp - oldTimestamp;
  game.onLoopCallback(elapsedTime); // callback
  oldTimestamp = timestamp;
  window.requestAnimationFrame(loop);
}

function drawPlayer(player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.turretAngle);

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
  const width = 50;
  const height = 8;
  const healthWidth = (width * player.hp) / 100;
  const rad = height / 2;
  const verticalOffset = -radius * 2;
  ctx.beginPath();
  ctx.fillStyle = "#444";
  ctx.arc(-width / 2, verticalOffset + rad, rad, 0, Math.PI * 2, false);
  ctx.arc(+width / 2, verticalOffset + rad, rad, 0, Math.PI * 2, false);
  ctx.rect(-width / 2, verticalOffset, width, height);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "#3d0";
  ctx.arc(-width / 2, verticalOffset + rad, rad - 2, 0, Math.PI * 2, false);
  ctx.arc(
    healthWidth - width / 2,
    verticalOffset + rad,
    rad - 2,
    0,
    Math.PI * 2,
    false
  );
  ctx.rect(-width / 2, verticalOffset + 2, healthWidth, height - 4);
  ctx.fill();

  // velocity
  ctx.strokeStyle = "#f00";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(player.velX, player.velY);
  ctx.stroke();

  ctx.restore();
}

function drawBullet(bullet) {
  ctx.save();
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

function startClick(e) {
  $("#settings_elements").css("display", "none");
  $("#game_elements").css("display", "inline");
  $("#site_wrapper").removeClass(
    "jumbotron d-flex align-items-center vertical-center"
  );
  $("#deathText").css("display", "none");

  game.player.name = $("#inputUsername").val();
  game.socket.emit("join", game.player);
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHieght + "px";
  game.windowWidth = window.innerWidth;
  game.windowHeight = window.innerHeight;
  if (
    window.innerWidth >
    window.innerHeight * (game.minWidth / game.minHeight)
  ) {
    game.renderScale = Math.max(0.7, window.innerHeight / game.minHeight);
  } else {
    game.renderScale = Math.max(0.7, window.innerWidth / game.minWidth);
  }
  //adjust render distance to window
  game.player.visibleGameWidth = game.windowWidth * (1 / game.renderScale);
  game.player.visibleGameHeight = game.windowHeight * (1 / game.renderScale);
  if (game.socket.id) {
    game.socket.emit("playerScreenResize", game.player);
  }
}

function mousedown(e) {
  game.mouse.x = e.pageX - canvas.offsetLeft;
  game.mouse.y = e.pageY - canvas.offsetTop;
  game.mouse.leftDown = (e.buttons & 1) == 1;
  game.mouse.rightDown = (e.buttons & 2) == 2;
}

function mouseup(e) {
  game.mouse.x = e.pageX - canvas.offsetLeft;
  game.mouse.y = e.pageY - canvas.offsetTop;
  game.mouse.leftDown = (e.buttons & 1) == 1;
  game.mouse.rightDown = (e.buttons & 2) == 2;
}

function mouseleave(e) {
  game.mouse.x = e.pageX - canvas.offsetLeft;
  game.mouse.y = e.pageY - canvas.offsetTop;
  game.mouse.leftDown = false;
  game.mouse.rightDown = false;
}

function mousemove(e) {
  game.mouse.oldX = game.mouse.x;
  game.mouse.oldY = game.mouse.y;
  game.mouse.x = e.pageX - canvas.offsetLeft;
  game.mouse.y = e.pageY - canvas.offsetTop;
  game.mouse.leftDown = (e.buttons & 1) == 1;
  game.mouse.rightDown = (e.buttons & 2) == 2;
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
  game.keyboard[e.key.toLowerCase()] = true;
  // console.log("down", e.key.toLowerCase());
}

function keyup(e) {
  game.keyboard[e.key.toLowerCase()] = false;
  //console.log("up", e.key.toLowerCase());
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
