// global variables
let ctx;
let socket;

let clicks = [];

let mouseInfo = {
  x: 0,
  y: 0,
  scrollX: 0,
  scrollY: 0,
  leftDown: false,
  rightDown: false,
};

$(() => {
  setup();
  loop();
});

function setup() {
  $('#start_game').click((e)=>{
    $('#settings_elements').css('display', 'none');
    $('#game_elements').css('display', 'inline')
    $('#site_wrapper').removeClass('jumbotron d-flex align-items-center vertical-center')
  })

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

  // disabling alpha for performance
  ctx = canvas.getContext("2d", { alpha: false });

  /*var img = document.getElementById("tank");
  ctx.drawImage(img, 100, 100);*/

  console.log("Establishing connection...");
  socket = io({
    auth: {
      token: "actualUser", // autherize as a legit user
    },
  });

  socket.on("serverUpdate", clicksFromServer => {
    clicks = clicksFromServer
  })
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
  mouseInfo.x = e.pageX - canvas.offsetLeft;
  mouseInfo.y = e.pageY - canvas.offsetTop;
  mouseInfo.leftDown = (e.buttons & 1) == 1;
  mouseInfo.rightDown = (e.buttons & 2) == 2;
  console.log("Event: mousedown", mouseInfo);

  socket.emit("click", mouseInfo);
}

function mouseup(e) {
  mouseInfo.x = e.pageX - canvas.offsetLeft;
  mouseInfo.y = e.pageY - canvas.offsetTop;
  mouseInfo.leftDown = (e.buttons & 1) == 1;
  mouseInfo.rightDown = (e.buttons & 2) == 2;
  console.log("Event: mouseup", mouseInfo);
}

function mousemove(e) {
  mouseInfo.x = e.pageX - canvas.offsetLeft;
  mouseInfo.y = e.pageY - canvas.offsetTop;
  mouseInfo.leftDown = (e.buttons & 1) == 1;
  mouseInfo.rightDown = (e.buttons & 2) == 2;
  console.log("Event: mosemove", mouseInfo);
}

function wheel(e) {
  e.preventDefault();

  let deltaX = e.deltaX;
  let deltaY = e.deltaY;

  if (e.shiftKey) {
    deltaY = 0;
    deltaX = e.deltaY || e.deltaX;
  }

  mouseInfo.scrollX += (Math.max(-100, Math.min(100, deltaX)) / 100) * 100;
  mouseInfo.scrollY += (Math.max(-100, Math.min(100, deltaY)) / 100) * 100;

  console.log("Event: wheel", mouseInfo);
}

