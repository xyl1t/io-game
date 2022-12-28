import { game } from "/game.js";

// called whenever the player has joined the game or has respawned
game.onJoin(() => {
  console.log("Player joined");
});

// called every frame, elapsedTime is in millisconds
game.onLoop((elapsedTime) => {
  // keyboard movement
  let moveX = 0;
  let moveY = 0;

  // FIXME: potential bug when fps is too low on client side, server gets
  // less signals of the player pressing a button -> player moves slower
  if (game.keyboard["w"]) {
    moveY = -1;
  }
  if (game.keyboard["s"]) {
    moveY = 1;
  }
  if (game.keyboard["a"]) {
    moveX = -1;
  }
  if (game.keyboard["d"]) {
    moveX = 1;
  }
  if (game.keyboard[" "]) {
    console.log(
      parseInt(game.mouse.x - game.windowWidth / 2 + game.player.x),
      parseInt(game.mouse.y - game.windowHeight / 2 + game.player.y)
    );
  }

  if (moveX != 0 || moveY != 0) {
    game.player.movementAngle = Math.atan2(moveY, moveX);
    game.socket.emit("playerMove", game.player);
  }

  // mouse moved
  if (game.mouse.x != game.mouse.oldX || game.mouse.y != game.mouse.oldY) {
    const dx = game.mouse.x - game.windowWidth / 2;
    const dy = game.mouse.y - game.windowHeight / 2;
    game.mouse.angle = Math.atan2(dy, dx);

    game.player.turretAngle = game.mouse.angle;
    game.socket.emit("mouseMove", game.player);
  }

  if (game.mouse.leftDown || game.mouse.rightDown) {
    game.socket.emit("shoot", game.player);
  }
});

// called when the player dies
game.onDeath(() => {
  console.log("Player died");
});
