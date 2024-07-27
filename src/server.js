const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let gameState = {
  players: {},
  totalDrinks: 0,
  drinkEvents: [],
  gameStartTime: null
};

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join', (playerName) => {
    gameState.players[socket.id] = { name: playerName, drinks: 0 };
    io.emit('updatePlayers', Object.values(gameState.players));
  });

  socket.on('drink', () => {
    gameState.players[socket.id].drinks++;
    gameState.totalDrinks++;
    gameState.drinkEvents.push({ 
      player: gameState.players[socket.id].name, 
      time: new Date() 
    });
    io.emit('updateDrinks', gameState);
  });

  socket.on('startGame', () => {
    gameState.gameStartTime = new Date();
    io.emit('gameStarted', gameState.gameStartTime);
  });

  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
    io.emit('updatePlayers', Object.values(gameState.players));
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});