const socket = io();

let playerName = localStorage.getItem('playerName') || prompt("Enter your name:");
localStorage.setItem('playerName', playerName);

let currentGame = null;
let isAdmin = false;

const gameList = document.getElementById('game-list');
const createGameButton = document.getElementById('create-game');
const gameContainer = document.getElementById('game-container');
const drinkButton = document.getElementById('drink-button');
const playerInfo = document.getElementById('player-info');
const playerList = document.getElementById('player-list');
const drinkContainer = document.getElementById('drink-container');
const histogramContainer = document.getElementById('histogram');
const endGameButton = document.getElementById('end-game');
const adminStatus = document.getElementById('admin-status');

createGameButton.addEventListener('click', () => {
  const gameName = prompt("Enter a name for the new game:");
  if (gameName) {
    socket.emit('createGame', gameName);
  }
});

socket.on('gamesList', (games) => {
  gameList.innerHTML = '';
  games.forEach(game => {
    const li = document.createElement('li');
    li.textContent = game;
    li.addEventListener('click', () => joinGame(game));
    gameList.appendChild(li);
  });
});

socket.on('gameCreated', (gameName) => {
  joinGame(gameName);
});

socket.on("gameJoined", (gameState) => {
  console.log("Game joined:", gameState);
  currentGame = gameState;
  isAdmin = gameState.isAdmin;
  gameContainer.style.display = "block";
  updateGameDisplay();
  updateAdminStatus();
});
  
socket.on('updatePlayers', (players) => {
  playerList.innerHTML = players.map(player => 
    `<div>${player.name}: ${player.drinks} drinks</div>`
  ).join('');
});

socket.on('updateDrinks', (gameState) => {
  currentGame = gameState;
  updateGameDisplay();
});

socket.on("gameEnded", (gameState) => {
  currentGame = gameState;
  drinkButton.disabled = true;
  endGameButton.disabled = true;
  displayHistogram(gameState);
});  

function joinGame(gameName) {
  console.log('Joining game:', gameName);
  socket.emit('joinGame', { gameName, playerName });
}

function updateGameDisplay() {
  if (!currentGame) return;

  const player =
    currentGame.players[
      Object.keys(currentGame.players).find(
        (key) => currentGame.players[key].name === playerName
      )
    ];
  playerInfo.textContent = `You've had ${player.drinks} drinks`;

  updateDrinkDisplay();
  updateAdminStatus();
  endGameButton.style.display = "inline-block";
}  

function updateAdminStatus() {
    const adminStatusElement = document.getElementById('admin-status');
    if (isAdmin) {
      adminStatusElement.textContent = "You are the admin";
      adminStatusElement.style.color = "green";
      endGameButton.disabled = false;
    } else {
      adminStatusElement.textContent = "You are not the admin";
      adminStatusElement.style.color = "red";
      endGameButton.disabled = true;
    }
  }
  

function updateDrinkDisplay() {
  drinkContainer.innerHTML = '';
  
  const totalGlasses = currentGame.filledGlasses + 1;
  const glassWidth = 100 / totalGlasses;
  
  for (let i = 0; i < totalGlasses; i++) {
    const glass = document.createElement('div');
    glass.className = 'glass';
    glass.style.width = `${glassWidth}%`;
    
    const drinkLevel = document.createElement('div');
    drinkLevel.className = 'drink-level';
    
    if (i < currentGame.filledGlasses) {
      drinkLevel.style.height = '100%';
    } else {
      const remainingDrinks = currentGame.totalDrinks - (currentGame.filledGlasses * currentGame.drinksPerGlass);
      const levelPercentage = (remainingDrinks / currentGame.drinksPerGlass) * 100;
      drinkLevel.style.height = `${levelPercentage}%`;
    }
    
    glass.appendChild(drinkLevel);
    drinkContainer.appendChild(glass);
  }
}

drinkButton.addEventListener("click", () => {
  console.log("Drink button clicked");
  if (currentGame) {
    console.log("Emitting drink event for game:", currentGame.name);
    socket.emit("drink", currentGame.name);
  } else {
    console.log("No current game set");
  }
});

endGameButton.addEventListener("click", () => {
  if (currentGame && isAdmin) {
    socket.emit("endGame", currentGame.name);
  }
});
  
function displayHistogram(gameState) {
  histogramContainer.innerHTML = '';
  const canvas = document.createElement('canvas');
  histogramContainer.appendChild(canvas);

  const gameLength = (new Date(gameState.gameEndTime) - new Date(gameState.gameStartTime)) / 60000; // in minutes
  const intervals = 10;
  const intervalLength = gameLength / intervals;

  const data = new Array(intervals).fill(0);

  gameState.drinkEvents.forEach(drink => {
    const minutesSinceStart = (new Date(drink.time) - new Date(gameState.gameStartTime)) / 60000;
    const intervalIndex = Math.floor(minutesSinceStart / intervalLength);
    if (intervalIndex < intervals) data[intervalIndex]++;
  });

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: Array.from({length: intervals}, (_, i) => `${Math.round(i * intervalLength)}-${Math.round((i + 1) * intervalLength)} min`),
      datasets: [{
        label: 'Drinks Taken',
        data: data,
        backgroundColor: 'rgba(255, 153, 0, 0.8)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Drinks'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time Intervals'
          }
        }
      }
    }
  });
}

socket.emit('getGames');