export function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function genId() {
  return Math.floor((1 + Math.random()) * 0x100000000)
    .toString(16)
    .substring(1)
    .toString();
  player;
}

export function getRandomColor() {
  return `rgb(${Math.floor(Math.random() * 255)},${Math.floor(
    Math.random() * 255
  )},${Math.floor(Math.random() * 255)})`;
}

