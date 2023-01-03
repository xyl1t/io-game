import { genId } from "./util.js";

export const bullets = {}; // TODO: turn into array

export class Bullet {
  constructor(srcPlayer) {
    this.id = genId();
    this.playerId = srcPlayer.id;
    this.angle = srcPlayer.turretAngle;
    this.speed = 100;
    // FIXME: the bullet is offest to the player's turret, if the turret is
    // peaking through a wall, the bullet will go through
    this.x =
      srcPlayer.x +
      (srcPlayer.radius * 1.8 + 6) * Math.cos(srcPlayer.turretAngle);
    this.y =
      srcPlayer.y +
      (srcPlayer.radius * 1.8 + 6) * Math.sin(srcPlayer.turretAngle);
    this.radius = 6; // ball radius
    this.color = srcPlayer.color;
    this.range = 3000; // in pixels
    this.damage = 10; // hp damage
  }
}

export function setBullet(bullet) {
  bullets[bullet.id] = bullet;
}

export function removeBullet(bullet) {
  delete bullets[bullet.id ?? bullet];
}

export function getVisibleBullets(ownPlayer) {
  // return bullets;
  let visibleBullets = {};

  if (ownPlayer) {
    let ownX = ownPlayer.x;
    let ownY = ownPlayer.y;
    let screenWidth = ownPlayer.visibleGameWidth;
    let screenHeight = ownPlayer.visibleGameHeight;

    for (let bullet in bullets) {
      let bulletToCheck = bullets[bullet];
      if (
        bulletToCheck.x + bulletToCheck.radius >= ownX - screenWidth / 2 &&
        bulletToCheck.x - bulletToCheck.radius <= ownX + screenWidth / 2
      ) {
        //x-check
        if (
          bulletToCheck.y + bulletToCheck.radius >= ownY - screenHeight / 2 &&
          bulletToCheck.y - bulletToCheck.radius <= ownY + screenHeight / 2
        )
          //y-check
          visibleBullets[bulletToCheck.id] = bulletToCheck;
      } //add radius
    }
  }

  return visibleBullets;
}

