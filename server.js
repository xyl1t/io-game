/*************************************************************************** */
/*                          IO-Game over WebSockets                          */
/*                                                                           */
/*  Marat Isaw, Benjamin Terbul, Justus Arndt, Paul Trattnig, Thomas Fischer */
/*  HTL Villach - Abteilung Informatik - 4AHIF                               */
/*  (c) 2022/23                                                              */
/*************************************************************************** */
"use strict";

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static("public"));

const updateTime = 1000 / 60;
const simulationUpdates = 4;
let lastTime = Date.now();
let curTime = Date.now();
let deltaTime = 0;

const sockets = {};

const players = {};
const bullets = {};
const decoSprites = {};
const obstacles = [];
const map = {
  name: "map",
  width: 5000,
  height: 5000,
};

const millisBetweenShots = 100;
const timesOfLastShots = {};
let leaderboardInfos = [];

function generateDecoSprites(count) {
  for (let i = 0; i < count; i++) {
    const id = genId();
    const maxX = map.width / 2;
    const minX = -map.width / 2;
    const maxY = map.height / 2;
    const minY = -map.height / 2;
    decoSprites[id] = {
      id: id,
      type: "bush",
      x: randBetween(minX, maxX),
      y: randBetween(minY, maxY),
      sizeX: 180,
      sizeY: 180,
      solid: false,
    };
  }
}

generateDecoSprites(32);

class Obstacle {
  constructor(type, radius, coords) {
    this.id = genId();
    this.type = type;
    this.radius = radius;
    this.coords = coords;
  }
}

class Player {
  constructor(socket, isDead) {
    this.id = socket.id;
    this.accX = 0;
    this.accY = 0;
    this.velX = 0;
    this.velY = 0;
    this.x = 0;
    this.y = 0;
    this.screenWidth = socket.handshake.query.screenWidth;
    this.screenHeight = socket.handshake.query.screenHeight;
    this.color = getRandomColor();
    this.specialColor = undefined;
    this.angle = 0;
    this.radius = 16;
    this.name = "";
    this.hp = 100;
    this.speed = 150;
    this.dead = isDead || false;
  }
}

obstacles.push(
  new Obstacle("line", 8, [
    { x: 0, y: 100 },
    { x: 0, y: 200 },
    { x: -100, y: 300 },
  ])
);
obstacles.push(
  new Obstacle("line", 8, [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
  ])
);
obstacles.push(
  new Obstacle("line", 8, [
    { x: -100, y: -100 },
    { x: -283, y: -182 },
  ])
);
obstacles.push(
  new Obstacle("line", 8, [
    { x: -150, y: -100 },
    { x: -383, y: -142 },
  ])
);

obstacles.push(
  new Obstacle("line", 8, [
    { x: randBetween(-300, 300), y: randBetween(-300, 300) },
    { x: randBetween(-300, 300), y: randBetween(-300, 300) },
  ])
);

io.on("connection", (socket) => {
  const token = socket.handshake.auth.token;
  if (token != "actualUser") socket.disconnect(true);

  let newPlayer = new Player(socket);
  sockets[newPlayer.id] = socket;
  console.log("a new player connected", players);
  socket.emit("welcome", newPlayer, map, decoSprites, obstacles);

  socket.on("disconnect", () => {
    delete timesOfLastShots[socket.id];
    leaderboardInfos = leaderboardInfos.filter(
      (score) => score.id != socket.id
    );
    delete players[socket.id];
    delete sockets[socket.id];
    console.log("a player disconnected", players);
  });

  socket.on("join", (player) => {
    players[player.id] = player;
    timesOfLastShots[player.id] = 0;
    leaderboardInfos = leaderboardInfos.filter(
      (score) => score.id != player.id
    );
    leaderboardInfos.push({ id: player.id, name: player.name, score: 0 });
    socket.broadcast.emit("playerJoin", player); // not yet handled in client
  });

  socket.on("mouseMove", (player) => {
    if (players[player.id]) {
      players[player.id].angle = player.angle;
    }
  });

  socket.on("playerMove", (player, moveX, moveY) => {
    if (players[player.id]) {
      players[player.id].accX = moveX * player.speed;
      players[player.id].accY = moveY * player.speed;
    }
  });

  socket.on("shoot", (player) => {
    if (Date.now() - timesOfLastShots[player.id] > millisBetweenShots) {
      const bulletId = genId();
      bullets[bulletId] = {
        id: bulletId,
        playerId: player.id,
        angle: player.angle,
        speed: 100,
        x: player.x,
        y: player.y,
        radius: 6,
        color: player.color,
        range: 1000, // pixels
        damage: 10, // hp
      };
      timesOfLastShots[player.id] = Date.now();
    }
  });
});

