import { defineQuery, defineSystem } from "../bitecs.js";

import { Position } from "../components/Position.js";
import { Velocity } from "../components/Velocity.js";
import { Player } from "../components/Player.js";

const query = defineQuery([Player, Position, Velocity]);

export const physicsSystem = defineSystem((world) => {
  const entities = query(world);

  for (const id of entities) {
    // TODO: implement movement
  }

  return world;
});
