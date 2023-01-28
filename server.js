/*************************************************************************** */
/*                          IO-Game over WebSockets                          */
/*                                                                           */
/*  Marat Isaw, Benjamin Terbul, Justus Arndt, Paul Trattnig, Thomas Fischer */
/*  HTL Villach - Abteilung Informatik - 4AHIF                               */
/*  (c) 2022/23                                                              */
/*************************************************************************** */

/*
TODO:
- tickrate between client and server must be the same, is this right
- ECS?
- properly do physics updates
- correctly restructure game.js, client.js and index.js
  index.js: entry point -- setup, handle events?
  game.js: game logic
  client.js: shared data between index.js and game.js
- handle players window resize in server instead of client
*/

"use strict";

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
const argv = yargs(hideBin(process.argv)).argv;

import express from "express";
const app = express();
const PORT = argv.port ?? 8080;

import { createServer } from "http";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

import {
  randBetween,
  dist,
  genId,
  getRandomColor,
  vecAngle,
  bufferSize,
  StatePayload,
} from "./lib/util.js";
import { Player, players, getVisiblePlayers } from "./lib/players.js";
import {
  Bullet,
  bullets,
  setBullet,
  removeBullet,
  getVisibleBullets,
} from "./lib/bullets.js";
import {
  Sprite,
  sprites,
  generateBushes,
  getVisibleSpriteIds,
} from "./lib/sprites.js";
import { Obstacle, obstacles } from "./lib/obstacles.js";
import { map } from "./lib/maps.js";

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});
instrument(io, {
  auth: false,
  mode: "development",
});

app.use(express.static("public"));
app.use(express.static("./"));

console.log("[server] starting server");
server.listen(PORT, () => {
  console.log(`[server] listening on *:${PORT}`);
});

const sockets = {};

const millisBetweenShots = 150;

generateBushes(32);

// io.use((socket, next) => {
//   next();
// });

const tickRate = 60;
const dt = 1 / tickRate;

let currentTime = Date.now() / 1000;
let oldTime = currentTime;
let accumulator = 0;
let currentTick = 0;

const stateBuffer = [];
const inputQueue = {};

io.on("connection", (socket) => {
  // const token = socket.handshake.auth.token;
  // if (token != "actualUser") socket.disconnect(true);

  let player = new Player(socket.id);
  sockets[socket.id] = socket;
  inputQueue[socket.id] = [];
  console.log("[io:connection]", players);
  socket.emit("welcome", socket.id, map, sprites, obstacles);

  socket.on("disconnect", () => {
    players.splice(
      players.findIndex((p) => p.id == socket.id),
      1
    );
    delete sockets[socket.id];
    delete inputQueue[socket.id];
    console.log("[io:disconnect]", players);
  });

  // NOTE: called when a player joins the game, this could also be a respawn!
  socket.on("join", (playerInfo) => {
    player = new Player(
      socket.id,
      playerInfo.name,
      playerInfo.visibleGameWidth,
      playerInfo.visibleGameHeight
    );
    player.alive = true;
    players.push(player);
    io.emit("playerJoin", player);
    console.log("[io:join]", player);
  });

  socket.on("playerInput", (inputPayload) => {
    inputQueue[inputPayload.playerId].push(inputPayload);
  });

  // socket.on("playerInput", (inputPayload) => {
  //   let {inputVector, mouse} = inputPayload;
  //   player.turretAngle = mouse.angle;
  //   if (mouse.shooting) {
  //     if (player.alive && Date.now() - player.lastShotTime > millisBetweenShots) {
  //       setBullet(new Bullet(player));
  //       player.lastShotTime = Date.now();
  //     }
  //   }
  //   if (inputVector.x || inputVector.y) {
  //     const direction = vecAngle(inputVector.x, inputVector.y);
  //     player.accX = player.speed * Math.cos(direction);
  //     player.accY = player.speed * Math.sin(direction);
  //   }
  //   // console.log(inputPayload)
  // });

  // socket.on("mouseMove", (mouseInfo) => {
  //   player.turretAngle = mouseInfo.angle;
  // });
  //
  // socket.on("playerMove", (moveInfo) => {
  //   // TODO: add acceleration directly to the velocity and remove acceleration properties
  //   player.accX = player.speed * Math.cos(moveInfo.direction);
  //   player.accY = player.speed * Math.sin(moveInfo.direction);
  // });
  //
  // socket.on("playerScreenResize", (width, height) => {
  //   player.visibleGameWidth = width;
  //   player.visibleGameHeight = height;
  // });
  //
  // socket.on("shoot", () => {
  //   if (player.alive && Date.now() - player.lastShotTime > millisBetweenShots) {
  //     setBullet(new Bullet(player));
  //     player.lastShotTime = Date.now();
  //   }
  // });
});

