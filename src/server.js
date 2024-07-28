const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let adminSocketId = null;

let gameState = {
  players: {},
  totalDrinks: 0,
  drinksPerGlass: 10,
  drinkEvents: [],
  filledGlasses: 0,
  gameStartTime: null
};

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join', (playerName) => {
    if (!adminSocketId) {
      adminSocketId = socket.id;
      socket.emit('setAdmin', true);
    }
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
    
    // Check if we need to add a new glass
    if (gameState.totalDrinks > (gameState.filledGlasses + 1) * gameState.drinksPerGlass) {
      gameState.filledGlasses++;
    }
    
    io.emit('updateDrinks', gameState);
    });

  socket.on('startGame', () => {
    gameState.gameStartTime = new Date();
    io.emit('gameStarted', gameState.gameStartTime);
  });

  socket.on('endGame', () => {
    if (socket.id === adminSocketId) {
      io.emit('gameEnded', gameState);
    }
  });

  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
    if (socket.id === adminSocketId) {
      adminSocketId = null;
    }
    io.emit('updatePlayers', Object.values(gameState.players));
  });
  
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});