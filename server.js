/*************************************************************************** */
/*                          IO-Game over WebSockets                          */
/*                                                                           */
/*  Marat Isaw, Benjamin Terbul, Justus Arndt, Paul Trattnig, Thomas Fischer */
/*  HTL Villach - Abteilung Informatik - 4AHIF                               */
/*  (c) 2022/23                                                              */
/*************************************************************************** */
"use strict";

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static("public"));

const updateTime = 1000 / 30;

const sockets = {};

const players = {};
const bullets = {};
const obstacles = {};
const map = {
  name: "map",
  width: 5000,
  height: 5000,
};

const millisBetweenShots = 100;
const timesOfLastShots = {};
let leaderboardInfos = [];

function generateObstacles(count) {
  for (let i = 0; i < count; i++) {
    const id = genId();
    const maxX = map.width / 2;
    const minX = -map.width / 2;
    const maxY = map.height / 2;
    const minY = -map.height / 2;
    obstacles[id] = {
      id: id,
      type: "bush",
      x: Math.random() * (maxX - minX) + minX,
      y: Math.random() * (maxY - minY) + minY,
      sizeX: 180,
      sizeY: 180
    };
  }
}

generateObstacles(32);

class Player {
  constructor(socket, isDead) {
    this.id = socket.id;
    this.x = 0;
    this.y = 0;
    this.screenWidth = socket.handshake.query.screenWidth;
    this.screenHeight = socket.handshake.query.screenHeight;
    this.color = getRandomColor();
    this.specialColor = undefined;
    this.angle = 0;
    this.radius = 16;
    this.name = "";
    this.hp = 100;
    this.speed = 3;
    this.dead = isDead || false
  }
}

io.on("connection", (socket) => {
  const token = socket.handshake.auth.token;
  if (token != "actualUser") socket.disconnect(true);

  let newPlayer = new Player(socket);
  sockets[newPlayer.id] = socket;
  console.log("a new player connected", players);
  socket.emit("welcome", newPlayer, map, obstacles);

  socket.on("disconnect", () => {
    delete timesOfLastShots[socket.id];
    leaderboardInfos = leaderboardInfos.filter((score) => score.id != socket.id)
    delete players[socket.id];
    delete sockets[socket.id];
    console.log("a player disconnected", players);
  });

  socket.on("join", (player) => {
    players[player.id] = player;
    timesOfLastShots[player.id] = 0;
    leaderboardInfos = leaderboardInfos.filter((score) => score.id != player.id)
    leaderboardInfos.push({id:player.id, name:player.name, score:0});
    socket.broadcast.emit("playerJoin", player); // not yet handled in client
  });

  socket.on("playerUpdate", (player) => {
    const old = players[player.id];
    players[player.id] = player;
    if (old) {
      players[player.id].specialColor = old.specialColor;
    }
  });

  socket.on("shoot", (player) => {
    if(Date.now() - timesOfLastShots[player.id] > millisBetweenShots) {
      const bulletId = genId();
      bullets[bulletId] = {
        id: bulletId,
        playerId: player.id,
        angle: player.angle,
        speed: 16,
        x: player.x,
        y: player.y,
        radius: 6,
        color: player.color,
        range: 1000, // pixels
        damage: 10, // hp
      };
      timesOfLastShots[player.id] = Date.now();
    }
  });

});

function serverUpdate() {

  for (const bId in bullets) {
    const b = bullets[bId];
    b.range -= b.speed;
    if (b.range > 0) {
      b.x += b.speed * Math.cos(b.angle);
      b.y += b.speed * Math.sin(b.angle);

      for (const pId in players) {
        const p = players[pId];
        const distX = p.x - b.x;
        const distY = p.y - b.y;
        const distance = Math.sqrt(distX * distX + distY * distY);
        if (pId != b.playerId && distance <= p.radius + b.radius) {
          p.hp -= b.damage;
          p.specialColor = "#FF0000";

          setTimeout(()=> {
            players[pId].specialColor = undefined;
          }, 100);

          delete bullets[bId];
        }

        if(p.hp <= 0) {
          playerDied(pId)
        }
      }
    } else {
      delete bullets[bId];
    }
  }

  for(let socket in sockets){
    sockets[socket].emit("serverUpdate", getVisiblePlayers(players[sockets[socket].id]), getVisibleBullets(players[sockets[socket].id]), calculateVisibleObstacles(players[sockets[socket].id]));
  }

}

