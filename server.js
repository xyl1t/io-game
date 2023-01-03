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
const PORT = argv.port ?? 8080;

import { createServer } from "http";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

import { randBetween, dist, genId, getRandomColor } from "./lib/util.js";
import {
  Player,
  players,
  setPlayer,
  removePlayer,
  getVisiblePlayers,
} from "./lib/players.js";
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
  generateDecoSprites,
  calculateVisibleDecoSprites,
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

console.log("[server] starting server");
server.listen(PORT, () => {
  console.log(`[server] listening on *:${PORT}`);
});

const sockets = {};

const millisBetweenShots = 150;

generateDecoSprites(32);

const tps = 1000 / 60; // ticks per second
const simulationUpdates = 4; // number of physics updates in one tick

let lastTime = Date.now();
let curTime = Date.now();
let deltaTime = 0;

io.use((socket, next) => {
  // const username = socket.handshake.auth.username;
  // if (!username) {
  //   return next(new Error("invalid username"));
  // }
  // socket.username = username;
  next();
});

io.on("connection", (socket) => {
  // const token = socket.handshake.auth.token;
  // if (token != "actualUser") socket.disconnect(true);

  let player = new Player(socket);
  sockets[socket.id] = socket;
  console.log("[io:connection]", players);
  socket.emit("welcome", socket.id, map, sprites, obstacles);

  socket.on("disconnect", () => {
    removePlayer(socket.id);
    delete sockets[socket.id];
    console.log("[io:disconnect]", players);
  });

  // NOTE: called when a player joins the game, this could also be a respawn!
  socket.on("join", (playerInfo) => {
    player = new Player(
      socket,
      playerInfo.name,
      playerInfo.visibleGameWidth,
      playerInfo.visibleGameHeight
    );
    player.alive = true;
    setPlayer(player);
    io.emit("playerJoin", player);
    console.log("[io:join]", player);
  });

  socket.on("mouseMove", (mouseInfo) => {
    player.turretAngle = mouseInfo.angle;
  });

  socket.on("playerMove", (moveInfo) => {
    player.accX = player.speed * Math.cos(moveInfo.direction);
    player.accY = player.speed * Math.sin(moveInfo.direction);
  });

  socket.on("playerScreenResize", (width, height) => {
    player.visibleGameWidth = width;
    player.visibleGameHeight = height;
  });

  socket.on("shoot", () => {
    if (player.alive && Date.now() - player.lastShotTime > millisBetweenShots) {
      setBullet(new Bullet(player));
      player.lastShotTime = Date.now();
    }
  });
});

function serverUpdate() {
  lastTime = curTime;
  curTime = Date.now();
  deltaTime = (curTime - lastTime) / 100;

  let simDeltaTime = deltaTime / simulationUpdates;

  for (let iSim = 0; iSim < simulationUpdates; iSim++) {
    for (const p of Object.values(players)) {
      p.velX += p.accX * simDeltaTime;
      p.velY += p.accY * simDeltaTime;
      p.x += p.velX * simDeltaTime;
      p.y += p.velY * simDeltaTime;
      p.velX *= 0.96;
      p.velY *= 0.96;
      p.accX = 0;
      p.accY = 0;
    }

    for (const b of Object.values(bullets)) {
      if (b.range > 0) {
        b.range -= b.speed * simDeltaTime;
        b.x += b.speed * simDeltaTime * Math.cos(b.angle);
        b.y += b.speed * simDeltaTime * Math.sin(b.angle);

        for (const p of Object.values(players)) {
          if (!p.alive) continue;

          const distX = p.x - b.x;
          const distY = p.y - b.y;
          const distance = Math.sqrt(distX * distX + distY * distY);
          if (p.id != b.playerId && distance <= p.radius + b.radius) {
            p.hp -= b.damage;
            p.specialColor = "#FF0000";

            setTimeout(() => {
              players[p.id].specialColor = undefined;
            }, 100);

            removeBullet(b);
          }
          // player died
          if (p.hp <= 0) {
            p.alive = false;
            sockets[p.id].emit("died", p.id);
          }
        }
      } else {
        removeBullet(b);
      }
    }

    // resolve player collision
    for (const obs of obstacles) {
      for (let i = 0; i < obs.coords.length - 1; i++) {
        let s = obs.coords[i];
        let e = obs.coords[i + 1];

        for (const player of Object.values(players)) {
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

        for (const bullet of Object.values(bullets)) {
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

            delete removeBullet(bullet);
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

setInterval(serverUpdate, tps);
