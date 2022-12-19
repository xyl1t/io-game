// global variables
let ctx;
let socket;

let clicks = [];

const mouse = {
  x: 0,
  y: 0,
  scrollX: 0,
  scrollY: 0,
  leftDown: false,
  rightDown: false,
};
const keyboard = {};

$(() => {
  setup();
  loop();
});

function setup() {
  // setup client
  console.log("Loading canvas and context...");
  const canvas = document.querySelector("#canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener(
    "resize",
    () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    },
    false
  );
  canvas.addEventListener("mousedown", mousedown, false);
  canvas.addEventListener("mouseup", mouseup, false);
  canvas.addEventListener("mousemove", mousemove, false);
  canvas.addEventListener("wheel", wheel, false);

  window.addEventListener("keydown", keydown, true);
  window.addEventListener("keyup", keyup, true);

  // disabling alpha for performance
  ctx = canvas.getContext("2d", { alpha: false });

  console.log("Establishing connection...");
  socket = io({
    auth: {
      token: "actualUser", // autherize as a legit user
    },
  });

  socket.on("serverUpdate", (clicksFromServer) => {
    clicks = clicksFromServer;
  });
}

function loop() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  for (const click of clicks) {
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(click.x, click.y, 10, 0, 2 * Math.PI);
    ctx.fill();
  }

  window.requestAnimationFrame(loop);
}

function mousedown(e) {
  mouse.x = e.pageX - canvas.offsetLeft;
  mouse.y = e.pageY - canvas.offsetTop;
  mouse.leftDown = (e.buttons & 1) == 1;
  mouse.rightDown = (e.buttons & 2) == 2;
  console.log("Event: mousedown", mouse);

  socket.emit("click", mouse);
}

function mouseup(e) {
  mouse.x = e.pageX - canvas.offsetLeft;
  mouse.y = e.pageY - canvas.offsetTop;
  mouse.leftDown = (e.buttons & 1) == 1;
  mouse.rightDown = (e.buttons & 2) == 2;
  console.log("Event: mouseup", mouse);
}

function mousemove(e) {
  mouse.x = e.pageX - canvas.offsetLeft;
  mouse.y = e.pageY - canvas.offsetTop;
  mouse.leftDown = (e.buttons & 1) == 1;
  mouse.rightDown = (e.buttons & 2) == 2;
  console.log("Event: mosemove", mouse);
}

function wheel(e) {
  e.preventDefault();

  let deltaX = e.deltaX;
  let deltaY = e.deltaY;

  if (e.shiftKey) {
    deltaY = 0;
    deltaX = e.deltaY || e.deltaX;
  }

  const finalX = (Math.max(-100, Math.min(100, deltaX)) / 100) * 100;
  const finalY = (Math.max(-100, Math.min(100, deltaY)) / 100) * 100;

  console.log("Event: wheel", finalX, finalY);
}

function keydown(e) {
  keyboard[e.key.toLowerCase()] = true;
  console.log("down", e.key.toLowerCase())
}

function keyup(e) {
  keyboard[e.key.toLowerCase()] = false;
  console.log("up", e.key.toLowerCase())
}
