import { randBetween, getRandomColor } from "./util.js";

export const players = {};

export class Player {
  constructor(socket, name, visibleGameWidth, visibleGameHeight) {
    this.id = socket.id;
    this.name = name ?? "";
    this.visibleGameWidth = visibleGameWidth ?? -1;
    this.visibleGameHeight = visibleGameHeight ?? -1;
    this.hp = 100;
    this.speed = 150;
    // TODO: use movementAngle to determine direction instead of x and y
    this.accX = 0;
    this.accY = 0;
    this.velX = 0;
    this.velY = 0;
    this.x = randBetween(-300, 300);
    this.y = randBetween(-300, 300);
    this.turretAngle = 0;
    this.movementAngle = 0;
    this.color = getRandomColor();
    this.specialColor = undefined;
    this.radius = 16;
    this.lastShotTime = 0;
    this.alive = false;
  }
}

export function setPlayer(player) {
  players[player.id] = player;
}
export function removePlayer(player) {
  delete players[player.id ?? player];
}

export function getVisiblePlayers(ownPlayer) {
  // return players;
  let visiblePlayers = {};

  if (ownPlayer) {
    let ownX = ownPlayer.x;
    let ownY = ownPlayer.y;
    let screenWidth = ownPlayer.visibleGameWidth;
    let screenHeight = ownPlayer.visibleGameHeight;

    for (let player in players) {
      let otherPlayer = players[player];
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
            visiblePlayers[otherPlayer.id] = otherPlayer;
          }
        }
      }
    }
  }
  return visiblePlayers;
}

