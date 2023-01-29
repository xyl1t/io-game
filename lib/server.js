import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
const argv = yargs(hideBin(process.argv)).argv;

import express from "express";
const app = express();
const PORT = argv.port ?? 8080;
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
import { Player } from "../common/components/Player.js";
import { physicsSystem } from "../common/systems/PhysicsSystem.js";
import { config } from "../common/components/Config.js"

const sockets = {};

// WORLD //
const world = createWorld();
const serialize = defineSerializer(config);
const deserialize = defineDeserializer(config);

// Add some tanks
for (let i = 0; i < 15; i++) {
  const playerId = addEntity(world);

  addComponent(world, Player,   playerId);
  addComponent(world, Position, playerId);
  addComponent(world, Velocity, playerId);
  addComponent(world, Sprite,   playerId);

  Position.x[playerId] = Math.random() * 400;
  Position.y[playerId] = Math.random() * 300;
  Velocity.x[playerId] = Math.random() * 100 - 50;
  Velocity.y[playerId] = Math.random() * 100 - 50;
  Sprite.texture[playerId] = Math.round(Math.random());
}

app.use(express.static("public"));
app.use(express.static("common"));

io.on("connection", (socket) => {
  const token = socket.handshake.auth.token;
  if (token != "actualUser") socket.disconnect(true);

  const playerId = addEntity(world);
  sockets[playerId] = socket;
  console.log("[io:connection] player connected");

  addComponent(world, Player,   playerId);
  addComponent(world, Position, playerId);
  addComponent(world, Velocity, playerId);
  addComponent(world, Sprite,   playerId);

  Position.x[playerId] = Math.random() * 400;
  Position.y[playerId] = Math.random() * 300;
  Velocity.x[playerId] = Math.random() * 100 - 50;
  Velocity.y[playerId] = Math.random() * 100 - 50;
  Sprite.texture[playerId] = 2;

  socket.on("disconnect", () => {
    removeEntity(world, playerId);
    delete sockets[playerId];
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

    const packet = serialize(world);

    for (const socket of Object.values(sockets)) {
      socket.emit("serverUpdate", packet);
    }

    accumulator -= dt;
    currentTick++;
  }
}

setInterval(serverUpdate, dt * 1000);

/*

player entities
p1 p2 p3 p4

loop {
  p2
  renderDistence() {
    addComponent(InRange, p2);
    addComponent(InRange, p3);
  }

  inrangequery = createQeury([InRange]);

  inRangeEnts = inrangequery()

  for (ent in inRangeEnts) {
    removeComponent(InRange, ent);
  }

  packet = serialize(inRangeEnts)

  send(packet)

}

 */