function serverUpdate() {
  oldTime = currentTime;
  currentTime = Date.now() / 1000;
  const frameTime = currentTime - oldTime;
  accumulator += frameTime;

  while (accumulator >= dt) {
    for (let player of players) {
      const visPlayers = getVisiblePlayers(player);
      const visBullets = getVisibleBullets(player);
      const visSpriteIds = getVisibleSpriteIds(player);

      sockets[player.id].emit("serverUpdate",
        visPlayers,
        visBullets,
        visSpriteIds
      );

      const iq = inputQueue[player.id];

      let bufferIdx = -1;
      while (iq.length > 0) {
        const ip = iq.shift();
        bufferIdx = ip.tick % bufferSize;
        const sp = processInput(player, ip);
        stateBuffer[bufferIdx] = sp;
      }

      if (bufferIdx != -1) {
        sockets[player.id].emit("playerStateUpdate",
          stateBuffer[bufferIdx],
          visPlayers,
          visBullets,
          visSpriteIds
        );
        // console.log(stateBuffer[bufferIdx]);
      }
    }

    accumulator -= dt;
    currentTick++;
  }

  // const simulationUpdates = 1; // number of physics updates in one tick
  // let simDeltaTime = dt / simulationUpdates;
  //
  // for (let iSim = 0; iSim < simulationUpdates; iSim++) {
  //   for (const p of players) {
  //     p.velX += p.accX * simDeltaTime;
  //     p.velY += p.accY * simDeltaTime;
  //     p.x += p.velX * simDeltaTime;
  //     p.y += p.velY * simDeltaTime;
  //     p.velX *= 0.96;
  //     p.velY *= 0.96;
  //     p.accX = 0; // NOTE this should be set after thee simulationUpdates loop!
  //     p.accY = 0;
  //   }
  //
  //   for (const b of Object.values(bullets)) {
  //     if (b.range > 0) {
  //       b.range -= b.speed * simDeltaTime;
  //       b.x += b.speed * simDeltaTime * Math.cos(b.angle);
  //       b.y += b.speed * simDeltaTime * Math.sin(b.angle);
  //
  //       for (const p of players) {
  //         if (!p.alive) continue;
  //
  //         const distX = p.x - b.x;
  //         const distY = p.y - b.y;
  //         const distance = Math.sqrt(distX * distX + distY * distY);
  //         if (p.id != b.playerId && distance <= p.radius + b.radius) {
  //           p.hp -= b.damage;
  //           p.specialColor = "#FF0000";
  //
  //           setTimeout(() => {
  //             p.specialColor = undefined;
  //           }, 100);
  //
  //           removeBullet(b);
  //         }
  //         // player died
  //         if (p.hp <= 0) {
  //           p.alive = false;
  //           players.splice(
  //             players.findIndex((pl) => pl.id == p.id),
  //             1
  //           );
  //           sockets[p.id].emit("died", p.id);
  //         }
  //       }
  //     } else {
  //       removeBullet(b);
  //     }
  //   }
  //
  //   // resolve player collision
  //   for (const obs of obstacles) {
  //     for (let i = 0; i < obs.coords.length - 1; i++) {
  //       let s = obs.coords[i];
  //       let e = obs.coords[i + 1];
  //
  //       for (const player of players) {
  //         let lineX1 = e.x - s.x;
  //         let lineY1 = e.y - s.y;
  //         let lineX2 = player.x - s.x;
  //         let lineY2 = player.y - s.y;
  //
  //         let edgeLength = lineX1 * lineX1 + lineY1 * lineY1;
  //
  //         let t =
  //           Math.max(
  //             0,
  //             Math.min(edgeLength, lineX1 * lineX2 + lineY1 * lineY2)
  //           ) / edgeLength;
  //
  //         let closestPointX = s.x + t * lineX1;
  //         let closestPointY = s.y + t * lineY1;
  //
  //         let distance = dist(player.x, player.y, closestPointX, closestPointY);
  //
  //         if (distance <= player.radius + obs.radius) {
  //           // static collision has occurred
  //           const overlap = 1.0 * (distance - player.radius - obs.radius);
  //
  //           player.x -= (overlap * (player.x - closestPointX)) / distance;
  //           player.y -= (overlap * (player.y - closestPointY)) / distance;
  //         }
  //       }
  //
  //       for (const bullet of Object.values(bullets)) {
  //         let lineX1 = e.x - s.x;
  //         let lineY1 = e.y - s.y;
  //         let lineX2 = bullet.x - s.x;
  //         let lineY2 = bullet.y - s.y;
  //
  //         let edgeLength = lineX1 * lineX1 + lineY1 * lineY1;
  //
  //         let t =
  //           Math.max(
  //             0,
  //             Math.min(edgeLength, lineX1 * lineX2 + lineY1 * lineY2)
  //           ) / edgeLength;
  //
  //         let closestPointX = s.x + t * lineX1;
  //         let closestPointY = s.y + t * lineY1;
  //
  //         let distance = dist(bullet.x, bullet.y, closestPointX, closestPointY);
  //
  //         if (distance <= bullet.radius + obs.radius) {
  //           // static collision has occurred
  //           const overlap = 1.0 * (distance - bullet.radius - obs.radius);
  //
  //           delete removeBullet(bullet);
  //           // bullet.x -= (overlap * (bullet.x - closestPointX)) / distance;
  //           // bullet.y -= (overlap * (bullet.y - closestPointY)) / distance;
  //         }
  //       }
  //     }
  //   }
  // }

  // for (let player of players) {
  //   sockets[player.id].emit(
  //     "serverUpdate",
  //     player,
  //     getVisiblePlayers(player), // TODO: send ids instead of players or only the informating neccessary for drawing
  //     getVisibleBullets(player),
  //     getVisibleSpriteIds(player)
  //   );
  // }
}

setInterval(serverUpdate, dt * 1000);

function processInput(player, inputPayload) {
  player.turretAngle = inputPayload.turretAngle;

  player.x += inputPayload.inputX * 100 * dt;
  player.y += inputPayload.inputY * 100 * dt;

  return new StatePayload(
    inputPayload.tick,
    inputPayload.playerId,
    player.x,
    player.y,
    player.turretAngle
  );
}
