import express from "express";
const app = express();
const PORT = 3000;
import { createServer } from "http";
import { Server } from "socket.io";
const server = createServer(app);
const io = new Server(server);

import {
  createWorld,
  addEntity,
  Types,
  defineComponent,
  addComponent,
  defineQuery,
  defineSystem,
  defineSerializer,
  defineDeserializer,
  registerComponents,
  removeEntity,
  DESERIALIZE_MODE,
} from "../common/bitecs.js";
import { Position } from "../common/components/Position.js";
import { Velocity } from "../common/components/Velocity.js";
import { Sprite } from "../common/components/Sprite.js";
import { physicsSystem } from "../common/systems/PhysicsSystem.js";

const sockets = {};

// WORLD //
const world = createWorld();
// WARNING: VERY IMPORTANT, server and client worlds have to have the same
// components, otherwise the serialisation won't work
registerComponents(world, [Position, Sprite, Velocity]);

// ENTITIES //
// const player = addEntity(world);
//
// // Add position and velocity components to player
// addComponent(world, Position, player);
// addComponent(world, Velocity, player);
// addComponent(world, Sprite, player);
//
// // // Initialize to some value
// Position.x[player] = 10;
// Position.y[player] = 20;
// Velocity.x[player] = 1;
// Velocity.y[player] = 2;
// Sprite.texture[player] = 0;

app.use(express.static("public"));
app.use(express.static("common"));

io.on("connection", (socket) => {
  const token = socket.handshake.auth.token;
  if (token != "actualUser") socket.disconnect(true);

  const playerEntitiyId = addEntity(world);
  sockets[playerEntitiyId] = socket;
  console.log("[io:connection] player connected");

  addComponent(world, Position, playerEntitiyId);
  addComponent(world, Velocity, playerEntitiyId);
  addComponent(world, Sprite, playerEntitiyId);

  Position.x[playerEntitiyId] = Math.random() * 400;
  Position.y[playerEntitiyId] = Math.random() * 300;
  Velocity.x[playerEntitiyId] = Math.random() * 100 - 50;
  Velocity.y[playerEntitiyId] = Math.random() * 100 - 50;
  Sprite.texture[playerEntitiyId] = Math.round(Math.random() * 2);

  socket.on("disconnect", () => {
    removeEntity(world, playerEntitiyId);
    delete sockets[playerEntitiyId];
    console.log("[io:disconnect] player disconnected");
  });

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });
});

server.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}/`);
});

const tickRate = 60;
const dt = 1 / tickRate;
world.dt = dt;
let currentTime = Date.now() / 1000;
let oldTime = currentTime;
let accumulator = 0;
let currentTick = 0;

let timeBetweenDebugMsg = 1; // one second
let debugTimer = timeBetweenDebugMsg; // don't wait for first output
function serverUpdate() {
  oldTime = currentTime;
  currentTime = Date.now() / 1000;
  const frameTime = currentTime - oldTime;
  accumulator += frameTime;
  debugTimer += frameTime;

  while (accumulator >= dt) {
    physicsSystem(world);

    // Debug output every second
    if (debugTimer >= timeBetweenDebugMsg) {
      // console.log(Position.x[0], Position.y[0]);
      debugTimer -= timeBetweenDebugMsg;
    }

    const serialize = defineSerializer(world);
    const deserialize = defineDeserializer(world);

    const packet = serialize(world);

    for (const socket of Object.values(sockets)) {
      socket.emit("serverUpdate", packet);
    }

    accumulator -= dt;
    currentTick++;
  }
}

setInterval(serverUpdate, dt * 1000);
