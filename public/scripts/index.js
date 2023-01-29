import { Position } from "/components/Position.js";
import { Velocity } from "/components/Velocity.js";
import { Sprite } from "/components/Sprite.js";
import { Player } from "/components/Player.js";
import { renderingSystem } from "/systems/RenderingSystem.js";
import {
  setup,
  setupWorldParameters,
  loadImages,
  setupCanvas,
  setupEvents,
  setupConnection,
} from "./setup.js";

$(async () => {
  await setup();
  gameloop();
});

import { world, serialize, deserialize } from "./world.js";

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
