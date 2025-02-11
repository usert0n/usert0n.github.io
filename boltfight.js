// Game state
const gameState = {
    player: {
        position: { x: 0, y: 0 },
        level: 1,
        exp: 0,
        maxExp: 100,
        health: 100,
        maxHealth: 100,
        bolts: 0,
        equipment: {
            weapon: null,
            armor: null,
            shield: null
        },
        hasBasicGear: false
    },
    map: {
        width: 15,
        height: 15,
        cells: [], // Will store cell types: 'wall', 'path', 'door', 'chest', etc.
        enemies: [],
        items: [],
        doors: [],
        revealed: [] // Fog of war implementation
    },
    combat: {
        inProgress: false,
        currentEnemy: null,
        selectedAttackZone: null,
        selectedBlockZones: [],
        turnCount: 0,
        lastDamage: 0
    }
};

// Enemy types
const enemies = {
    vitalik: {
        name: "Виталик",
        health: 50,
        damage: 10,
        exp: 20,
        bolts: 15,
        sprite: "👤"
    },
    kaban: {
        name: "Кабан",
        health: 80,
        damage: 15,
        exp: 35,
        bolts: 25,
        sprite: "👤"
    },
    nick: {
        name: "Ник",
        health: 65,
        damage: 12,
        exp: 30,
        bolts: 20,
        sprite: "👤"
    }
};

// Cell types and their visual representation
const CELL_TYPES = {
    WALL: { type: 'wall', symbol: '⬛', passable: false },
    PATH: { type: 'path', symbol: '⬜', passable: true },
    DOOR: { type: 'door', symbol: '🚪', passable: false },
    CHEST: { type: 'chest', symbol: '📦', passable: true },
    START: { type: 'start', symbol: '🔵', passable: true },
    EXIT: { type: 'exit', symbol: '🏁', passable: true }
};

// Basic starter equipment
const STARTER_EQUIPMENT = {
    weapon: { name: 'Ржавый гаечный ключ', damage: 5, type: 'weapon' },
    armor: { name: 'Потрёпанный комбинезон', defense: 3, type: 'armor' },
    shield: { name: 'Крышка от мусорки', blockZones: 2, type: 'shield' }
};

// Initialize game
function initGame() {
    createMap();
    spawnEnemies();
    updateStats();
    setupEventListeners();
}

// Create map grid
function createMap() {
    const mapGrid = document.getElementById('mapGrid');
    mapGrid.innerHTML = '';
    
    for (let y = 0; y < gameState.map.height; y++) {
        for (let x = 0; x < gameState.map.width; x++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            // Add cell content (player, enemy, or empty)
            updateCellContent(cell, x, y);
            
            mapGrid.appendChild(cell);
        }
    }
}

// Update cell content
function updateCellContent(cell, x, y) {
    if (x === gameState.player.position.x && y === gameState.player.position.y) {
        cell.classList.add('player');
        cell.innerHTML = '🔩'; // Player bolt icon
    } else {
        const targetCell = gameState.map.cells[y][x];
        if (!targetCell.passable) {
            cell.classList.add('wall');
            cell.innerHTML = targetCell.symbol;
        } else {
            const enemy = gameState.map.enemies.find(e => e.x === x && e.y === y);
            if (enemy) {
                cell.classList.add('enemy');
                cell.innerHTML = enemies[enemy.type].sprite;
            } else {
                cell.innerHTML = '';
            }
        }
    }
}

// Spawn enemies on map
function spawnEnemies() {
    const numEnemies = 5 + Math.floor(gameState.player.level / 2);
    gameState.map.enemies = [];
    
    for (let i = 0; i < numEnemies; i++) {
        const enemyTypes = Object.keys(enemies);
        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        
        let x, y;
        do {
            x = Math.floor(Math.random() * gameState.map.width);
            y = Math.floor(Math.random() * gameState.map.height);
        } while (isPositionOccupied(x, y));
        
        gameState.map.enemies.push({
            type: randomType,
            x: x,
            y: y,
            health: enemies[randomType].health
        });
    }
}

// Check if position is occupied
function isPositionOccupied(x, y) {
    if (x === gameState.player.position.x && y === gameState.player.position.y) return true;
    return gameState.map.enemies.some(enemy => enemy.x === x && enemy.y === y);
}

// Move player
function movePlayer(newX, newY) {
    if (newX < 0 || newX >= gameState.map.width || 
        newY < 0 || newY >= gameState.map.height) return;
    
    const targetCell = gameState.map.cells[newY][newX];
    
    if (!targetCell.passable) {
        if (targetCell === CELL_TYPES.DOOR) {
            const door = gameState.map.doors.find(d => d.x === newX && d.y === newY);
            if (door && door.isLocked) {
                if (gameState.player.bolts >= 50) {
                    gameState.player.bolts -= 50;
                    door.isLocked = false;
                    gameState.map.cells[newY][newX] = CELL_TYPES.PATH;
                    showMessage("Дверь открыта!");
                    updateStats();
                } else {
                    showMessage("Нужно 50 болтов чтобы открыть дверь!");
                }
            }
        }
        return;
    }
    
    if (targetCell === CELL_TYPES.CHEST) {
        openChest(newX, newY);
        return;
    }
    
    const enemy = gameState.map.enemies.find(e => e.x === newX && e.y === newY);
    if (enemy) {
        if (gameState.player.hasBasicGear) {
            initiateCombat(enemy);
        } else {
            showMessage("Нужно найти снаряжение для боя!");
        }
        return;
    }
    
    gameState.player.position.x = newX;
    gameState.player.position.y = newY;
    createMap();
}

