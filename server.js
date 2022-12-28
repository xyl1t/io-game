/*************************************************************************** */
/*                          IO-Game over WebSockets                          */
/*                                                                           */
/*  Marat Isaw, Benjamin Terbul, Justus Arndt, Paul Trattnig, Thomas Fischer */
/*  HTL Villach - Abteilung Informatik - 4AHIF                               */
/*  (c) 2022/23                                                              */
/*************************************************************************** */
"use strict";

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
const argv = yargs(hideBin(process.argv)).argv;

import express from "express";
const app = express();
import http from "http";
const server = http.createServer(app);
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

const io = new Server(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true
  }
});
instrument(io, {
  auth: false,
  mode: "development",
});

import {
  randBetween,
  dist,
  genId,
  getRandomColor,
} from "./helpers/helperFunctions.js";

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

const millisBetweenShots = 150;
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
    this.name = "";
    this.hp = 100;
    this.speed = 150;
    this.accX = 0;
    this.accY = 0;
    this.velX = 0;
    this.velY = 0;
    this.x = randBetween(-300, 300);
    this.y = randBetween(-300, 300);
    this.turretAngle = 0;
    this.movementAngle = 0;
    this.color = getRandomColor();
    this.specialColor = undefined;
    this.radius = 16;
    this.lastShotTime = 0;
    this.dead = isDead || false;
    this.visibleGameWidth = 0;
    this.visibleGameHeight = 0;
  }
}

obstacles.push(
  new Obstacle("line", 16, [
    { x: -1575, y: -368 },
    { x: -1456, y: -329 },
    { x: -1359, y: -253 },
    { x: -1299, y: -170 },
    { x: -1273, y: -87 },
    { x: -1263, y: -4 },
    { x: -1240, y: 15 },
    { x: -1200, y: -16 },
    { x: -1140, y: -56 },
    { x: -1080, y: -87 },
    { x: -1009, y: -104 },
    { x: -953, y: -103 },
    { x: -894, y: -96 },
    { x: -857, y: -89 },
    { x: -833, y: -107 },
    { x: -786, y: -182 },
    { x: -722, y: -247 },
    { x: -681, y: -287 },
    { x: -640, y: -386 },
    { x: -636, y: -439 },
    { x: -673, y: -559 },
    { x: -682, y: -635 },
    { x: -678, y: -719 },
    { x: -651, y: -837 },
    { x: -651, y: -928 },
    { x: -661, y: -1008 },
    { x: -660, y: -1107 },
    { x: -707, y: -1176 },
    { x: -751, y: -1237 },
    { x: -818, y: -1272 },
    { x: -818, y: -1273 },
    { x: -871, y: -1297 },
    { x: -922, y: -1349 },
    { x: -983, y: -1357 },
    { x: -1064, y: -1328 },
    { x: -1134, y: -1293 },
    { x: -1202, y: -1220 },
    { x: -1241, y: -1134 },
    { x: -1253, y: -1058 },
    { x: -1266, y: -980 },
    { x: -1310, y: -945 },
    { x: -1380, y: -904 },
    { x: -1427, y: -859 },
    { x: -1459, y: -810 },
    { x: -1484, y: -747 },
    { x: -1507, y: -687 },
    { x: -1561, y: -615 },
    { x: -1589, y: -557 },
    { x: -1601, y: -479 },
    { x: -1595, y: -427 },
    { x: -1593, y: -398 },
    { x: -1575, y: -368 },
  ])
);

obstacles.push(
  new Obstacle("line", 4, [
    { x: 0, y: 100 },
    { x: 0, y: 200 },
    { x: -100, y: 300 },
  ])
);
obstacles.push(
  new Obstacle("line", 4, [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
  ])
);
obstacles.push(
  new Obstacle("line", 4, [
    { x: -100, y: -100 },
    { x: -283, y: -182 },
  ])
);
obstacles.push(
  new Obstacle("line", 4, [
    { x: -150, y: -100 },
    { x: -383, y: -142 },
  ])
);

