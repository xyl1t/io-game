const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static("public"));

const components = [];
const previews = {};
const cursors = {};
const sockets = {};
const chat = [];

const theServer = {
  id: 0,
  name: "server",
  color: "rgb(255,0,0)",
};

io.on("connection", (socket) => {
  const token = socket.handshake.auth.token;
  if (token != "actualUser") socket.disconnect(true);

  const newCursor = {
    id: socket.id,
    name: "",
    color: getRandomColor(),
    x: 0,
    y: 0,
    lastHeartbeat: new Date().getTime(),
  };
  cursors[newCursor.id] = newCursor;
  sockets[newCursor.id] = socket;

  console.log("a new cursor connected", newCursor);
  console.log("all cursors", cursors);
  socket.emit("yourCursor", newCursor);
  socket.emit("chats", chat);
  const newCursorMsg = `A new <span style="color: ${newCursor.color}">cursor</span> joined!`;
  socket.broadcast.emit("chat", theServer, newCursorMsg);
  chat.push({ cursor: theServer, msg: newCursorMsg });

  socket.on("disconnect", () => {
    console.log("cursor disconnected");
    let cursorDisconnectMsg;
    const c = cursors[socket.id];
    if (c.name != "") {
      cursorDisconnectMsg = `<span style="color: ${c.color}">${c.name}</span> disconnected!`;
    } else {
      cursorDisconnectMsg = `A <span style="color: ${c.color}">cursor</span> disconnected!`;
    }
    socket.broadcast.emit("chat", theServer, cursorDisconnectMsg);
    chat.push({ cursor: theServer, msg: cursorDisconnectMsg });
    delete cursors[socket.id];
    console.log(cursors);
  });

  socket.on("addComponent", (data) => {
    components.push(data);
    if (data.length > 256) {
      components.shift();
    }
  });

  socket.on("pushPreview", (p) => {
    previews[p.id] = p;
  });

  socket.on("popPreview", (p) => {
    delete previews[p.id];
  });

  socket.on("cursorUpdate", (cursor) => {
    if (!cursors[cursor.id]) return;
    cursors[cursor.id] = cursor;
  });

  socket.on("chat", (cursor, msg) => {
    console.log("chat", cursor, msg);
    io.emit("chat", cursor, msg);
    chat.push({ cursor, msg });
  });

  socket.on("pulse", (cursor) => {
    if (!cursors[cursor.id]) return;
    cursors[cursor.id].lastHeartbeat = new Date().getTime();
  });
});

function updateCanvas() {
  for (const id in cursors) {
    // for (const comp of components) {
    // }
    if (cursors[id].lastHeartbeat + 1000 * 60 * 5 < new Date().getTime()) {
      console.log("dead ", cursors[id]);
      sockets[id].disconnect();
    }
  }

  io.emit("updateCanvas", components, previews);
}
function updateCursors() {
  for (const id in cursors) {
    if (cursors[id].lastHeartbeat + 1000 * 60 * 5 < new Date().getTime()) {
      console.log("dead ", cursors[id]);
      sockets[id].disconnect();
    }
  }
  io.emit("updateCursors", cursors);
}

setInterval(updateCanvas, 1000 / 10);
setInterval(updateCursors, 1000 / 10);

const PORT = 9500;
server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});

function getRandomColor() {
  return `rgb(${Math.floor(Math.random() * 255)},${Math.floor(
    Math.random() * 255
  )},${Math.floor(Math.random() * 255)})`;
}
