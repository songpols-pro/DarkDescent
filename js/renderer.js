// ============================================================
// THREE.JS RENDERER — Optimized 3D Pixel Art
// Uses InstancedMesh for dungeon to minimize draw calls
// Stable enemy mesh tracking via unique IDs
// ============================================================

class Renderer {
    constructor(container) {
        this.container = container;

        // Pixel resolution (low-res for pixel art feel)
        this.pixelScale = 4;
        this.renderWidth = Math.floor(window.innerWidth / this.pixelScale);
        this.renderHeight = Math.floor(window.innerHeight / this.pixelScale);

        // Three.js setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x08080f);
        this.scene.fog = new THREE.FogExp2(0x08080f, 0.06);

        // Orthographic camera for top-down view
        const aspect = this.renderWidth / this.renderHeight;
        const frustumSize = 14;
        this.frustumSize = frustumSize;
        this.camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2,
            0.1, 100
        );
        this.camera.position.set(0, 15, 8);
        this.camera.lookAt(0, 0, 0);
        this.camera.rotation.order = 'YXZ';

        // Renderer at low resolution for pixel art
        this.renderer3d = new THREE.WebGLRenderer({ antialias: false });
        this.renderer3d.setSize(this.renderWidth, this.renderHeight);
        this.renderer3d.setPixelRatio(1);
        this.renderer3d.shadowMap.enabled = true;
        this.renderer3d.shadowMap.type = THREE.BasicShadowMap;
        this.renderer3d.domElement.style.imageRendering = 'pixelated';
        this.renderer3d.domElement.style.width = '100%';
        this.renderer3d.domElement.style.height = '100%';
        this.renderer3d.domElement.id = 'game-canvas';
        container.appendChild(this.renderer3d.domElement);

        // Lighting
        this.setupLighting();

        // Materials cache
        this.materials = this.createMaterials();

        // Groups
        this.dungeonGroup = new THREE.Group();
        this.entityGroup = new THREE.Group();
        this.scene.add(this.dungeonGroup);
        this.scene.add(this.entityGroup);

        // Enemy mesh tracking (keyed by enemy.id)
        this.enemyMeshes = new Map();

        // Ground item mesh tracking (keyed by item.id)
        this.itemMeshes = new Map();

        // Fog tile tracking for per-tile visibility
        this.fogInstances = []; // {x, y, idx} — index into fogInstanceMesh
        this.fogInstancedMesh = null;

        // Player
        this.playerMesh = null;
        this.playerSwordMesh = null;

        // Camera target
        this.cameraTarget = new THREE.Vector3();
        this.cameraOffset = new THREE.Vector3(0, 15, 8);

        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDecay = 0.88;

        // Floating text overlay
        this.setupOverlayCanvas();

        // Animation
        this.time = 0;
        this.builtFloor = -1;

        // Shared geometry (created once)
        this._wallGeo = new THREE.BoxGeometry(1, 1.5, 1);
        this._wallTopGeo = new THREE.BoxGeometry(1.02, 0.15, 1.02);
        this._floorGeo = new THREE.BoxGeometry(1, 0.1, 1);
        this._fogGeo = new THREE.BoxGeometry(1.01, 2, 1.01);
        this._matrix = new THREE.Matrix4();
        this._dummyColor = new THREE.Color();