io.on("connection", (socket) => {
  const token = socket.handshake.auth.token;
  if (token != "actualUser") socket.disconnect(true);

  sockets[socket.id] = socket;
  console.log("a new player connected", players);
  socket.emit("welcome", socket.id, map, decoSprites, obstacles);

  socket.on("disconnect", () => {
    leaderboardInfos = leaderboardInfos.filter(
      (score) => score.id != socket.id
    );
    delete players[socket.id];
    delete sockets[socket.id];
    console.log("a player disconnected", players);
  });

  socket.on("join", (player) => {
    let newPlayer = new Player(socket);
    newPlayer.name = player.name;
    newPlayer.visibleGameWidth = player.visibleGameWidth;
    newPlayer.visibleGameHeight = player.visibleGameHeight;
    console.log(" new player joined", newPlayer);

    players[newPlayer.id] = newPlayer;
    players[newPlayer.id].lastShotTime = 0;
    leaderboardInfos = leaderboardInfos.filter(
      (score) => score.id != newPlayer.id
    );
    leaderboardInfos.push({ id: newPlayer.id, name: newPlayer.name, score: 0 });
    io.emit("playerJoin", newPlayer); // not yet handled in client
  });

  socket.on("mouseMove", (player) => {
    if (players[player.id]) {
      players[player.id].turretAngle = player.turretAngle;
    }
  });

  socket.on("playerMove", (player) => {
    if (players[player.id]) {
      players[player.id].accX = player.speed * Math.cos(player.movementAngle);
      players[player.id].accY = player.speed * Math.sin(player.movementAngle);
    }
  });

  socket.on("playerScreenResize", (player) => {
    if (players[player.id]) {
      players[player.id].visibleGameWidth = player.visibleGameWidth;
      players[player.id].visibleGameHeight = player.visibleGameHeight;
    }
  });

  socket.on("shoot", (player) => {
    if (Date.now() - players[player.id].lastShotTime > millisBetweenShots) {
      const bulletId = genId();
      bullets[bulletId] = {
        id: bulletId,
        playerId: player.id,
        angle: player.turretAngle,
        speed: 100,
        x: player.x + (player.radius * 1.8 + 6) * Math.cos(player.turretAngle),
        y: player.y + (player.radius * 1.8 + 6) * Math.sin(player.turretAngle),
        radius: 6,
        color: player.color,
        range: 3000, // pixels
        damage: 10, // hp
      };
      players[player.id].lastShotTime = Date.now();
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
      p.velX *= 0.96;
      p.velY *= 0.96;
      p.accX = 0;
      p.accY = 0;
    }

    for (const bId in bullets) {
      const b = bullets[bId];
      b.range -= b.speed * simDeltaTime;
      if (b.range > 0) {
        b.x += b.speed * simDeltaTime * Math.cos(b.angle);
        b.y += b.speed * simDeltaTime * Math.sin(b.angle);

        for (const pId in players) {
          const p = players[pId];
          if (p.dead) continue;

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

            delete bullets[bullet.id];
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

function playerDied(playerId) {
  // let newPlayer = new Player(sockets[playerId], true);
  // leaderboardInfos = leaderboardInfos.filter((player) => player.id != playerId);
  // players[playerId] = newPlayer;
  players[playerId].dead = true;
  sockets[playerId].emit("died", playerId);
}

setInterval(serverUpdate, updateTime);
setInterval(updateLeaderboard, 1000);

function updateLeaderboard() {
  let sortedTop10 = getTopScores(10);

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

function getVisiblePlayers(ownPlayer) {
  // return players;
  let visiblePlayers = {};

  if (ownPlayer) {
    let ownX = ownPlayer.x;
    let ownY = ownPlayer.y;
    let screenWidth = ownPlayer.visibleGameWidth;
    let screenHeight = ownPlayer.visibleGameHeight;

    for (let player in players) {
      let otherPlayer = players[player];
      if (!otherPlayer.dead) {
        if (
          otherPlayer.x + otherPlayer.radius >= ownX - screenWidth / 2 &&
          otherPlayer.x - otherPlayer.radius <= ownX + screenWidth / 2
        ) {
          //x-check
          if (
            otherPlayer.y + otherPlayer.radius >= ownY - screenHeight / 2 &&
            otherPlayer.y - otherPlayer.radius <= ownY + screenHeight / 2
          ) {
            //y-check
            visiblePlayers[otherPlayer.id] = otherPlayer;
          }
        }
      }
    }
  }
  return visiblePlayers;
}

function getVisibleBullets(ownPlayer) {
  // return bullets;
  let visibleBullets = {};

  if (ownPlayer) {
    let ownX = ownPlayer.x;
    let ownY = ownPlayer.y;
    let screenWidth = ownPlayer.visibleGameWidth;
    let screenHeight = ownPlayer.visibleGameHeight;

    for (let bullet in bullets) {
      let bulletToCheck = bullets[bullet];
      if (
        bulletToCheck.x + bulletToCheck.radius >= ownX - screenWidth / 2 &&
        bulletToCheck.x - bulletToCheck.radius <= ownX + screenWidth / 2
      ) {
        //x-check
        if (
          bulletToCheck.y + bulletToCheck.radius >= ownY - screenHeight / 2 &&
          bulletToCheck.y - bulletToCheck.radius <= ownY + screenHeight / 2
        )
          //y-check
          visibleBullets[bulletToCheck.id] = bulletToCheck;
      } //add radius
    }
  }

  return visibleBullets;
}

function calculateVisibleDecoSprites(ownPlayer) {
  // console.log(Object.keys(decoSprites));
  // return Object.keys(decoSprites);
  let visibleDecoSpriteIds = [];

  if (ownPlayer) {
    let ownX = ownPlayer.x;
    let ownY = ownPlayer.y;
    let screenWidth = ownPlayer.visibleGameWidth;
    let screenHeight = ownPlayer.visibleGameHeight;

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
          visibleDecoSpriteIds.push(dsToCheck.id);
      }
    }

    return visibleDecoSpriteIds;
  }
}
