import { genId, randBetween } from "./util.js";
import { map } from "./maps.js";

export const sprites = {};

// TODO: add layers
// TODO: maybe have different types of sprites: images and vector (drawing on
//       the canvas)
// TODO: so then maybe use sprites for players?
export class Sprite {
  constructor(type, x, y, width, height) {
    this.id = genId();
    this.type = type;
    this.x = x;
    this.y = y;
    this.sizeX = width;
    this.sizeY = height;
  }
}

export function addSprite(sprite) {
  sprites[sprite.id] = sprite;
}
export function removeSprite(sprite) {
  delete sprites[sprite.id ?? sprite];
}

export function generateBushes(count) {
  for (let i = 0; i < count; i++) {
    addSprite(
      new Sprite(
        "bush",
        randBetween(map.width / 2, -map.width / 2),
        randBetween(map.height / 2, -map.height / 2),
        180,
        180
      )
    );
  }
}

export function getVisibleSpriteIds(player) {
  if (!player) return;

  let visibleSpriteIds = [];

  let ownX = player.x;
  let ownY = player.y;
  let screenWidth = player.visibleGameWidth;
  let screenHeight = player.visibleGameHeight;

  for (let dsToCheck of Object.values(sprites)) {
    if (
      dsToCheck.x + dsToCheck.sizeX / 2 >= ownX - screenWidth / 2 &&
        dsToCheck.x - dsToCheck.sizeX / 2 <= ownX + screenWidth / 2
    ) {
      //x-check
      if (
        dsToCheck.y + dsToCheck.sizeY / 2 >= ownY - screenHeight / 2 &&
          dsToCheck.y - dsToCheck.sizeY / 2 <= ownY + screenHeight / 2
      )
      //y-check
      visibleSpriteIds.push(dsToCheck.id);
    }
  }

  // console.log(visibleSpriteIds)
  return visibleSpriteIds;
}