function playerDied(playerId){
  let newPlayer = new Player(sockets[playerId], true);
  players[playerId] = newPlayer;
  sockets[playerId].emit("died", newPlayer);
}

setInterval(serverUpdate, updateTime);
setInterval(updateLeaderboard, 1000);

function updateLeaderboard() {
  let sortedTop10 = getTopScores(10);

  /*for(let i=0; i < sortedTop10.length; i++) {
    sortedTop10[i] = {name:players[sortedTop10[i].id].name, score:sortedTop10[i].score};
  }*/
  
  for(let socket in sockets){
    sockets[socket].emit("leaderboardUpdate", sortedTop10);
  }
}

function getTopScores(n){
  let arr = leaderboardInfos;
  if(n > arr.length) {
    n = arr.length;
  }
  return arr.sort(function(a,b){ return b.score-a.score }).slice(0,n); //Exception arr.sort(...) is not a function
}

const PORT = argv.port ?? 8080;
server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});

function getRandomColor() {
  return `rgb(${Math.floor(Math.random() * 255)},${Math.floor(
    Math.random() * 255
  )},${Math.floor(Math.random() * 255)})`;
}

function genId() {
  return Math.floor((1 + Math.random()) * 0x100000000)
    .toString(16)
    .substring(1)
    .toString();player
}


function getVisiblePlayers(ownPlayer){
  let visiblePlayers = {};

  if(ownPlayer)
  {
  
    let ownX = ownPlayer.x;
    let ownY = ownPlayer.y;
    let screenWidth = ownPlayer.screenWidth;
    let screenHeight = ownPlayer.screenHeight;
    
    for(let player in players){
      let otherPlayer = players[player];
      if(!otherPlayer.dead){
        if( otherPlayer.x >= ownX-screenWidth/2 && otherPlayer.x <= ownX+screenWidth/2){  //x-check
            if(otherPlayer.y >= ownY-screenHeight/2 && otherPlayer.y <= ownY+screenHeight/2)  //y-check
              visiblePlayers[otherPlayer.id] = otherPlayer;
        }     //add radius
      }
        
    }
 } 
 return visiblePlayers;
}

function getVisibleBullets(ownPlayer){
  let visibleBullets = {};

  if(ownPlayer)
  {
  
    let ownX = ownPlayer.x;
    let ownY = ownPlayer.y;
    let screenWidth = ownPlayer.screenWidth;
    let screenHeight = ownPlayer.screenHeight;
    
    for(let bullet in bullets){
      let bulletToCheck = bullets[bullet];
      if(bulletToCheck.x >= ownX-screenWidth/2 && bulletToCheck.x <= ownX+screenWidth/2){  //x-check
          if(bulletToCheck.y >= ownY-screenHeight/2 && bulletToCheck.y <= ownY+screenHeight/2)  //y-check
            visibleBullets[bulletToCheck.id]=bulletToCheck;
      }     //add radius
        
    }
 } 
 
 return visibleBullets;
}

function calculateVisibleObstacles(ownPlayer){
  let visibleObstacleIds = {};

  if(ownPlayer)
  {
  
    let ownX = ownPlayer.x;
    let ownY = ownPlayer.y;
    let screenWidth = ownPlayer.screenWidth;
    let screenHeight = ownPlayer.screenHeight;
  
    for(let obstacle in obstacles){
        let obstacleToCheck = obstacles[obstacle];
        if(obstacleToCheck.x+obstacleToCheck.sizeX/2 >= ownX-screenWidth/2 && obstacleToCheck.x-obstacleToCheck.sizeX/2 <= ownX+screenWidth/2){  //x-check
            if(obstacleToCheck.y+obstacleToCheck.sizeY/2 >= ownY-screenHeight/2 && obstacleToCheck.y-obstacleToCheck.sizeY/2 <= ownY+screenHeight/2)  //y-check
              visibleObstacleIds[obstacleToCheck.id] = obstacleToCheck.id; 
        }
    }

  return visibleObstacleIds;
  }
}
