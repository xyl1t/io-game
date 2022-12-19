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

const clicks = [];

const players = {};
const sockets = {};

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
  };
  players[newPlayer.id] = newPlayer;
  sockets[newPlayer.id] = socket;

  console.log("a new player connected", players);

  socket.emit("welcome", newPlayer);

  socket.on("disconnect", () => {
    delete players[socket.id];
    delete sockets[socket.id];
    console.log("a player disconnected", players);
  });

  socket.on("playerUpdate", (player) => {
    players[player.id] = player;
    console.log("playerUpdate", player);
  });


  socket.on("click", (mouseInfo) => {
    clicks.push(mouseInfo);
    console.log("click", mouseInfo);
  });
});

function serverUpdate() {
  io.emit("serverUpdate", players);
}

setInterval(serverUpdate, 1000 / 60);

const PORT = argv.port ?? 8080;
server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});

function getRandomColor() {
  return `rgb(${Math.floor(Math.random() * 255)},${Math.floor(
    Math.random() * 255
  )},${Math.floor(Math.random() * 255)})`;
}
