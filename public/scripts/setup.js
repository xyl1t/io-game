import { registerComponents } from "/bitecs.js";
import { world, deserialize } from "./world.js";
import {
  getAllEntities,
  removeEntity,
  resetWorld,
  flushRemovedEntities,
  DESERIALIZE_MODE,
} from "/bitecs.js";

import { Position } from "/components/Position.js";
import { Velocity } from "/components/Velocity.js";
import { Sprite } from "/components/Sprite.js";
import { Player } from "/components/Player.js";

export async function setup() {
  await setupWorldParameters();
  await loadImages();
  await setupCanvas();
  await setupEvents();
  await setupConnection();
}

export async function setupWorldParameters() {
  world.tickRate = 60;
  world.dt = 1 / world.tickRate;
  world.currentTick = 0;
  world.imagePaths = [
    "../assets/tank_blue.png",
    "../assets/tank_green.png",
    "../assets/tank_red.png",
  ];
}

export async function loadImages() {
  const images = [];
  const imagesMap = {};

  const getFileName = (path) => path.split("/").pop().split(".")[0];

  for (const imgPath of world.imagePaths) {
    const img = new Image();
    img.src = imgPath;
    await img.decode(); // wait till image is actually loaded
    images.push(img);
    imagesMap[getFileName(imgPath)] = img; // ehhh, not the best option
  }

  world.images = images;
  world.imagesMap = imagesMap;
}

export async function setupCanvas() {
  const canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  world.canvas = canvas;
  world.ctx = world.canvas.getContext("2d");
}

export async function setupEvents() {
  window.addEventListener("resize", resize, false);
  world.canvas.addEventListener("mousedown", mousedown, false);
  world.canvas.addEventListener("mouseup", mouseup, false);
  world.canvas.addEventListener("mouseleave", mouseleave, false);
  world.canvas.addEventListener("mousemove", mousemove, false);
  world.canvas.addEventListener("wheel", wheel, false);
  window.addEventListener("keydown", keydown, true);
  window.addEventListener("keyup", keyup, true);
}

export async function setupConnection() {
  world.socket = io({
    auth: {
      token: "actualUser",
    },
  });

  world.socket.on("serverUpdate", (packet) => {
    // NOTE: Reset the world, if this is not done, entities that were
    // delted/removed in the server won't be reflected on the client
    // TODO: maybe delete those entities (deleted on the server) manually?
    // WARN: doesn't work properly!!! -> can't add
    // entities back normally

    // resetWorld(world);

    // NOTE: notice the mode is MAP, this is necessary to sync with the server
    const deserializedEntIds = deserialize(world, packet, DESERIALIZE_MODE.MAP);
    // NOTE: Remove all entities that are no longer in the server
    // eg: player disconnected
    // NOTE: This really hinders performance, this is O(n^2)
    getAllEntities(world).forEach(eid => {
      if (!deserializedEntIds.includes(eid)) removeEntity(world, eid);
    })
  });
}

function resize() {
  console.log("resize");
  world.canvas.width = window.innerWidth;
  world.canvas.height = window.innerHeight;
  world.canvas.style.width = window.innerWidth + "px";
  world.canvas.style.height = window.innerHieght + "px";
}
function mousedown(e) {
  console.log("mousedown");
}
function mouseup(e) {
  console.log("mouseup");
}
function mouseleave(e) {
  console.log("mouseleave");
}
function mousemove(e) {
  console.log("mousemove");
}
function wheel(e) {
  console.log("wheel");
}
function keydown(e) {
  console.log("keydown");
}
function keyup(e) {
  console.log("keyup");
}
