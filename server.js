/*************************************************************************** */
/*                          IO-Game over WebSockets                          */
/*                                                                           */
/*  Marat Isaw, Benjamin Terbul, Justus Arndt, Paul Trattnig, Thmoas Fischer */
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

const updateTime = 1000 / 30;

const sockets = {};

const players = {};
const bullets = {};
const obstacles = {};
const map = {
  name: "map",
  width: 5000,
  height: 5000,
};

function generateObstacles(count) {
  for (let i = 0; i < count; i++) {
    const id = genId();
    const maxX = map.width/2;
    const minX = -map.width/2;
    const maxY = map.height/2;
    const minY = -map.height/2;
    obstacles[id] = {
      type: "bush",
      x: Math.random() * (maxX - minX) + minX,
      y: Math.random() * (maxY - minY) + minY,
    };
  }
}

generateObstacles(32);

io.on("connection", (socket) => {
  const token = socket.handshake.auth.token;
  if (token != "actualUser") socket.disconnect(true);

  let newPlayer = {
    id: socket.id,
    x: 0,
    y: 0,
    color: getRandomColor(),
    angle: 0,
    radius: 16,
    name: "",
    hp: 100,
    speed: 3,
  };

  sockets[newPlayer.id] = socket;

  console.log("a new player connected", players);

  socket.emit("welcome", newPlayer, map, obstacles);

  socket.on("disconnect", () => {
    delete players[socket.id];
    delete sockets[socket.id];
    console.log("a player disconnected", players);
  });

  socket.on("join", (player) => {
    players[player.id] = player;
    socket.broadcast.emit("playerJoin", player); // not yet handled in client
  });

  socket.on("playerUpdate", (player) => {
    players[player.id] = player;
    console.log("playerUpdate", player);
  });

  socket.on("shoot", (player) => {
    const bulletId = genId();
    bullets[bulletId] = {
      id: bulletId,
      playerId: player.id,
      angle: player.angle,
      speed: 16,
      x: player.x,
      y: player.y,
      radius: 6,
      color: player.color,
      range: 1000, // pixels
      damage: 10, // hp
    };
  });
});

function serverUpdate() {
  for (const bId in bullets) {
    const b = bullets[bId];
    b.range -= b.speed;
    if (b.range > 0) {
      b.x += b.speed * Math.cos(b.angle);
      b.y += b.speed * Math.sin(b.angle);

      for (const pId in players) {
        const p = players[pId];
        const distX = p.x - b.x;
        const distY = p.y - b.y;
        const distance = Math.sqrt(distX * distX + distY * distY);
        if (pId != b.playerId && distance <= p.radius + b.radius) {
          p.hp -= b.damage;
          delete bullets[bId];
        }
      }
    } else {
      delete bullets[bId];
    }
  }

  io.emit("serverUpdate", players, bullets);
}

setInterval(serverUpdate, updateTime);

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
}
