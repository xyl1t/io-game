import { game } from "./game.js";
import {
  InputPayload,
  StatePayload,
  bufferSize,
  Vector,
  dist,
} from "../lib/util.js";

const inputBuffer = [];
const stateBuffer = [];
let latestServerState;
let lastProcessedState;

let oldAngle = 0;

// called whenever the player has joined the game or has respawned
game.onJoin(() => {
  console.log("Player joined");

  game.socket.on("serverUpdate", (visiblePlayers, bullets, visibleSpriteIds) => {
    game.visiblePlayers = visiblePlayers;
    game.bullets = bullets;
    game.visibleSpriteIds = visibleSpriteIds;
  });

  game.socket.on("playerStateUpdate", (playerState) => {
    latestServerState = playerState;
  });
});

// called when the player dies
game.onDeath(() => {
  console.log("Player died");
  game.socket.off("serverUpdate");
});

// called every frame, elapsedTime is in millisconds
game.onLoop(() => {
  // keyboard movement
  const inputVector = new Vector(0, 0);

  // FIXME: potential bug when fps is too low on client side, server gets
  // less signals of the player pressing a button -> player moves slower
  if (game.keyboard["w"]) {
    inputVector.y = -1;
  }
  if (game.keyboard["s"]) {
    inputVector.y = 1;
  }
  if (game.keyboard["a"]) {
    inputVector.x = -1;
  }
  if (game.keyboard["d"]) {
    inputVector.x = 1;
  }
  if (game.keyboard[" "]) {
    console.log(
      "coordinates:",
      parseInt(game.mouse.x - game.windowWidth / 2 + game.player.x),
      parseInt(game.mouse.y - game.windowHeight / 2 + game.player.y)
    );
  }

  // TODO: Deep equal check, why is constantly reconciling?
  if (latestServerState?.tick != lastProcessedState?.tick) {
    lastProcessedState = latestServerState;

    let serverStateBufferIdx = latestServerState.tick % bufferSize;
    let positionError = dist(
      latestServerState.x,
      latestServerState.y,
      stateBuffer[serverStateBufferIdx].x,
      stateBuffer[serverStateBufferIdx].y
    );

    if (positionError > 0.01) {
      console.log("reconciling");
      stateBuffer[serverStateBufferIdx] = latestServerState;
      game.player.x = stateBuffer[serverStateBufferIdx].x;
      game.player.y = stateBuffer[serverStateBufferIdx].y;
      game.player.turretAngle = stateBuffer[serverStateBufferIdx].turretAngle;

      let tickToProcess = latestServerState.tick + 1;
      while (tickToProcess < game.currentTick) {
        const bufferIdx = tickToProcess % bufferSize;
        stateBuffer[bufferIdx] = processInput(inputBuffer[bufferIdx]);
        tickToProcess++;
      }
    }
  }

  const inputPayload = new InputPayload(
    game.currentTick,
    game.player.id,
    inputVector.x,
    inputVector.y,
    game.mouse.angle,
    game.mouse.leftDown || game.mouse.rightDown
  );

  const bufferIdx = inputPayload.tick % bufferSize;

  inputBuffer[bufferIdx] = inputPayload;
  stateBuffer[bufferIdx] = processInput(inputPayload);

  if (
    oldAngle != game.mouse.angle ||
    inputVector.x != 0 ||
    inputVector.y != 0
  ) {
    (function (iq) {
      setTimeout(function () {
        game.socket.emit("playerInput", iq);
        console.log(game.currentTick);
      }, 250);
    })(structuredClone(inputPayload));
  }

  oldAngle = game.mouse.angle;

  // console.log(inputPayload.inputVector, inputPayload.mouse);

  // if (moveX != 0 || moveY != 0) {
  //   game.socket.emit("playerMove", {
  //     playerId: game.player.id,
  //     direction: angle,
  //   });
  // }
  //
  // // mouse moved
  // if (game.mouse.x != game.mouse.oldX || game.mouse.y != game.mouse.oldY) {
  //   const dx = game.mouse.x - game.windowWidth / 2;
  //   const dy = game.mouse.y - game.windowHeight / 2;
  //   game.mouse.angle = Math.atan2(dy, dx);
  //
  //   game.player.turretAngle = game.mouse.angle;
  //   game.socket.emit("mouseMove", {
  //     playerId: game.player.id,
  //     angle: game.mouse.angle
  //   });
  // }
  //
  // if (game.mouse.leftDown || game.mouse.rightDown) {
  //   game.socket.emit("shoot");
  // }
});

function processInput(inputPayload) {
  // let { inputVector, mouse } = inputPayload;
  game.player.turretAngle = inputPayload.turretAngle;
  // if (inputPayload.shooting) {
  //   if (
  //     game.player.alive &&
  //     Date.now() - game.player.lastShotTime > millisBetweenShots
  //   ) {
  //     const b = new Bullet(game.player);
  //     game.bullets[b.id] = b;
  //     game.player.lastShotTime = Date.now();
  //   }
  // }

  game.player.x += inputPayload.inputX * 100 * game.dt;
  game.player.y += inputPayload.inputY * 100 * game.dt;

  return new StatePayload(
    inputPayload.tick,
    inputPayload.playerId,
    game.player.x,
    game.player.y,
    game.player.turretAngle
  );
}

// function handleServerReconciliation() {
//   lastProcessedState = latestServerState;
//
//   let serverStateBufferIdx = latestServerState.tick % bufferSize;
//   let positionError = dist(
//     latestServerState.pos.x,
//     latestServerState.pos.y,
//     stateBuffer[serverStateBufferIdx].pos.x,
//     stateBuffer[serverStateBufferIdx].pos.y
//   );
//
//   if (positionError > 0.01) {
//     console.log("reconciling");
//
//     game.player.x = stateBuffer[serverStateBufferIdx].pos.x;
//     game.player.y = stateBuffer[serverStateBufferIdx].pos.y;
//     game.player.turretAngle =
//       stateBuffer[serverStateBufferIdx].turret.direction;
//
//     let tickToProcess = latestServerState.tick + 1;
//     while (tickToProcess < game.currentTick) {
//       const bufferIdx = tickToProcess % bufferSize;
//       stateBuffer[bufferIdx] = processInput(inputBuffer[bufferIdx]);
//       tickToProcess++;
//     }
//   }
// }