        window.addEventListener('resize', () => this.onResize());
    }

    setupLighting() {
        const ambient = new THREE.AmbientLight(0x333355, 0.6);
        this.scene.add(ambient);

        this.torchLight = new THREE.PointLight(0xffaa44, 1.8, 10, 1.5);
        this.torchLight.position.set(0, 3, 0);
        this.torchLight.castShadow = true;
        this.torchLight.shadow.mapSize.width = 256;
        this.torchLight.shadow.mapSize.height = 256;
        this.torchLight.shadow.camera.near = 0.1;
        this.torchLight.shadow.camera.far = 12;
        this.scene.add(this.torchLight);

        const fillLight = new THREE.DirectionalLight(0x6666aa, 0.3);
        fillLight.position.set(-5, 10, -5);
        this.scene.add(fillLight);
    }

    createMaterials() {
        return {
            wall: new THREE.MeshLambertMaterial({ color: 0x2a1f3d }),
            wallTop: new THREE.MeshLambertMaterial({ color: 0x3d2d5c }),
            floor: new THREE.MeshLambertMaterial({ color: 0x1a1425 }),
            corridor: new THREE.MeshLambertMaterial({ color: 0x151020 }),
            stairs: new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0x997700, emissiveIntensity: 0.4 }),
            chest: new THREE.MeshLambertMaterial({ color: 0xdaa520 }),
            fog: new THREE.MeshBasicMaterial({ color: 0x050510 }),
            explored: new THREE.MeshBasicMaterial({ color: 0x08080f, transparent: true, opacity: 0.65 }),
            enemy: {
                skeleton: new THREE.MeshLambertMaterial({ color: 0xccccaa }),
                slime: new THREE.MeshLambertMaterial({ color: 0x44dd44, transparent: true, opacity: 0.8 }),
                goblin: new THREE.MeshLambertMaterial({ color: 0x88aa44 }),
                dark_mage: new THREE.MeshLambertMaterial({ color: 0x9944cc, emissive: 0x440066, emissiveIntensity: 0.3 }),
                boss: new THREE.MeshLambertMaterial({ color: 0xff4444, emissive: 0x880000, emissiveIntensity: 0.4 }),
            },
            // Hit flash material (shared)
            hitFlash: new THREE.MeshLambertMaterial({ color: 0xff4444, emissive: 0xff0000, emissiveIntensity: 0.8 }),
            itemCommon: new THREE.MeshLambertMaterial({ color: 0x9d9d9d, emissive: 0x333333, emissiveIntensity: 0.3 }),
            itemMagic: new THREE.MeshLambertMaterial({ color: 0x4169e1, emissive: 0x1133aa, emissiveIntensity: 0.4 }),
            itemRare: new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0x997700, emissiveIntensity: 0.5 }),
            itemLegendary: new THREE.MeshLambertMaterial({ color: 0xff6600, emissive: 0xaa3300, emissiveIntensity: 0.6 }),
        };
    }

    setupOverlayCanvas() {
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.id = 'overlay-canvas';
        this.overlayCanvas.style.position = 'absolute';
        this.overlayCanvas.style.top = '0';
        this.overlayCanvas.style.left = '0';
        this.overlayCanvas.style.pointerEvents = 'none';
        this.overlayCanvas.style.zIndex = '5';
        this.overlayCanvas.width = window.innerWidth;
        this.overlayCanvas.height = window.innerHeight;
        this.container.appendChild(this.overlayCanvas);
        this.overlayCtx = this.overlayCanvas.getContext('2d');
    }

    onResize() {
        this.renderWidth = Math.floor(window.innerWidth / this.pixelScale);
        this.renderHeight = Math.floor(window.innerHeight / this.pixelScale);

        const aspect = this.renderWidth / this.renderHeight;
        this.camera.left = -this.frustumSize * aspect / 2;
        this.camera.right = this.frustumSize * aspect / 2;
        this.camera.top = this.frustumSize / 2;
        this.camera.bottom = -this.frustumSize / 2;
        this.camera.updateProjectionMatrix();

        this.renderer3d.setSize(this.renderWidth, this.renderHeight);
        this.overlayCanvas.width = window.innerWidth;
        this.overlayCanvas.height = window.innerHeight;
    }

    shake(intensity = 5) {
        this.shakeIntensity = intensity * 0.05;
    }

    // ============================
    // BUILD 3D DUNGEON (InstancedMesh)
    // ============================
    buildDungeon(dungeon) {
        // Clear previous dungeon
        while (this.dungeonGroup.children.length > 0) {
            const child = this.dungeonGroup.children[0];
            this.dungeonGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
        }

        const mat = this._matrix;

        // ---- Count tiles by type ----
        let wallCount = 0, wallTopCount = 0, floorCount = 0, fogCount = 0;
        const specialTiles = []; // stairs, chests — few, keep as individual meshes

        for (let y = 0; y < dungeon.height; y++) {
            for (let x = 0; x < dungeon.width; x++) {
                const tile = dungeon.map[y][x];
                fogCount++;
                if (tile === CONFIG.TILE.WALL) {
                    wallCount++;
                    // Check if wall has a visible top edge
                    if (y > 0 && dungeon.map[y - 1][x] !== CONFIG.TILE.WALL) {
                        wallTopCount++;
                    }
                } else {
                    floorCount++;
                    if (tile === CONFIG.TILE.STAIRS_DOWN || tile === CONFIG.TILE.CHEST) {
                        specialTiles.push({ x, y, tile });
                    }
                }
            }
        }

        // ---- Create InstancedMeshes ----
        const wallIM = new THREE.InstancedMesh(this._wallGeo, this.materials.wall, wallCount);
        wallIM.castShadow = true;
        wallIM.receiveShadow = true;

        const wallTopIM = new THREE.InstancedMesh(this._wallTopGeo, this.materials.wallTop, wallTopCount);

        const floorIM = new THREE.InstancedMesh(this._floorGeo, this.materials.floor, floorCount);
        floorIM.receiveShadow = true;

        const fogIM = new THREE.InstancedMesh(this._fogGeo, this.materials.fog, fogCount);
        this.fogInstancedMesh = fogIM;
        this.fogInstances = [];

        // ---- Fill instances ----
        let wi = 0, wti = 0, fi = 0, fogi = 0;

        for (let y = 0; y < dungeon.height; y++) {
            for (let x = 0; x < dungeon.width; x++) {
                const tile = dungeon.map[y][x];

                if (tile === CONFIG.TILE.WALL) {
                    mat.makeTranslation(x, 0.75, y);
                    wallIM.setMatrixAt(wi++, mat);

                    if (y > 0 && dungeon.map[y - 1][x] !== CONFIG.TILE.WALL) {
                        mat.makeTranslation(x, 1.55, y);
                        wallTopIM.setMatrixAt(wti++, mat);
                    }
                } else {
                    // Floor tile — use color to differentiate floor vs corridor
                    mat.makeTranslation(x, 0, y);
                    floorIM.setMatrixAt(fi, mat);
                    if (tile === CONFIG.TILE.CORRIDOR) {
                        floorIM.setColorAt(fi, this._dummyColor.setHex(0x151020));
                    } else if ((x + y) % 2 === 0) {
                        floorIM.setColorAt(fi, this._dummyColor.setHex(0x1a1425));
                    } else {
                        floorIM.setColorAt(fi, this._dummyColor.setHex(0x1e1830));
                    }
                    fi++;
                }

                // Fog instance
                mat.makeTranslation(x, 0.5, y);
                fogIM.setMatrixAt(fogi, mat);
                this.fogInstances.push({ x, y, idx: fogi });
                fogi++;
            }
        }

        wallIM.instanceMatrix.needsUpdate = true;
        wallTopIM.instanceMatrix.needsUpdate = true;
        floorIM.instanceMatrix.needsUpdate = true;
        if (floorIM.instanceColor) floorIM.instanceColor.needsUpdate = true;
        fogIM.instanceMatrix.needsUpdate = true;

        this.dungeonGroup.add(wallIM);
        this.dungeonGroup.add(wallTopIM);
        this.dungeonGroup.add(floorIM);
        this.dungeonGroup.add(fogIM);

        // ---- Special tiles (stairs, chests) — individual meshes ----
        this.stairsMesh = null;
        this.chestMeshes = {};

        specialTiles.forEach(st => {
            if (st.tile === CONFIG.TILE.STAIRS_DOWN) {
                const stairsGeo = new THREE.BoxGeometry(0.6, 0.3, 0.6);
                const stairs = new THREE.Mesh(stairsGeo, this.materials.stairs);
                stairs.position.set(st.x, 0.2, st.y);
                this.dungeonGroup.add(stairs);
                this.stairsMesh = stairs;

                const stairsLight = new THREE.PointLight(0xffd700, 0.8, 4);
                stairsLight.position.set(st.x, 1, st.y);
                this.dungeonGroup.add(stairsLight);
            } else if (st.tile === CONFIG.TILE.CHEST) {
                const chestGeo = new THREE.BoxGeometry(0.5, 0.4, 0.4);
                const chest = new THREE.Mesh(chestGeo, this.materials.chest);
                chest.position.set(st.x, 0.25, st.y);
                chest.castShadow = true;
                this.dungeonGroup.add(chest);
                this.chestMeshes[`${st.x},${st.y}`] = chest;
            }
        });

        this.builtFloor = dungeon.floor;
    }

    // ============================
    // UPDATE FOG OF WAR (InstancedMesh)
    // ============================
    updateFog(dungeon, visibleSet) {
        const mat = this._matrix;
        const hiddenMat = new THREE.Matrix4().makeScale(0, 0, 0);
        let needsUpdate = false;

        this.fogInstances.forEach(ft => {
            const key = `${ft.x},${ft.y}`;
            const isVisible = visibleSet.has(key);
            const isExplored = dungeon.explored[ft.y] && dungeon.explored[ft.y][ft.x];

            if (isVisible) {
                // Hide fog — scale to 0
                hiddenMat.makeTranslation(ft.x, -10, ft.y); // Move off-screen
                this.fogInstancedMesh.setMatrixAt(ft.idx, hiddenMat);
                needsUpdate = true;
            } else if (isExplored) {
                // Dim fog
                mat.makeTranslation(ft.x, 0.5, ft.y);
                mat.scale(new THREE.Vector3(1, 0.3, 1)); // Shorter fog = dimmer feel
                this.fogInstancedMesh.setMatrixAt(ft.idx, mat);
                needsUpdate = true;
            }
            // Unexplored tiles keep their default full fog
        });

        if (needsUpdate) {
            this.fogInstancedMesh.instanceMatrix.needsUpdate = true;
        }
    }

    // ============================
    // PLAYER (class-specific model)
    // ============================
    // ============================
    // PLAYER (class-specific model)
    // ============================
    // ============================
    // PLAYER (class-specific model)
    // ============================
    buildPlayer(player) {
        if (this.playerMesh) {
            this.entityGroup.remove(this.playerMesh);
        }

        const data = this.createPlayerGroup(player);
        this.playerMesh = data.mesh;
        this.playerLimbs = data.limbs; // Store references
        this.playerSwordMesh = data.swordMesh;
        this.entityGroup.add(this.playerMesh);
    }

    renderPreview(player, canvas) {
        if (!canvas) return;
        const width = canvas.width;
        const height = canvas.height;

        // Init preview renderer if needed
        if (!this.previewRenderer) {
            this.previewRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
            this.previewRenderer.setSize(width, height);
            this.previewRenderer.setPixelRatio(1);

            this.previewScene = new THREE.Scene();
            this.previewScene.background = new THREE.Color(0x151520); // Dark BG for preview

            // Preview Lights
            const ambient = new THREE.AmbientLight(0xffffff, 0.7);
            this.previewScene.add(ambient);
            const dir = new THREE.DirectionalLight(0xffd700, 0.8);
            dir.position.set(2, 5, 4);
            this.previewScene.add(dir);

            this.previewCamera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
            this.previewCamera.position.set(0, 1.2, 3.5);
            this.previewCamera.lookAt(0, 0.8, 0);
        }

        // Clear previous model
        while (this.previewScene.children.length > 2) { // Keep lights
            const child = this.previewScene.children[2];
            this.previewScene.remove(child);
        }

        // Build player model for preview
        const data = this.createPlayerGroup(player);
        const mesh = data.mesh;

        // Idle Animation pose for preview
        if (data.limbs.leftArm) data.limbs.leftArm.rotation.z = 0.2;
        if (data.limbs.rightArm) data.limbs.rightArm.rotation.z = -0.2;

        this.previewScene.add(mesh);
        this.previewRenderer.render(this.previewScene, this.previewCamera);
    }

    updatePlayerVisuals(player) {
        // Rebuild in-game mesh
        this.buildPlayer(player);

        // If inventory is open, update preview too (optional optimization: check visibility)
        const previewCanvas = document.getElementById('char-preview-canvas');
        if (previewCanvas && previewCanvas.offsetParent !== null) {
            this.renderPreview(player, previewCanvas);
        }
    }

    createPlayerGroup(player) {
        const cls = player.classDef;
        const group = new THREE.Group();
        const limbs = {};
        let swordMesh = null;

        const bodyMat = new THREE.MeshLambertMaterial({ color: cls.bodyColor });
        const headMat = new THREE.MeshLambertMaterial({ color: cls.headColor });
        const weaponMat = new THREE.MeshLambertMaterial({ color: cls.weaponColor });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const beltMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

        // === TORSO ===
        // Determine Armor Look
        let chestColor = cls.bodyColor;
        let chestGeoScore = 0; // 0=cloth, 1=leather/chain, 2=plate

        if (player.equipment.chest) {
            const base = ITEM_BASES[player.equipment.chest.baseKey];
            if (base) {
                if (base.baseArmor > 8) { chestGeoScore = 2; chestColor = 0xaaaaaa; } // Plate
                else if (base.baseArmor > 4) { chestGeoScore = 1; chestColor = 0x667788; } // Chain
                else { chestColor = 0x553322; } // Cloth/Leather override
            }
        }

        const torsoInfo = this.buildTorso(chestColor, chestGeoScore);
        group.add(torsoInfo.mesh);

        // === BELT ===
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.27), beltMat);
        belt.position.y = 0.31;
        group.add(belt);

        // === HEAD ===
        let headColor = cls.headColor;
        let hatType = 'none'; // none, cap, helm, crown, hood, mage_hat

        // Default class hats
        if (player.classKey === 'mage') hatType = 'mage_hat';
        if (player.classKey === 'rogue') hatType = 'hood';
        if (player.classKey === 'warrior') hatType = 'helm';

        // Equipment Override
        if (player.equipment.helmet) {
            const base = player.equipment.helmet.baseKey;
            if (base.includes('cap')) hatType = 'cap';
            else if (base.includes('helm')) hatType = 'helm';
            else if (base.includes('crown')) hatType = 'crown';
            else if (base.includes('hood')) hatType = 'hood';
        }

        const headGroup = this.buildHead(skinMat, hatType, player.classKey);
        headGroup.position.y = 0.95;
        group.add(headGroup);

        // === ARMS ===
        const armGeo = new THREE.BoxGeometry(0.12, 0.4, 0.14);

        // Left Arm
        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.28, 0.65, 0);
        const leftArm = new THREE.Mesh(armGeo, new THREE.MeshLambertMaterial({ color: chestColor }));
        leftArm.position.y = -0.15;
        leftArmGroup.add(leftArm);
        const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), skinMat);
        leftHand.position.set(0, -0.37, 0);
        leftArmGroup.add(leftHand);
        group.add(leftArmGroup);
        limbs.leftArm = leftArmGroup;

        // Right Arm
        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.28, 0.65, 0);
        const rightArm = new THREE.Mesh(armGeo, new THREE.MeshLambertMaterial({ color: chestColor }));
        rightArm.position.y = -0.15;
        rightArmGroup.add(rightArm);
        const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), skinMat);
        rightHand.position.set(0, -0.37, 0);
        rightArmGroup.add(rightHand);
        group.add(rightArmGroup);
        limbs.rightArm = rightArmGroup;

        // === LEGS (Boots) ===
        let bootColor = 0x222222;
        if (player.equipment.boots) {
            const base = player.equipment.boots.baseKey;
            if (base.includes('iron')) bootColor = 0x777777;
            if (base.includes('shadow')) bootColor = 0x111111;
            if (base.includes('sandals')) bootColor = 0x8B4513;
        }

        const legMats = { leg: darkMat, boot: new THREE.MeshLambertMaterial({ color: bootColor }) };
        const leftLeg = this.buildLeg(legMats, -0.1);
        group.add(leftLeg);
        limbs.leftLeg = leftLeg;

        const rightLeg = this.buildLeg(legMats, 0.1);
        group.add(rightLeg);
        limbs.rightLeg = rightLeg;

        // === WEAPON ===
        // Determine weapon type
        let wepType = 'none';
        let wepColor = cls.weaponColor;

        if (player.equipment.weapon) {
            const base = player.equipment.weapon.baseKey;
            if (base.includes('sword') || base.includes('blade')) wepType = 'sword';
            if (base.includes('axe')) wepType = 'axe';
            if (base.includes('dagger')) wepType = 'dagger';
            if (base.includes('spear') || base.includes('lance')) wepType = 'spear';
            if (base.includes('staff')) wepType = 'staff';

            // Special colors based on name
            if (base.includes('flame')) wepColor = 0xff4400;
            if (base.includes('dark')) wepColor = 0x330044;
            if (base.includes('iron') || base.includes('steel')) wepColor = 0xcccccc;
            if (base.includes('wood')) wepColor = 0x8B4513;
        } else {
            // Default class weapon
            if (player.classKey === 'warrior') wepType = 'sword';
            if (player.classKey === 'rogue') wepType = 'dagger';
            if (player.classKey === 'mage') wepType = 'staff';
        }

        if (wepType !== 'none') {
            const wepMesh = this.buildWeapon(wepType, wepColor);

            if (wepType === 'dagger') {
                // Dual wield for visual? Or just one. Rogues dual wield in original code.
                rightArmGroup.add(wepMesh);
                // Optional: Offhand dagger
                if (player.classKey === 'rogue') {
                    const offDagger = wepMesh.clone();
                    leftArmGroup.add(offDagger);
                }
            } else {
                rightArmGroup.add(wepMesh);
            }
            swordMesh = rightArmGroup; // Arm controls rotation
        }

        // === OFFHAND (Shield / Book) ===
        // Currently logic assumes class based offhand defaults unless we add shield slots
        if (player.classKey === 'warrior') {
            const shield = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.04), new THREE.MeshLambertMaterial({ color: 0x884422 }));
            shield.position.set(0.1, -0.15, 0);
            shield.rotation.y = Math.PI / 2;
            leftArmGroup.add(shield);
        } else if (player.classKey === 'mage') {
            const book = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.04), new THREE.MeshLambertMaterial({ color: 0x992222 }));
            book.position.set(0.1, -0.2, 0);
            book.rotation.z = 0.2;
            leftArmGroup.add(book);
        }

        return { mesh: group, limbs, swordMesh };
    }

    buildTorso(color, type) {
        const mat = new THREE.MeshLambertMaterial({ color: color });
        const geo = new THREE.BoxGeometry(0.4, 0.45, 0.25);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.52;
        mesh.castShadow = true;

        // Add details based on armor type
        if (type === 2) { // Plate
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.28), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
            plate.position.set(0, 0, 0);
            mesh.add(plate);
        }
        return { mesh };
    }

    buildHead(skinMat, hatType, classKey) {
        const group = new THREE.Group();

        // Face
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.3), skinMat);
        head.castShadow = true;
        group.add(head);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
        const eyeWhite = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const eyePupil = new THREE.MeshLambertMaterial({ color: 0x111111 });

        const le = new THREE.Mesh(eyeGeo, eyeWhite); le.position.set(-0.08, 0.02, 0.16); group.add(le);
        const lp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.02), eyePupil); lp.position.set(-0.08, 0.02, 0.17); group.add(lp);

        const re = new THREE.Mesh(eyeGeo, eyeWhite); re.position.set(0.08, 0.02, 0.16); group.add(re);
        const rp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.02), eyePupil); rp.position.set(0.08, 0.02, 0.17); group.add(rp);

        // Hat Logic
        const hatColor = classKey === 'mage' ? 0x2244aa : (classKey === 'rogue' ? 0x1a3322 : 0x888899);
        const hatMat = new THREE.MeshLambertMaterial({ color: hatColor });

        if (hatType === 'helm') {
            const helm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), hatMat);
            group.add(helm);
        } else if (hatType === 'cap') {
            const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
            cap.position.y = 0.18;
            group.add(cap);
        } else if (hatType === 'crown') {
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 8), new THREE.MeshLambertMaterial({ color: 0xFFD700 }));
            crown.position.y = 0.2;
            group.add(crown);
        } else if (hatType === 'mage_hat') {
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 8), hatMat);
            brim.position.y = 0.17;
            group.add(brim);
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 8), hatMat);
            cone.position.y = 0.37;
            group.add(cone);
        } else if (hatType === 'hood') {
            const hood = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), hatMat);
            // Hood covers more
            group.add(hood);
        } else {
            // Hair if no full helm
            const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), new THREE.MeshLambertMaterial({ color: 0x553322 }));
            hair.position.y = 0.18;
            group.add(hair);
        }

        return group;
    }

    buildLeg(mats, xOffset) {
        const group = new THREE.Group();
        group.position.set(xOffset, 0.3, 0);

        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.17), mats.leg);
        leg.position.y = -0.15;
        leg.castShadow = true;
        group.add(leg);

        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.22), mats.boot);
        foot.position.set(0, -0.27, 0.03);
        group.add(foot);

        return group;
    }

    buildWeapon(type, color) {
        const mat = new THREE.MeshLambertMaterial({ color: color });
        const mesh = new THREE.Group();

        if (type === 'sword') {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.04), mat);
            blade.position.set(0, -0.25, 0.2);
            blade.rotation.x = -Math.PI / 2;
            mesh.add(blade);
            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), new THREE.MeshLambertMaterial({ color: 0xFFD700 }));
            guard.position.set(0, -0.3, 0.1);
            guard.rotation.x = -Math.PI / 2;
            mesh.add(guard);
        } else if (type === 'axe') {
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
            handle.position.set(0, -0.25, 0.2);
            handle.rotation.x = -Math.PI / 2;
            mesh.add(handle);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.15), mat);
            head.position.set(0, -0.5, 0.2);
            head.rotation.x = -Math.PI / 2;
            mesh.add(head);
        } else if (type === 'dagger') {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.04), mat);
            blade.position.set(0, -0.25, 0.1);
            blade.rotation.x = -Math.PI / 2;
            mesh.add(blade);
        } else if (type === 'spear') {
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.2, 0.03), new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
            handle.position.set(0, -0.25, 0.2);
            handle.rotation.x = -Math.PI / 2;
            mesh.add(handle);
            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 4), mat);
            tip.position.set(0, -0.85, 0.2);
            tip.rotation.x = -Math.PI / 2;
            mesh.add(tip);
        } else if (type === 'staff') {
            const staff = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), new THREE.MeshLambertMaterial({ color: 0x553322 }));
            staff.position.set(0, -0.1, 0.1);
            staff.rotation.x = -0.2;
            mesh.add(staff);
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08), mat);
            orb.position.set(0, 0.4, 0.15);
            mesh.add(orb);
        }

        return mesh;
    }

    // Attack slash visual effect
    showAttackSlash(x, y, angle, range, arc, color) {
        const arcSegments = 12;
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        for (let i = 0; i <= arcSegments; i++) {
            const a = -arc / 2 + (arc / arcSegments) * i;
            shape.lineTo(Math.sin(a) * range, Math.cos(a) * range);
        }
        shape.lineTo(0, 0);

        const geo = new THREE.ShapeGeometry(shape);
        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = angle + Math.PI;
        mesh.position.set(x, 0.15, y);
        this.entityGroup.add(mesh);

        const startTime = this.time;
        mesh._slashUpdate = () => {
            const elapsed = this.time - startTime;
            if (elapsed > 0.15) {
                this.entityGroup.remove(mesh);
                geo.dispose();
                mat.dispose();
                return true;
            }
            mat.opacity = 0.45 * (1 - elapsed / 0.15);
            return false;
        };

        if (!this._slashEffects) this._slashEffects = [];
        this._slashEffects.push(mesh);
    }

    updatePlayer(player) {
        if (!this.playerMesh) this.buildPlayer(player);

        this.playerMesh.position.x = player.x;
        this.playerMesh.position.z = player.y;

        // Face aim direction
        const targetAngle = player.aimAngle;
        let diff = targetAngle - this.playerMesh.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.playerMesh.rotation.y += diff * 0.25;

        // Movement Animation (Walking)
        const isMoving = Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1;

        if (isMoving) {
            // Bobbing
            this.playerMesh.position.y = Math.abs(Math.sin(this.time * 12)) * 0.08;

            // Leg swing
            const walkCycle = Math.sin(this.time * 12);
            if (this.playerLimbs && this.playerLimbs.leftLeg) {
                this.playerLimbs.leftLeg.rotation.x = walkCycle * 0.8;
                this.playerLimbs.rightLeg.rotation.x = -walkCycle * 0.8;
                this.playerLimbs.leftArm.rotation.x = -walkCycle * 0.5;
            }

            // Right arm swings unless attacking
            if (!player.isAttacking && this.playerLimbs && this.playerLimbs.rightArm) {
                this.playerLimbs.rightArm.rotation.x = walkCycle * 0.5;
            }
        } else {
            // Idle breathing
            this.playerMesh.position.y = Math.sin(this.time * 2) * 0.02;

            // Reset limbs
            if (this.playerLimbs) {
                this.playerLimbs.leftLeg.rotation.x *= 0.8;
                this.playerLimbs.rightLeg.rotation.x *= 0.8;
                this.playerLimbs.leftArm.rotation.x *= 0.8;
                if (!player.isAttacking) {
                    this.playerLimbs.rightArm.rotation.x *= 0.8;
                }
            }
        }

        // Weapon swing animation (overrides walking for right arm)
        if (player.isAttacking && this.playerSwordMesh) {
            this.playerSwordMesh.rotation.x = -Math.PI / 2 - 0.5; // Raise arm
            this.playerSwordMesh.rotation.y = -0.5;
        } else if (this.playerSwordMesh && !isMoving) {
            // Reset attack rotation slowly
            // Handled by walk cycle or idle reset
        }

        player.animOffset.x *= 0.85;
        player.animOffset.y *= 0.85;

        this.torchLight.position.set(player.x, 2.5, player.y);
        this.torchLight.intensity = 1.8 + Math.sin(this.time * 7) * 0.15 + Math.sin(this.time * 13) * 0.08;
    }
    updateEnemies(enemies, visibleSet) {
        // Track which enemy IDs are still alive
        const activeIds = new Set();

        enemies.forEach((enemy, idx) => {
            if (enemy.isDead()) {
                // Remove mesh if enemy just died
                if (this.enemyMeshes.has(enemy.id)) {
                    const mesh = this.enemyMeshes.get(enemy.id);
                    this.entityGroup.remove(mesh);
                    this.enemyMeshes.delete(enemy.id);
                }
                return;
            }

            activeIds.add(enemy.id);
            // Visibility check using floored position (tile coords)
            const etx = Math.floor(enemy.x);
            const ety = Math.floor(enemy.y);
            const visible = visibleSet.has(`${etx},${ety}`);

            // Get or create mesh
            let mesh = this.enemyMeshes.get(enemy.id);
            if (!mesh) {
                mesh = this.createEnemyMesh(enemy);
                this.enemyMeshes.set(enemy.id, mesh);
                this.entityGroup.add(mesh);
            }

            // Direct position follow (real-time)
            mesh.position.x = enemy.x;
            mesh.position.z = enemy.y;
            mesh.position.y = Math.sin(this.time * 2 + idx) * 0.02;

            // Visibility
            mesh.visible = visible;

            // Hit flash — toggle materials (hitFlash is now seconds, >0 = flashing)
            if (enemy.hitFlash > 0) {
                this.setMeshFlash(mesh, true);
            } else {
                this.setMeshFlash(mesh, false);
            }

            // Skill Telegraphs
            if (enemy.state === 'cast' && enemy.telegraph) {
                this.updateTelegraph(mesh, enemy.telegraph);
            } else {
                // Remove telegraph if exists
                const tel = mesh.getObjectByName('telegraph');
                if (tel) mesh.remove(tel);
            }
        });

        // Remove meshes for enemies that no longer exist
        this.enemyMeshes.forEach((mesh, id) => {
            if (!activeIds.has(id)) {
                this.entityGroup.remove(mesh);
                this.enemyMeshes.delete(id);
            }
        });
    }

    updateTelegraph(group, telegraph) {
        let mesh = group.getObjectByName('telegraph');

        // Create if not exists
        if (!mesh) {
            // Fix: THREE.Color doesn't support alpha in string, so we strip it or use valid format
            // If color is hex number, fine. If string like '#rrggbbaa', we need to be careful.
            // But here telegraph.color is likely a hex string or number.
            // The warning said "rgba(100, 255, 0, 0.3)".
            let colorVal = telegraph.color || 0xff0000;
            if (typeof colorVal === 'string' && colorVal.startsWith('rgba')) {
                // Extract rgb and ignore alpha for THREE.Color
                const match = colorVal.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (match) {
                    colorVal = `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
                }
            }

            const color = new THREE.Color(colorVal);
            const mat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide,
                depthWrite: false
            });

            let geo;
            if (telegraph.type === 'circle') {
                geo = new THREE.CircleGeometry(telegraph.radius, 32);
                mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.y = 0.05; // slightly above ground
            } else if (telegraph.type === 'line') {
                geo = new THREE.PlaneGeometry(telegraph.width, telegraph.length);
                geo.translate(0, telegraph.length / 2, 0); // Pivot at start
                mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = -Math.PI / 2;
                // For line, we need to rotate to face target. 
                // Telegraph object has .angle from enemy.startCasting
                // Fix: Plane is created on XY, rotated -90deg X to lie on XZ.
                // Top (Y+) points North (-Z).
                // We want 0 rad to point East (+X).
                // North (-Z) needs to rotate -90deg (-PI/2) to point East (+X).
                mesh.rotation.z = telegraph.angle - Math.PI / 2;

                mesh.position.y = 0.05;
            }

            if (mesh) {
                mesh.name = 'telegraph';
                group.add(mesh);
            }
        }

        // Animate (pulse)
        if (mesh) {
            mesh.material.opacity = 0.3 + Math.sin(Date.now() / 100) * 0.15;
        }
    }

    setMeshFlash(group, flash) {
        if (group._flashing === flash) return; // Skip if already in desired state
        group._flashing = flash;

        group.children.forEach(child => {
            if (!child.material) return;
            if (flash) {
                if (!child._origMaterial) child._origMaterial = child.material;
                child.material = this.materials.hitFlash;
            } else {
                if (child._origMaterial) {
                    child.material = child._origMaterial;
                }
            }
        });
    }

    createEnemyMesh(enemy) {
        const group = new THREE.Group();
        const mat = this.materials.enemy[enemy.type] || this.materials.enemy.skeleton;

        // Common materials
        const whiteMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
        const blackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const redGlow = new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });

        if (enemy.type === 'skeleton') {
            // === SKELETON ===
            // Skull
            const skull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.24), whiteMat);
            skull.position.y = 0.85;
            skull.castShadow = true;
            group.add(skull);
            // Eyes
            const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.02);
            const eyeL = new THREE.Mesh(eyeGeo, blackMat);
            eyeL.position.set(-0.06, 0.85, 0.121);
            group.add(eyeL);
            const eyeR = new THREE.Mesh(eyeGeo, blackMat);
            eyeR.position.set(0.06, 0.85, 0.121);
            group.add(eyeR);

            // Spine
            const spine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), whiteMat);
            spine.position.y = 0.5;
            group.add(spine);

            // Ribs
            const ribGeo = new THREE.BoxGeometry(0.24, 0.03, 0.15);
            for (let i = 0; i < 3; i++) {
                const rib = new THREE.Mesh(ribGeo, whiteMat);
                rib.position.y = 0.65 - i * 0.08;
                group.add(rib);
            }

            // Hips
            const hips = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.12), whiteMat);
            hips.position.y = 0.3;
            group.add(hips);

            // Arms (thin)
            const armGeo = new THREE.BoxGeometry(0.05, 0.35, 0.05);
            const armL = new THREE.Mesh(armGeo, whiteMat);
            armL.position.set(-0.2, 0.55, 0);
            armL.rotation.z = 0.1;
            group.add(armL);
            const armR = new THREE.Mesh(armGeo, whiteMat);
            armR.position.set(0.2, 0.55, 0);
            armR.rotation.z = -0.1;
            group.add(armR);

            // Legs (thin)
            const legGeo = new THREE.BoxGeometry(0.06, 0.3, 0.06);
            const legL = new THREE.Mesh(legGeo, whiteMat);
            legL.position.set(-0.08, 0.15, 0);
            group.add(legL);
            const legR = new THREE.Mesh(legGeo, whiteMat);
            legR.position.set(0.08, 0.15, 0);
            group.add(legR);

            // Sword (rusty)
            const sword = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), new THREE.MeshLambertMaterial({ color: 0x887766 }));
            sword.position.set(0.25, 0.45, 0.1);
            sword.rotation.x = 1.2;
            group.add(sword);

        } else if (enemy.type === 'slime') {
            // === SLIME ===
            // Translucent body
            const slimeMat = new THREE.MeshLambertMaterial({
                color: 0x44dd44,
                transparent: true,
                opacity: 0.7
            });
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), slimeMat);
            body.position.y = 0.25;
            body.scale.set(1, 0.7, 1);
            body.castShadow = true;
            group.add(body);

            // Core visible inside
            const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshLambertMaterial({ color: 0x116611, emissive: 0x11aa11, emissiveIntensity: 0.4 }));
            core.position.y = 0.25;
            group.add(core);

            // Eyes on surface
            const eyeGeo = new THREE.SphereGeometry(0.05, 4, 4);
            const eyeL = new THREE.Mesh(eyeGeo, blackMat);
            eyeL.position.set(-0.12, 0.3, 0.2);
            group.add(eyeL);
            const eyeR = new THREE.Mesh(eyeGeo, blackMat);
            eyeR.position.set(0.12, 0.3, 0.2);
            group.add(eyeR);

            // Pulsing animation helper
            group._originalScale = 1;
            group._pulseSpeed = 2 + Math.random();

        } else if (enemy.type === 'goblin') {
            // === GOBLIN ===
            const greenSkin = new THREE.MeshLambertMaterial({ color: 0x66aa44 });
            const leather = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

            // Head (pointy)
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.24), greenSkin);
            head.position.y = 0.75;
            head.castShadow = true;
            group.add(head);

            // Ears (long)
            const earGeo = new THREE.ConeGeometry(0.04, 0.18, 4);
            const earL = new THREE.Mesh(earGeo, greenSkin);
            earL.position.set(-0.14, 0.78, 0);
            earL.rotation.z = 1.2;
            group.add(earL);
            const earR = new THREE.Mesh(earGeo, greenSkin);
            earR.position.set(0.14, 0.78, 0);
            earR.rotation.z = -1.2;
            group.add(earR);

            // Nose (long)
            const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), greenSkin);
            nose.position.set(0, 0.75, 0.14);
            nose.rotation.x = Math.PI / 2;
            group.add(nose);

            // Body
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.35, 0.2), greenSkin);
            body.position.y = 0.45;
            group.add(body);

            // Loincloth
            const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.22), leather);
            cloth.position.y = 0.3;
            group.add(cloth);

            // Legs (short)
            const legGeo = new THREE.BoxGeometry(0.08, 0.2, 0.1);
            const legL = new THREE.Mesh(legGeo, greenSkin);
            legL.position.set(-0.08, 0.1, 0);
            group.add(legL);
            const legR = new THREE.Mesh(legGeo, greenSkin);
            legR.position.set(0.08, 0.1, 0);
            group.add(legR);

            // Dagger
            const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.04), new THREE.MeshLambertMaterial({ color: 0x999999 }));
            dagger.position.set(0.2, 0.4, 0.15);
            dagger.rotation.x = Math.PI / 2;
            group.add(dagger);

        } else if (enemy.type === 'dark_mage') {
            // === DARK MAGE ===
            const robeColor = new THREE.MeshLambertMaterial({ color: 0x220033 });
            const hoodColor = new THREE.MeshLambertMaterial({ color: 0x1a0026 });

            // Robe Body
            const body = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 8), robeColor);
            body.position.y = 0.35;
            body.castShadow = true;
            group.add(body);

            // Hood
            const hood = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), hoodColor);
            hood.position.y = 0.75;
            group.add(hood);

            // Glowing Eyes inside hood
            const eyeGeo = new THREE.BoxGeometry(0.04, 0.02, 0.02);
            const eyeL = new THREE.Mesh(eyeGeo, redGlow);
            eyeL.position.set(-0.06, 0.76, 0.12);
            group.add(eyeL);
            const eyeR = new THREE.Mesh(eyeGeo, redGlow);
            eyeR.position.set(0.06, 0.76, 0.12);
            group.add(eyeR);

            // Staff
            const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), new THREE.MeshLambertMaterial({ color: 0x442211 }));
            staff.position.set(0.3, 0.4, 0.1);
            group.add(staff);

            // Orb
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08), new THREE.MeshLambertMaterial({ color: 0x8800ff, emissive: 0x4400aa }));
            orb.position.set(0.3, 0.8, 0.1);
            group.add(orb);

        } else if (enemy.isBoss) {
            // === BOSS (FLOOR GUARDIAN) ===
            const bossSkin = new THREE.MeshLambertMaterial({ color: 0xaa2222 });
            const armorMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

            // Large muscular body
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.4), bossSkin);
            body.position.y = 0.7;
            body.castShadow = true;
            group.add(body);

            // Armor plates
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.45), armorMat);
            plate.position.y = 0.8;
            group.add(plate);

            // Head
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), bossSkin);
            head.position.y = 1.3;
            group.add(head);

            // Horns
            const hornGeo = new THREE.ConeGeometry(0.08, 0.35, 8);
            const hornMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
            const hornL = new THREE.Mesh(hornGeo, hornMat);
            hornL.position.set(-0.15, 1.55, 0);
            hornL.rotation.z = 0.3;
            group.add(hornL);
            const hornR = new THREE.Mesh(hornGeo, hornMat);
            hornR.position.set(0.15, 1.55, 0);
            hornR.rotation.z = -0.3;
            group.add(hornR);

            // Glowing Eyes
            const eyeGeo = new THREE.BoxGeometry(0.08, 0.04, 0.02);
            const eyeL = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0xffff00 }));
            eyeL.position.set(-0.1, 1.32, 0.201);
            group.add(eyeL);
            const eyeR = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0xffff00 }));
            eyeR.position.set(0.1, 1.32, 0.201);
            group.add(eyeR);

            // Giant Weapon (Hammer)
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), new THREE.MeshLambertMaterial({ color: 0x553311 }));
            handle.position.set(0.5, 0.8, 0.2);
            handle.rotation.x = 0.5;
            group.add(handle);
            const headBlock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
            headBlock.position.set(0.5, 1.3, 0.45);
            headBlock.rotation.x = 0.5;
            group.add(headBlock);

            // Boss light aura
            const bossLight = new THREE.PointLight(0xff3300, 1, 4);
            bossLight.position.set(0, 1.5, 0);
            group.add(bossLight);
        } else {
            // Fallback generic
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), mat);
            body.position.y = 0.3;
            group.add(body);
        }

        // Start at enemy position immediately
        group.position.set(enemy.x, 0, enemy.y);
        group._flashing = false;

        return group;
    }

    // ============================
    // GROUND ITEMS (Stable tracking by item.id)
    // ============================
    updateGroundItems(groundItems, visibleSet) {
        const activeIds = new Set();

        groundItems.forEach((gi, idx) => {
            activeIds.add(gi.item.id);
            const itx = Math.floor(gi.x);
            const ity = Math.floor(gi.y);
            const visible = visibleSet.has(`${itx},${ity}`);

            let mesh = this.itemMeshes.get(gi.item.id);
            if (!mesh) {
                const mat = gi.item.rarity === RARITY.LEGENDARY ? this.materials.itemLegendary :
                    gi.item.rarity === RARITY.RARE ? this.materials.itemRare :
                        gi.item.rarity === RARITY.MAGIC ? this.materials.itemMagic :
                            this.materials.itemCommon;
                const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
                mesh = new THREE.Mesh(geo, mat);
                mesh.castShadow = true;
                mesh.position.set(gi.x, 0.2, gi.y);
                this.entityGroup.add(mesh);
                this.itemMeshes.set(gi.item.id, mesh);
            }

            // Animate
            mesh.position.y = 0.2 + Math.sin(this.time * 2 + idx * 1.5) * 0.08;
            mesh.rotation.y = this.time + idx;
            mesh.visible = visible;
        });

        // Remove picked-up items
        this.itemMeshes.forEach((mesh, id) => {
            if (!activeIds.has(id)) {
                this.entityGroup.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                this.itemMeshes.delete(id);
            }
        });
    }

    // ============================
    // CAMERA
    // ============================
    updateCamera(playerX, playerY) {
        // Offset Z by -3 to look "North" of player, pushing player "South" (Down) on screen
        this.cameraTarget.set(playerX, 0, playerY - 3);
        const target = this.cameraTarget.clone().add(this.cameraOffset);
        this.camera.position.lerp(target, 0.15); // Smooth camera follow
        this.camera.lookAt(this.cameraTarget);

        if (this.shakeIntensity > 0.001) {
            this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.z += (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= this.shakeDecay;
        }
    }

    // ============================
    // SKILL VISUAL EFFECTS
    // ============================
    showSkillEffect(type, x, y, params) {
        if (!this._skillEffects) this._skillEffects = [];
        const startTime = this.time;

        switch (type) {
            case 'shockwave': {
                // Arc-shaped shockwave (like slash but bigger)
                const { angle, range, arc, color } = params;
                const shape = new THREE.Shape();
                shape.moveTo(0, 0);
                for (let i = 0; i <= 16; i++) {
                    const a = -arc / 2 + (arc / 16) * i;
                    shape.lineTo(Math.sin(a) * range, Math.cos(a) * range);
                }
                shape.lineTo(0, 0);
                const geo = new THREE.ShapeGeometry(shape);
                const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = -Math.PI / 2;
                mesh.rotation.z = angle + Math.PI;
                mesh.position.set(x, 0.2, y);
                this.entityGroup.add(mesh);
                mesh._effectUpdate = () => {
                    const t = this.time - startTime;
                    if (t > 0.4) { this.entityGroup.remove(mesh); geo.dispose(); mat.dispose(); return true; }
                    mat.opacity = 0.6 * (1 - t / 0.4);
                    mesh.scale.set(1 + t * 2, 1 + t * 2, 1);
                    return false;
                };
                this._skillEffects.push(mesh);
                break;
            }
            case 'explosion': {
                const { radius, color } = params;
                const geo = new THREE.SphereGeometry(radius * 0.3, 16, 16);
                const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(x, 0.6, y);
                this.entityGroup.add(mesh);
                mesh._effectUpdate = () => {
                    const t = this.time - startTime;
                    if (t > 0.5) { this.entityGroup.remove(mesh); geo.dispose(); mat.dispose(); return true; }
                    const s = 1 + t * 5;
                    mesh.scale.set(s, s * 0.5, s);
                    mat.opacity = 0.7 * (1 - t / 0.5);
                    return false;
                };
                this._skillEffects.push(mesh);
                break;
            }
            case 'aura': {
                const { color, radius } = params;
                const geo = new THREE.RingGeometry(radius * 0.5, radius, 32);
                const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.set(x, 0.1, y);
                this.entityGroup.add(mesh);
                mesh._effectUpdate = () => {
                    const t = this.time - startTime;
                    if (t > 0.8) { this.entityGroup.remove(mesh); geo.dispose(); mat.dispose(); return true; }
                    mesh.position.y = 0.1 + t * 0.5;
                    mat.opacity = 0.5 * (1 - t / 0.8);
                    const s = 1 + t * 0.5;
                    mesh.scale.set(s, s, 1);
                    return false;
                };
                this._skillEffects.push(mesh);
                break;
            }
            case 'frost_ring': {
                const { radius, color } = params;
                const geo = new THREE.RingGeometry(0.2, radius, 32);
                const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.set(x, 0.05, y);
                this.entityGroup.add(mesh);
                mesh._effectUpdate = () => {
                    const t = this.time - startTime;
                    if (t > 1.0) { this.entityGroup.remove(mesh); geo.dispose(); mat.dispose(); return true; }
                    mat.opacity = 0.5 * (1 - t / 1.0);
                    return false;
                };
                this._skillEffects.push(mesh);
                break;
            }
            case 'dash_trail': {
                const { fromX, fromY, toX, toY, color } = params;
                const points = [
                    new THREE.Vector3(fromX, 0.3, fromY),
                    new THREE.Vector3(toX, 0.3, toY)
                ];
                const geo = new THREE.BufferGeometry().setFromPoints(points);
                const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8, linewidth: 2 });
                const line = new THREE.Line(geo, mat);
                this.entityGroup.add(line);
                line._effectUpdate = () => {
                    const t = this.time - startTime;
                    if (t > 0.4) { this.entityGroup.remove(line); geo.dispose(); mat.dispose(); return true; }
                    mat.opacity = 0.8 * (1 - t / 0.4);
                    return false;
                };
                this._skillEffects.push(line);
                break;
            }
        }
    }

    // ============================
    // FLOATING HEALTH BARS
    // ============================
    renderHealthBars(player, enemies, visibleSet) {
        const ctx = this.overlayCtx;
        const barW = 40;
        const barH = 4;
        const mpBarH = 3;

        // Player HP + MP bars
        {
            const worldPos = new THREE.Vector3(player.x, 2.0, player.y);
            worldPos.project(this.camera);
            const sx = (worldPos.x * 0.5 + 0.5) * this.overlayCanvas.width;
            const sy = (-worldPos.y * 0.5 + 0.5) * this.overlayCanvas.height;

            const hpPct = Math.max(0, player.hp / player.stats.maxHp);
            const mpPct = Math.max(0, player.mp / player.stats.maxMp);

            // HP bar
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(sx - barW / 2, sy, barW, barH);
            ctx.fillStyle = hpPct > 0.3 ? '#44ff44' : '#ff4444';
            ctx.fillRect(sx - barW / 2, sy, barW * hpPct, barH);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(sx - barW / 2, sy, barW, barH);

            // MP bar
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(sx - barW / 2, sy + barH + 1, barW, mpBarH);
            ctx.fillStyle = '#4488ff';
            ctx.fillRect(sx - barW / 2, sy + barH + 1, barW * mpPct, mpBarH);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.strokeRect(sx - barW / 2, sy + barH + 1, barW, mpBarH);

            // Shield indicator
            if (player.shieldHp > 0) {
                ctx.fillStyle = '#44ccff';
                ctx.font = '8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`🛡${player.shieldHp}`, sx, sy - 2);
            }
        }

        // Enemy HP bars (only when damaged)
        enemies.forEach(enemy => {
            if (enemy.isDead()) return;
            if (enemy.hp >= enemy.maxHp) return; // only show when damaged
            const key = `${Math.floor(enemy.x)},${Math.floor(enemy.y)}`;
            if (!visibleSet.has(key)) return;

            const worldPos = new THREE.Vector3(enemy.x, 1.8, enemy.y);
            worldPos.project(this.camera);
            const sx = (worldPos.x * 0.5 + 0.5) * this.overlayCanvas.width;
            const sy = (-worldPos.y * 0.5 + 0.5) * this.overlayCanvas.height;

            const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
            const eBarW = enemy.isBoss ? 50 : 32;
            const eBarH = enemy.isBoss ? 5 : 3;

            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(sx - eBarW / 2, sy, eBarW, eBarH);
            ctx.fillStyle = enemy.isBoss ? '#ff3333' : '#ff6644';
            ctx.fillRect(sx - eBarW / 2, sy, eBarW * hpPct, eBarH);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(sx - eBarW / 2, sy, eBarW, eBarH);
        });
    }

    // ============================
    // 2D OVERLAYS — Floating Text + Minimap
    // ============================
    renderFloatingTexts(floatingTexts) {
        const ctx = this.overlayCtx;
        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        floatingTexts.forEach(ft => {
            const worldPos = new THREE.Vector3(ft.x, 1.5 - ft.life * 0.8, ft.y);
            worldPos.project(this.camera);

            const sx = (worldPos.x * 0.5 + 0.5) * this.overlayCanvas.width;
            const sy = (-worldPos.y * 0.5 + 0.5) * this.overlayCanvas.height;

            ctx.globalAlpha = ft.life;
            ctx.fillStyle = ft.color;
            ctx.font = ft.large ? 'bold 20px "Press Start 2P", monospace' : '14px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 3;
            ctx.strokeText(ft.text, sx, sy);
            ctx.fillText(ft.text, sx, sy);
            ctx.globalAlpha = 1;
        });
    }

    renderMinimap(dungeon, player, enemies, visibleSet) {
        const ctx = this.overlayCtx;
        const scale = 3;
        const mx = 15; // Left side
        const my = 15;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.strokeStyle = 'rgba(100, 100, 130, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(mx - 5, my - 5, dungeon.width * scale + 10, dungeon.height * scale + 10, 6);
        ctx.fill();
        ctx.stroke();

        for (let y = 0; y < dungeon.height; y++) {
            for (let x = 0; x < dungeon.width; x++) {
                if (!dungeon.explored[y][x]) continue;
                const tile = dungeon.map[y][x];
                ctx.fillStyle = tile === CONFIG.TILE.WALL ? '#333' :
                    tile === CONFIG.TILE.STAIRS_DOWN ? '#FFD700' : '#1a1425';
                ctx.fillRect(mx + x * scale, my + y * scale, scale, scale);
            }
        }

        enemies.forEach(e => {
            if (!e.isDead() && visibleSet.has(`${Math.floor(e.x)},${Math.floor(e.y)}`)) {
                ctx.fillStyle = e.isBoss ? '#ff4444' : '#ff8844';
                ctx.fillRect(mx + Math.floor(e.x) * scale, my + Math.floor(e.y) * scale, scale, scale);
            }
        });

        ctx.fillStyle = '#FFD700';
        ctx.fillRect(mx + Math.floor(player.x) * scale - 1, my + Math.floor(player.y) * scale - 1, scale + 1, scale + 1);
    }

    // ============================
    // RENDER FRAME
    // ============================
    render(dungeon, player, enemies, groundItems, visibleSet, combat) {
        this.time += 0.016;

        // Build dungeon only once per floor
        if (this.builtFloor !== dungeon.floor) {
            this.buildDungeon(dungeon);
            this.buildPlayer(player);
            // Clear enemy meshes for new floor
            this.enemyMeshes.forEach(m => this.entityGroup.remove(m));
            this.enemyMeshes.clear();
            // Clear item meshes for new floor
            this.itemMeshes.forEach(m => {
                this.entityGroup.remove(m);
                if (m.geometry) m.geometry.dispose();
            });
            this.itemMeshes.clear();
        }

        // Update slash effects
        if (this._slashEffects) {
            this._slashEffects = this._slashEffects.filter(mesh => {
                if (mesh._slashUpdate) return !mesh._slashUpdate();
                return false;
            });
        }

        // Update skill effects
        if (this._skillEffects) {
            this._skillEffects = this._skillEffects.filter(obj => {
                if (obj._effectUpdate) return !obj._effectUpdate();
                return false;
            });
        }

        // Update entities
        this.updateFog(dungeon, visibleSet);
        this.updatePlayer(player);
        this.updateEnemies(enemies, visibleSet);
        this.updateGroundItems(groundItems, visibleSet);
        this.updateCamera(player.x, player.y);

        // Stairs animation
        if (this.stairsMesh) {
            this.stairsMesh.rotation.y = this.time;
        }

        // Render 3D
        this.renderer3d.render(this.scene, this.camera);

        // Render 2D overlays
        this.renderFloatingTexts(combat.floatingTexts);
        this.renderHealthBars(player, enemies, visibleSet);
        this.renderMinimap(dungeon, player, enemies, visibleSet);
    }

    clear() {
        // Handled by Three.js autoClear
    }
}
