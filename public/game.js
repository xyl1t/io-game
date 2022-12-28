export const game = {
  // input
  mouse: {
    oldX: 0,
    oldY: 0,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
    leftDown: false,
    rightDown: false,
  },
  keyboard: {},

  // game data
  player: {},
  socket: {},
  players: {},
  bullets: {},
  map: {},
  decoSprites: {},
  visibleDecoSpriteIds: [],
  obstacles: [],


  // client data
  windowWidth: 0,
  windowHeight: 0,
  renderScale: 1,
  minWidth: 1200,
  minHeight: 1200 * (9 / 16), // 16:9 aspect ratio

  onJoin(callback) {
    this.onJoinCallback = callback;
  },
  onLoop(callback) {
    this.onLoopCallback = callback;
  },
  onDeath(callback) {
    this.onDeathCallback = callback;
  },

  onJoinCallback() {
    console.log("stub onJoinCallback()");
  },
  onLoopCallback() {
    console.log("stub onLoopCallback()");
  },
  onDeathCallback() {
    console.log("stub onDeathCallback()");
  },
};