function serverUpdate() {
  lastTime = curTime;
  curTime = Date.now();
  deltaTime = (curTime - lastTime) / 100;

  let simDeltaTime = deltaTime / simulationUpdates;

  for (let iSim = 0; iSim < simulationUpdates; iSim++) {
    for (const pId in players) {
      const p = players[pId];
      p.velX += p.accX * simDeltaTime;
      p.velY += p.accY * simDeltaTime;
      p.x += p.velX * simDeltaTime;
      p.y += p.velY * simDeltaTime;
      p.accX = 0;
      p.accY = 0;
      p.velX *= 0.95;
      p.velY *= 0.95;
    }

    for (const bId in bullets) {
      const b = bullets[bId];
      b.range -= b.speed * simDeltaTime;
      if (b.range > 0) {
        b.x += b.speed * simDeltaTime * Math.cos(b.angle);
        b.y += b.speed * simDeltaTime * Math.sin(b.angle);

        for (const pId in players) {
          const p = players[pId];
          const distX = p.x - b.x;
          const distY = p.y - b.y;
          const distance = Math.sqrt(distX * distX + distY * distY);
          if (pId != b.playerId && distance <= p.radius + b.radius) {
            p.hp -= b.damage;
            p.specialColor = "#FF0000";

            setTimeout(() => {
              players[pId].specialColor = undefined;
            }, 100);

            delete bullets[bId];
          }

          if (p.hp <= 0) {
            playerDied(pId);
          }
        }
      } else {
        delete bullets[bId];
      }
    }

    // resolve player collision
    for (const obs of obstacles) {
      for (let i = 0; i < obs.coords.length - 1; i++) {
        let s = obs.coords[i];
        let e = obs.coords[i + 1];

        for (const pId in players) {
          let player = players[pId];

          let lineX1 = e.x - s.x;
          let lineY1 = e.y - s.y;
          let lineX2 = player.x - s.x;
          let lineY2 = player.y - s.y;

          let edgeLength = lineX1 * lineX1 + lineY1 * lineY1;

          let t =
            Math.max(
              0,
              Math.min(edgeLength, lineX1 * lineX2 + lineY1 * lineY2)
            ) / edgeLength;

          let closestPointX = s.x + t * lineX1;
          let closestPointY = s.y + t * lineY1;

          let distance = dist(player.x, player.y, closestPointX, closestPointY);

          if (distance <= player.radius + obs.radius) {
            // static collision has occurred
            const overlap = 1.0 * (distance - player.radius - obs.radius);

            player.x -= (overlap * (player.x - closestPointX)) / distance;
            player.y -= (overlap * (player.y - closestPointY)) / distance;
          }
        }

        for (const bId in bullets) {
          let bullet = bullets[bId];

          let lineX1 = e.x - s.x;
          let lineY1 = e.y - s.y;
          let lineX2 = bullet.x - s.x;
          let lineY2 = bullet.y - s.y;

          let edgeLength = lineX1 * lineX1 + lineY1 * lineY1;

          let t =
            Math.max(
              0,
              Math.min(edgeLength, lineX1 * lineX2 + lineY1 * lineY2)
            ) / edgeLength;

          let closestPointX = s.x + t * lineX1;
          let closestPointY = s.y + t * lineY1;

          let distance = dist(bullet.x, bullet.y, closestPointX, closestPointY);

          if (distance <= bullet.radius + obs.radius) {
            // static collision has occurred
            const overlap = 1.0 * (distance - bullet.radius - obs.radius);

            delete bullets[bullet.id]
            // bullet.x -= (overlap * (bullet.x - closestPointX)) / distance;
            // bullet.y -= (overlap * (bullet.y - closestPointY)) / distance;
          }
        }


      }
    }
  }

  for (let socket in sockets) {
    sockets[socket].emit(
      "serverUpdate",
      getVisiblePlayers(players[sockets[socket].id]),
      getVisibleBullets(players[sockets[socket].id]),
      calculateVisibleDecoSprites(players[sockets[socket].id])
    );
  }
}

