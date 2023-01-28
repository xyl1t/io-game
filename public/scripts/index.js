import { Position } from "/components/Position.js";
import { Velocity } from "/components/Velocity.js";
import { Sprite } from "/components/Sprite.js";
import { renderingSystem } from "/systems/RenderingSystem.js";
import {
  defineSerializer,
  defineDeserializer,
  createWorld,
  removeEntity,
  addEntity,
  addComponent,
  removeComponent,
  registerComponents,
  resetWorld,
  DESERIALIZE_MODE,
} from "/bitecs.js";

$(async () => {
  await setup();
  gameloop();
});

let socket;

const imagePaths = [
  "../assets/tank_blue.png",
  "../assets/tank_green.png",
  "../assets/tank_red.png",
];
const images = [];

let canvas;
let ctx;
// TODO: I think we will need two world, one represents the client state and
// the other is the world we got from the server, but it's ok as it is for now
let world = createWorld();
// WARNING: VERY IMPORTANT, server and client worlds have to have the same
// components, otherwise the serialisation won't work
registerComponents(world, [Position, Sprite, Velocity]);
const serialize = defineSerializer(world); // to serialize client state and send to server (eg. player input)
const deserialize = defineDeserializer(world); // to deserialize server state


async function setup() {
  await loadImages();

  canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx = canvas.getContext("2d");

  world.canvas = canvas;

  world.ctx = ctx;
  world.images = images;
  world.tickRate = 60;
  world.dt = 1 / world.tickRate;
  world.currentTick = 0;

  socket = io({
    auth: {
      token: "actualUser",
    },
  });

  socket.on("serverUpdate", (packet) => {
    // NOTE: Reset the world and register components again, if you don't do this,
    // deleting entities in the server won't be visible on the client
    resetWorld(world);
    registerComponents(world, [Position, Sprite, Velocity]);

    // NOTE: notice the mode is MAP, this is necessary to sync with the server
    // the return value is actually not needed
    const deserializedEntIds = deserialize(world, packet, DESERIALIZE_MODE.MAP);
  });
}

async function loadImages() {
  return new Promise((resolve, reject) => {
    let countLoadedImages = 0; // resolve promise when the number of loaded images is equal to imagePaths.length
    for (const imgPath of imagePaths) {
      const img = new Image();
      img.src = imgPath;
      img.onload = () => {
        if (++countLoadedImages == imagePaths.length) resolve();
      };
      images.push(img);
    }
  });
}

let oldTime = 0;
let accumulator = 0;
function gameloop(currentTime = 0) {
  currentTime /= 1000; // convert from ms to seconds
  const frameTime = currentTime - oldTime;
  oldTime = currentTime;
  accumulator += frameTime;

  while (accumulator >= world.dt) {
    // NOTE: game logic here (input, client prediction, etc.)
    // gameLogicSomethingSystem(world);

    // don't touch this
    accumulator -= world.dt;
    world.currentTick++;
  }

  // TODO: interpolate game states for rendering?
  renderingSystem(world);

  window.requestAnimationFrame(gameloop);
}

/*

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
