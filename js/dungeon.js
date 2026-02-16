// ============================================================
// PROCEDURAL DUNGEON GENERATOR (BSP + Room Placement)
// ============================================================

class Dungeon {
    constructor(floor = 1) {
        this.floor = floor;
        this.width = CONFIG.MAP_WIDTH;
        this.height = CONFIG.MAP_HEIGHT;
        this.map = [];
        this.rooms = [];
        this.explored = [];
        this.playerStart = { x: 0, y: 0 };
        this.stairsPos = { x: 0, y: 0 };
        this.enemySpawns = [];
        this.itemSpawns = [];
        this.chestPositions = [];

        this.generate();
    }

    generate() {
        // Initialize map with walls
        this.map = Array.from({ length: this.height }, () =>
            Array(this.width).fill(CONFIG.TILE.WALL)
        );
        this.explored = Array.from({ length: this.height }, () =>
            Array(this.width).fill(false)
        );

        // Generate rooms
        this.generateRooms();

        // Connect rooms with corridors
        this.connectRooms();

        // Place stairs in the last room
        this.placeStairs();

        // Place player in first room
        const firstRoom = this.rooms[0];
        this.playerStart = {
            x: Math.floor(firstRoom.x + firstRoom.w / 2),
            y: Math.floor(firstRoom.y + firstRoom.h / 2)
        };

        // Place enemies
        this.placeEnemies();

        // Place items and chests
        this.placeChests();
    }

    generateRooms() {
        const numRooms = Utils.randInt(CONFIG.MIN_ROOMS, CONFIG.MAX_ROOMS);
        let attempts = 0;
        const maxAttempts = 200;

        while (this.rooms.length < numRooms && attempts < maxAttempts) {
            attempts++;
            const w = Utils.randInt(CONFIG.MIN_ROOM_SIZE, CONFIG.MAX_ROOM_SIZE);
            const h = Utils.randInt(CONFIG.MIN_ROOM_SIZE, CONFIG.MAX_ROOM_SIZE);
            const x = Utils.randInt(1, this.width - w - 2);
            const y = Utils.randInt(1, this.height - h - 2);

            const newRoom = { x, y, w, h };

            // Check overlap with existing rooms (with padding)
            let overlaps = false;
            for (const room of this.rooms) {
                if (x - 2 < room.x + room.w && x + w + 2 > room.x &&
                    y - 2 < room.y + room.h && y + h + 2 > room.y) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                this.carveRoom(newRoom);
                this.rooms.push(newRoom);
            }
        }
    }

    carveRoom(room) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.map[y][x] = CONFIG.TILE.FLOOR;
            }
        }
    }

    connectRooms() {
        // Connect each room to the next with an L-shaped corridor
        for (let i = 0; i < this.rooms.length - 1; i++) {
            const roomA = this.rooms[i];
            const roomB = this.rooms[i + 1];

            const ax = Math.floor(roomA.x + roomA.w / 2);
            const ay = Math.floor(roomA.y + roomA.h / 2);
            const bx = Math.floor(roomB.x + roomB.w / 2);
            const by = Math.floor(roomB.y + roomB.h / 2);

            // Randomly choose horizontal-first or vertical-first
            if (Math.random() < 0.5) {
                this.carveHCorridor(ax, bx, ay);
                this.carveVCorridor(ay, by, bx);
            } else {
                this.carveVCorridor(ay, by, ax);
                this.carveHCorridor(ax, bx, by);
            }
        }
    }

    carveHCorridor(x1, x2, y) {
        const start = Math.min(x1, x2);
        const end = Math.max(x1, x2);
        for (let x = start; x <= end; x++) {
            // Carve 3 tiles wide (y-1, y, y+1) so player doesn't get stuck
            for (let dy = -1; dy <= 1; dy++) {
                const cy = y + dy;
                if (cy >= 0 && cy < this.height && x >= 0 && x < this.width) {
                    if (this.map[cy][x] === CONFIG.TILE.WALL) {
                        this.map[cy][x] = CONFIG.TILE.CORRIDOR;
                    }
                }
            }
        }
    }

    carveVCorridor(y1, y2, x) {
        const start = Math.min(y1, y2);
        const end = Math.max(y1, y2);
        for (let y = start; y <= end; y++) {
            // Carve 3 tiles wide (x-1, x, x+1) so player doesn't get stuck
            for (let dx = -1; dx <= 1; dx++) {
                const cx = x + dx;
                if (y >= 0 && y < this.height && cx >= 0 && cx < this.width) {
                    if (this.map[y][cx] === CONFIG.TILE.WALL) {
                        this.map[y][cx] = CONFIG.TILE.CORRIDOR;
                    }
                }
            }
        }
    }

    placeStairs() {
        if (this.floor >= CONFIG.MAX_FLOORS) return; // No stairs on last floor

        const lastRoom = this.rooms[this.rooms.length - 1];
        this.stairsPos = {
            x: Math.floor(lastRoom.x + lastRoom.w / 2),
            y: Math.floor(lastRoom.y + lastRoom.h / 2)
        };
        this.map[this.stairsPos.y][this.stairsPos.x] = CONFIG.TILE.STAIRS_DOWN;
    }

    placeEnemies() {
        const enemyTypes = CONFIG.FLOOR_ENEMIES[this.floor - 1] || CONFIG.FLOOR_ENEMIES[CONFIG.FLOOR_ENEMIES.length - 1];
        const count = CONFIG.FLOOR_ENEMY_COUNT[this.floor - 1] || 13;

        // Place boss in last room (not on last floor, that has final boss differently)
        const lastRoom = this.rooms[this.rooms.length - 1];
        this.enemySpawns.push({
            type: 'boss',
            x: Math.floor(lastRoom.x + lastRoom.w / 2) + 1,
            y: Math.floor(lastRoom.y + lastRoom.h / 2) + 1
        });

        // Place regular enemies in random rooms (skip first room — player spawn)
        for (let i = 0; i < count; i++) {
            const roomIdx = Utils.randInt(1, this.rooms.length - 1);
            const room = this.rooms[roomIdx];
            const x = Utils.randInt(room.x + 1, room.x + room.w - 2);
            const y = Utils.randInt(room.y + 1, room.y + room.h - 2);

            // Don't spawn on stairs or player start
            if (x === this.playerStart.x && y === this.playerStart.y) continue;
            if (x === this.stairsPos.x && y === this.stairsPos.y) continue;

            this.enemySpawns.push({
                type: Utils.randChoice(enemyTypes),
                x, y
            });
        }
    }

    placeChests() {
        // Place 1-3 chests in random rooms
        const numChests = Utils.randInt(1, 3);
        for (let i = 0; i < numChests; i++) {
            const roomIdx = Utils.randInt(1, this.rooms.length - 1);
            const room = this.rooms[roomIdx];
            const x = Utils.randInt(room.x + 1, room.x + room.w - 2);
            const y = Utils.randInt(room.y + 1, room.y + room.h - 2);

            if (this.map[y][x] === CONFIG.TILE.FLOOR) {
                this.map[y][x] = CONFIG.TILE.CHEST;
                this.chestPositions.push({ x, y, opened: false });
            }
        }
    }

    isWalkable(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return this.map[y][x] !== CONFIG.TILE.WALL;
    }

    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return CONFIG.TILE.WALL;
        return this.map[y][x];
    }

    revealArea(cx, cy, radius) {
        const visible = Utils.computeFOV(this.map, cx, cy, radius);
        visible.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                this.explored[y][x] = true;
            }
        });
        return visible;
    }
}