function playerDied(playerId){
  let newPlayer = new Player(sockets[playerId], true);
  leaderboardInfos = leaderboardInfos.filter((player) => player.id != playerId)
  players[playerId] = newPlayer;
  sockets[playerId].emit("died", newPlayer);
}

setInterval(serverUpdate, updateTime);
setInterval(updateLeaderboard, 1000);

function updateLeaderboard() {
  let sortedTop10 = getTopScores(10);

  /*for(let i=0; i < sortedTop10.length; i++) {
    sortedTop10[i] = {name:players[sortedTop10[i].id].name, score:sortedTop10[i].score};
  }*/

  for (let socket in sockets) {
    sockets[socket].emit("leaderboardUpdate", sortedTop10);
  }
}

function getTopScores(n) {
  let arr = leaderboardInfos;
  if (n > arr.length) {
    n = arr.length;
  }
  return arr
    .sort(function (a, b) {
      return b.score - a.score;
    })
    .slice(0, n); //Exception arr.sort(...) is not a function
}

const PORT = argv.port ?? 8080;
server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});

function getRandomColor() {
  return `rgb(${Math.floor(Math.random() * 255)},${Math.floor(
    Math.random() * 255
  )},${Math.floor(Math.random() * 255)})`;
}

function genId() {
  return Math.floor((1 + Math.random()) * 0x100000000)
    .toString(16)
    .substring(1)
    .toString();
  player;
}

function getVisiblePlayers(ownPlayer) {
  let visiblePlayers = {};

  if (ownPlayer) {
    let ownX = ownPlayer.x;
    let ownY = ownPlayer.y;
    let screenWidth = ownPlayer.screenWidth;
    let screenHeight = ownPlayer.screenHeight;

    for (let player in players) {
      let otherPlayer = players[player];
      if (!otherPlayer.dead) {
        if (
          otherPlayer.x >= ownX - screenWidth / 2 &&
          otherPlayer.x <= ownX + screenWidth / 2
        ) {
          //x-check
          if (
            otherPlayer.y >= ownY - screenHeight / 2 &&
            otherPlayer.y <= ownY + screenHeight / 2
          )
            //y-check
            visiblePlayers[otherPlayer.id] = otherPlayer;
        } //add radius
      }
    }
  }
  return visiblePlayers;
}

function getVisibleBullets(ownPlayer) {
  let visibleBullets = {};

  if (ownPlayer) {
    let ownX = ownPlayer.x;
    let ownY = ownPlayer.y;
    let screenWidth = ownPlayer.screenWidth;
    let screenHeight = ownPlayer.screenHeight;

    for (let bullet in bullets) {
      let bulletToCheck = bullets[bullet];
      if (
        bulletToCheck.x >= ownX - screenWidth / 2 &&
        bulletToCheck.x <= ownX + screenWidth / 2
      ) {
        //x-check
        if (
          bulletToCheck.y >= ownY - screenHeight / 2 &&
          bulletToCheck.y <= ownY + screenHeight / 2
        )
          //y-check
          visibleBullets[bulletToCheck.id] = bulletToCheck;
      } //add radius
    }
  }

  return visibleBullets;
}

