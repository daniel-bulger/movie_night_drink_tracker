const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

app.use(express.static('public'));

let games = {};
const GAMES_FILE = 'games.json';

// Load games from file on server start
try {
  const data = fs.readFileSync(GAMES_FILE, 'utf8');
  games = JSON.parse(data);
  console.log('Games loaded from file:', Object.keys(games));
} catch (err) {
  console.log('No existing games file found or error reading file. Starting with empty games object.');
  saveGames();  // Create an empty games file if it doesn't exist
}

function saveGames() {
  console.log(games);
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games), 'utf8');
  console.log('Games saved to file');
}

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('getGames', () => {
    socket.emit('gamesList', Object.keys(games));
  });

  socket.on("createGame", (gameName) => {
    if (!games[gameName]) {
      games[gameName] = {
        players: {},
        totalDrinks: 0,
        drinksPerGlass: 10,
        drinkEvents: [],
        gameStartTime: new Date(),
        gameEndTime: null,
        adminSocketId: socket.id,
        filledGlasses: 0,
        name: gameName,
      };
      saveGames();
      socket.join(gameName);
      socket.emit("gameCreated", { ...games[gameName], isAdmin: true });
      io.emit("gamesList", Object.keys(games));
    } else {
      socket.emit("error", "Game already exists");
    }
  });

  socket.on("joinGame", (data) => {
    const { gameName, playerName } = data;
    if (games[gameName]) {
      socket.join(gameName);
      games[gameName].players[socket.id] = { name: playerName, drinks: 0 };
      const isAdmin = socket.id === games[gameName].adminSocketId;
      socket.emit("gameJoined", { ...games[gameName], isAdmin });
      io.to(gameName).emit(
        "updatePlayers",
        Object.values(games[gameName].players)
      );
      saveGames();
    } else {
      socket.emit("error", "Game not found");
    }
  });
    
  socket.on('drink', (gameName) => {
    console.log('Drink event received for game:', gameName);
    if (games[gameName]) {
      games[gameName].players[socket.id].drinks++;
      games[gameName].totalDrinks++;
      games[gameName].drinkEvents.push({ 
        player: games[gameName].players[socket.id].name, 
        time: new Date() 
      });
      
      if (games[gameName].totalDrinks > (games[gameName].filledGlasses + 1) * games[gameName].drinksPerGlass) {
        games[gameName].filledGlasses++;
      }
      io.to(gameName).emit('updateDrinks', games[gameName]);
      console.log('Game updated:', games[gameName]);
      saveGames();
    } else {
      console.log('Game not found:', gameName);
    } 
  });

  socket.on("endGame", (gameName) => {
    console.log("End game request received for:", gameName);
    if (games[gameName] && socket.id === games[gameName].adminSocketId) {
      console.log("Ending game:", gameName);
      games[gameName].gameEndTime = new Date();
      io.to(gameName).emit("gameEnded", games[gameName]);
      saveGames();
    } else {
      console.log("Unauthorized end game request or game not found");
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    let gamesToSave = false;
    for (let gameName in games) {
      if (games[gameName].players[socket.id]) {
        console.log(`Removing player ${socket.id} from game ${gameName}`);
        delete games[gameName].players[socket.id];
        io.to(gameName).emit('updatePlayers', Object.values(games[gameName].players));
        if (socket.id === games[gameName].adminSocketId) {
          const remainingPlayers = Object.keys(games[gameName].players);
          if (remainingPlayers.length > 0) {
            games[gameName].adminSocketId = remainingPlayers[0];
            console.log(`New admin for game ${gameName}: ${games[gameName].adminSocketId}`);
          } else {
            console.log(`No players left in game ${gameName}, but keeping it for now`);
          }
        }
        gamesToSave = true;
      }
    }
    if (gamesToSave) {
      saveGames();
    }
  });
  
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
