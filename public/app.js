const socket = io();

let playerName = prompt("Enter your name:");
let isAdmin = false;

socket.emit('join', playerName);

const drinkButton = document.getElementById('drink-button');
const startGameButton = document.getElementById('start-game');
const playerInfo = document.getElementById('player-info');
const playerList = document.getElementById('player-list');
const drinkLevel = document.getElementById('drink-level');

// Add this new button
const endGameButton = document.createElement('button');
endGameButton.id = 'end-game';
endGameButton.textContent = 'End Game';
endGameButton.style.display = 'none';
document.getElementById('app').appendChild(endGameButton);

drinkButton.addEventListener('click', () => {
    socket.emit('drink');
});

startGameButton.addEventListener('click', () => {
    socket.emit('startGame');
    startGameButton.disabled = true;
    if (isAdmin) {
        endGameButton.style.display = 'block';
    }
});

endGameButton.addEventListener('click', () => {
    socket.emit('endGame');
});

socket.on('setAdmin', (admin) => {
    isAdmin = admin;
    if (isAdmin) {
        endGameButton.style.display = 'block';
    }
});

socket.on('updatePlayers', (players) => {
    playerList.innerHTML = players.map(player => 
        `<div>${player.name}: ${player.drinks} drinks</div>`
    ).join('');
});

function updateDrinkDisplay(gameState) {
    console.log('Updating drink display:', {
        totalDrinks: gameState.totalDrinks,
        filledGlasses: gameState.filledGlasses,
        drinksPerGlass: gameState.drinksPerGlass
    });
    
    const drinkContainer = document.getElementById('drink-container');
    drinkContainer.innerHTML = ''; // Clear existing glasses
    
    const totalGlasses = gameState.filledGlasses + 1;
    const glassWidth = 100 / totalGlasses; // As a percentage
    
    for (let i = 0; i < totalGlasses; i++) {
        const glass = document.createElement('div');
        glass.className = 'glass';
        glass.style.width = `${glassWidth}%`;
        
        const drinkLevel = document.createElement('div');
        drinkLevel.className = 'drink-level';
        
        if (i < gameState.filledGlasses) {
            drinkLevel.style.height = '100%';
        } else {
            const remainingDrinks = gameState.totalDrinks - (gameState.filledGlasses * gameState.drinksPerGlass);
            const levelPercentage = (remainingDrinks / gameState.drinksPerGlass) * 100;
            drinkLevel.style.height = `${levelPercentage}%`;
        }
        
        glass.appendChild(drinkLevel);
        drinkContainer.appendChild(glass);
    }

    console.log('Updated drink display:', gameState);
}

socket.on('updateDrinks', (gameState) => {
    const player = gameState.players[Object.keys(gameState.players).find(key => gameState.players[key].name === playerName)];
    playerInfo.textContent = `You've had ${player.drinks} drinks`;
    
    updateDrinkDisplay(gameState);
});

socket.on('gameStarted', (startTime) => {
    console.log('Game started at:', startTime);
    drinkButton.disabled = false;
});

socket.on('gameEnded', (gameState) => {
    drinkButton.disabled = true;
    endGameButton.style.display = 'none';
    displayHistogram(gameState);
});

function displayHistogram(gameState) {
    const ctx = document.createElement('canvas');
    document.getElementById('histogram').appendChild(ctx);

    const gameLength = (new Date() - new Date(gameState.gameStartTime)) / 60000; // in minutes
    const intervals = 10;
    const intervalLength = gameLength / intervals;

    const data = new Array(intervals).fill(0);

    gameState.drinkEvents.forEach(drink => {
        const minutesSinceStart = (new Date(drink.time) - new Date(gameState.gameStartTime)) / 60000;
        const intervalIndex = Math.floor(minutesSinceStart / intervalLength);
        if (intervalIndex < intervals) data[intervalIndex]++;
    });

    new Chart(ctx, {
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