function calculateVisibleDecoSprites(ownPlayer) {
  let visibleDecoSpriteIds = {};

  if (ownPlayer) {
    let ownX = ownPlayer.x;
    let ownY = ownPlayer.y;
    let screenWidth = ownPlayer.screenWidth;
    let screenHeight = ownPlayer.screenHeight;

    for (let decoSprite in decoSprites) {
      let dsToCheck = decoSprites[decoSprite];
      if (
        dsToCheck.x + dsToCheck.sizeX / 2 >= ownX - screenWidth / 2 &&
        dsToCheck.x - dsToCheck.sizeX / 2 <= ownX + screenWidth / 2
      ) {
        //x-check
        if (
          dsToCheck.y + dsToCheck.sizeY / 2 >= ownY - screenHeight / 2 &&
          dsToCheck.y - dsToCheck.sizeY / 2 <= ownY + screenHeight / 2
        )
          //y-check
          visibleDecoSpriteIds[dsToCheck.id] = dsToCheck.id;
      }
    }

    return visibleDecoSpriteIds;
  }
}

// CIRCLE/RECTANGLE
function circleRect(cx, cy, radius, rx, ry, rw, rh) {
  // temporary variables to set edges for testing
  let testX = cx;
  let testY = cy;

  // which edge is closest?
  if (cx < rx) testX = rx; // test left edge
  else if (cx > rx + rw) testX = rx + rw; // right edge
  if (cy < ry) testY = ry; // top edge
  else if (cy > ry + rh) testY = ry + rh; // bottom edge

  // get distance from closest edges
  let distX = cx - testX;
  let distY = cy - testY;
  let distance = Math.sqrt(distX * distX + distY * distY);

  // if the distance is less than the radius, collision!
  if (distance <= radius) {
    return true;
  }
  return false;
}

// obstacles/circle
function checkPlayerObsCollision(player, obs) {
  for (let i = 0; i < obs.coords.length - 1; i++) {
    const collision = lineCircle(
      obs.coords[i].x,
      obs.coords[i].y,
      obs.coords[i + 1].x,
      obs.coords[i + 1].y,
      player.x,
      player.y,
      player.radius
    );
    if (collision) {
      return collision;
    }
  }
  return false;
}

// LINE/CIRCLE
function lineCircle(x1, y1, x2, y2, cx, cy, r) {
  // is either end INSIDE the circle?
  // if so, return true immediately
  let inside1 = pointCircle(x1, y1, cx, cy, r);
  let inside2 = pointCircle(x2, y2, cx, cy, r);
  if (inside1 || inside2) {
    return inside1 || inside2;
  }

  // get length of the line
  let distX = x1 - x2;
  let distY = y1 - y2;
  let len = Math.sqrt(distX * distX + distY * distY);

  // get dot product of the line and circle
  let dot = ((cx - x1) * (x2 - x1) + (cy - y1) * (y2 - y1)) / Math.pow(len, 2);

  // find the closest point on the line
  let closestX = x1 + dot * (x2 - x1);
  let closestY = y1 + dot * (y2 - y1);

  // is this point actually on the line segment?
  // if so keep going, but if not, return false
  let onSegment = linePoint(x1, y1, x2, y2, closestX, closestY);
  if (!onSegment) return false;

  // get distance to closest point
  distX = closestX - cx;
  distY = closestY - cy;
  let distance = Math.sqrt(distX * distX + distY * distY);

  if (distance <= r) {
    // return true;
    return r - distance;
  }
  return false;
}

// POINT/CIRCLE
function pointCircle(px, py, cx, cy, r) {
  // get distance between the point and circle's center
  // using the Pythagorean Theorem
  let distX = px - cx;
  let distY = py - cy;
  let distance = Math.sqrt(distX * distX + distY * distY);

  // if the distance is less than the circle's
  // radius the point is inside!
  if (distance <= r) {
    return r - distance;
  }
  return false;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// LINE/POINT
function linePoint(x1, y1, x2, y2, px, py) {
  // get distance from the point to the two ends of the line
  let d1 = dist(px, py, x1, y1);
  let d2 = dist(px, py, x2, y2);

  // get the length of the line
  let lineLen = dist(x1, y1, x2, y2);

  // since floats are so minutely accurate, add
  // a little buffer zone that will give collision
  let buffer = 0.1; // higher # = less accurate

  // if the two distances are equal to the line's
  // length, the point is on the line!
  // note we use the buffer here to give a range,
  // rather than one #
  if (d1 + d2 >= lineLen - buffer && d1 + d2 <= lineLen + buffer) {
    return true;
  }
  return false;
}

function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}