// Update stats display
function updateStats() {
    document.getElementById('level').textContent = gameState.player.level;
    document.getElementById('exp').textContent = 
        `${gameState.player.exp}/${gameState.player.maxExp}`;
    document.getElementById('bolts').textContent = gameState.player.bolts;
    document.getElementById('health').textContent = 
        `${gameState.player.health}/${gameState.player.maxHealth}`;
}

// Setup event listeners
function setupEventListeners() {
    // Map movement
    document.getElementById('mapGrid').addEventListener('click', (e) => {
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;
        
        const newX = parseInt(cell.dataset.x);
        const newY = parseInt(cell.dataset.y);
        
        // Only allow movement to adjacent cells
        const dx = Math.abs(newX - gameState.player.position.x);
        const dy = Math.abs(newY - gameState.player.position.y);
        
        if (dx + dy === 1) { // Allow only orthogonal movement
            movePlayer(newX, newY);
        }
    });
    
    // Combat zone selection
    document.querySelectorAll('.zone').forEach(zone => {
        zone.addEventListener('click', (e) => {
            if (!gameState.combat.inProgress) return;
            
            const isAttackZone = e.target.closest('.attack-zones');
            if (isAttackZone) {
                document.querySelectorAll('.attack-zones .zone').forEach(z => 
                    z.classList.remove('selected'));
                zone.classList.add('selected');
                gameState.combat.selectedAttackZone = zone.dataset.zone;
            } else {
                zone.classList.toggle('selected');
                const blockZones = Array.from(
                    document.querySelectorAll('.block-zones .zone.selected'))
                    .map(z => z.dataset.zone);
                gameState.combat.selectedBlockZones = blockZones;
            }
        });
    });
}

// Generate maze using recursive backtracking
function generateMaze() {
    // Initialize cells array with walls
    gameState.map.cells = Array(gameState.map.height).fill().map(() => 
        Array(gameState.map.width).fill(CELL_TYPES.WALL));
    
    // Start from a random point
    const startX = 1;
    const startY = 1;
    gameState.player.position = { x: startX, y: startY };
    
    function carve(x, y) {
        gameState.map.cells[y][x] = CELL_TYPES.PATH;
        
        // Define possible directions
        const directions = [
            [0, -2], // Up
            [2, 0],  // Right
            [0, 2],  // Down
            [-2, 0]  // Left
        ].sort(() => Math.random() - 0.5);
        
        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            
            if (newX > 0 && newX < gameState.map.width - 1 && 
                newY > 0 && newY < gameState.map.height - 1 && 
                gameState.map.cells[newY][newX] === CELL_TYPES.WALL) {
                // Carve path between current cell and new cell
                gameState.map.cells[y + dy/2][x + dx/2] = CELL_TYPES.PATH;
                carve(newX, newY);
            }
        }
    }
    
    // Generate the basic maze
    carve(startX, startY);
    
    // Add doors, chests, and exit
    addSpecialCells();
}

function addSpecialCells() {
    // Add starter chest near the beginning
    let chestPlaced = false;
    for (let y = 1; y < 4 && !chestPlaced; y++) {
        for (let x = 1; x < 4; x++) {
            if (gameState.map.cells[y][x] === CELL_TYPES.PATH) {
                gameState.map.cells[y][x] = CELL_TYPES.CHEST;
                chestPlaced = true;
                break;
            }
        }
    }
    
    // Add doors randomly
    const paths = [];
    for (let y = 1; y < gameState.map.height - 1; y++) {
        for (let x = 1; x < gameState.map.width - 1; x++) {
            if (gameState.map.cells[y][x] === CELL_TYPES.PATH) {
                paths.push({x, y});
            }
        }
    }
    
    // Place 3-5 doors randomly
    const numDoors = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numDoors; i++) {
        const randomIndex = Math.floor(Math.random() * paths.length);
        const {x, y} = paths[randomIndex];
        gameState.map.cells[y][x] = CELL_TYPES.DOOR;
        gameState.map.doors.push({x, y, isLocked: true});
        paths.splice(randomIndex, 1);
    }
    
    // Place exit far from start
    let maxDistance = 0;
    let exitPos = null;
    
    paths.forEach(({x, y}) => {
        const distance = Math.abs(x - gameState.player.position.x) + 
                        Math.abs(y - gameState.player.position.y);
        if (distance > maxDistance) {
            maxDistance = distance;
            exitPos = {x, y};
        }
    });
    
    if (exitPos) {
        gameState.map.cells[exitPos.y][exitPos.x] = CELL_TYPES.EXIT;
    }
}

// Handle chest interaction
function openChest(x, y) {
    if (!gameState.player.hasBasicGear) {
        // Give starter equipment
        gameState.player.equipment = {...STARTER_EQUIPMENT};
        gameState.player.hasBasicGear = true;
        
        // Show equipment obtained message
        showMessage("Получено базовое снаряжение! Теперь можно сражаться!");
        
        // Remove chest from map
        gameState.map.cells[y][x] = CELL_TYPES.PATH;
        
        // Spawn initial enemies
        spawnEnemies();
        
        // Update display
        createMap();
        updateStats();
    }
}

// Show message to player
function showMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'game-message';
    messageDiv.textContent = text;
    document.querySelector('.game-world').appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

// Start the game
document.addEventListener('DOMContentLoaded', initGame); 