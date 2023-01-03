import { randBetween, getRandomColor } from "./util.js";

export const players = [];

export class Player {
  constructor(socketId, name, visibleGameWidth, visibleGameHeight) {
    this.id = socketId;
    this.name = name ?? "";
    this.visibleGameWidth = visibleGameWidth ?? -1;
    this.visibleGameHeight = visibleGameHeight ?? -1;
    this.hp = 100;
    this.speed = 150;
    this.accX = 0;
    this.accY = 0;
    this.velX = 0;
    this.velY = 0;
    this.x = randBetween(-300, 300);
    this.y = randBetween(-300, 300);
    this.turretAngle = 0;
    this.color = getRandomColor();
    this.specialColor = undefined;
    this.radius = 16;
    this.lastShotTime = 0;
    this.alive = false;
  }

  get dead() {
    return !alive;
  }
}

export function getVisiblePlayers(ownPlayer) {
  // return players;
  let visiblePlayers = [];

  if (ownPlayer) {
    let ownX = ownPlayer.x;
    let ownY = ownPlayer.y;
    let screenWidth = ownPlayer.visibleGameWidth;
    let screenHeight = ownPlayer.visibleGameHeight;

    for (let otherPlayer of players) {
      if (otherPlayer.alive) {
        if (
          otherPlayer.x + otherPlayer.radius >= ownX - screenWidth / 2 &&
          otherPlayer.x - otherPlayer.radius <= ownX + screenWidth / 2
        ) {
          //x-check
          if (
            otherPlayer.y + otherPlayer.radius >= ownY - screenHeight / 2 &&
            otherPlayer.y - otherPlayer.radius <= ownY + screenHeight / 2
          ) {
            //y-check
            visiblePlayers.push(otherPlayer);
          }
        }
      }
    }
  }

  return visiblePlayers;
}
