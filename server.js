const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static("public"));

const clicks = [];

io.on("connection", (socket) => {
  console.log("a new user connected");

  socket.on("click", mouseInfo => {
    clicks.push(mouseInfo);
    console.log("click", mouseInfo);
  })
});

function serverUpdate() {
  io.emit("serverUpdate", clicks);
}

setInterval(serverUpdate, 1000 / 60);

const PORT = 9500;
server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});

function getRandomColor() {
  return `rgb(${Math.floor(Math.random() * 255)},${Math.floor(
    Math.random() * 255
  )},${Math.floor(Math.random() * 255)})`;
}
