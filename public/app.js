const socket = io();

let playerName = prompt("Enter your name:");
socket.emit('join', playerName);

const drinkButton = document.getElementById('drink-button');
const startGameButton = document.getElementById('start-game');
const playerInfo = document.getElementById('player-info');
const playerList = document.getElementById('player-list');
const drinkLevel = document.getElementById('drink-level');

drinkButton.addEventListener('click', () => {
    socket.emit('drink');
});

startGameButton.addEventListener('click', () => {
    socket.emit('startGame');
    startGameButton.disabled = true;
});

socket.on('updatePlayers', (players) => {
    playerList.innerHTML = players.map(player => 
        `<div>${player.name}: ${player.drinks} drinks</div>`
    ).join('');
});

socket.on('updateDrinks', (gameState) => {
    const player = gameState.players[Object.keys(gameState.players).find(key => gameState.players[key].name === playerName)];
    playerInfo.textContent = `You've had ${player.drinks} drinks`;
    
    const level = (gameState.totalDrinks / (Object.keys(gameState.players).length * 10)) * 100;
    drinkLevel.style.height = `${Math.min(level, 100)}%`;
    
    if (gameState.totalDrinks >= Object.keys(gameState.players).length * 10) {
        endGame(gameState);
    }
});

socket.on('gameStarted', (startTime) => {
    console.log('Game started at:', startTime);
    drinkButton.disabled = false;
});

function endGame(gameState) {
    drinkButton.disabled = true;
    displayHistogram(gameState);
}

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

