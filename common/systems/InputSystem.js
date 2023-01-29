import { defineQuery, defineSystem } from "../bitecs.js";

import { Position } from "../components/Position.js";
import { Velocity } from "../components/Velocity.js";
import { Player } from "../components/Player.js";
import { Input } from "../components/Input.js";
import { Me } from "../components/Me.js";

const query = defineQuery([Me, Player, Position, Velocity]);

export const inputSystem = defineSystem((world) => {
  const entities = query(world);
  const { mouse, keyboard } = world;

  // TODO: implement movement

  // NOTE: Should be just one entity because of the `Me` component
  for (const id of entities) {

    // Velocity.x[id] = Velocity.y[id] = 0;
    //
    // const speed = 20;
    //
    // if (keyboard["w"]) {
    //   Velocity.y[id] = -speed;
    // }
    // if (keyboard["s"]) {
    //   Velocity.y[id] = speed;
    // }
    // if (keyboard["a"]) {
    //   Velocity.y[id] = -speed;
    // }
    // if (keyboard["d"]) {
    //   Velocity.y[id] = speed;
    // }
  }

  return world;
});
