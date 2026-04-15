const grid = document.getElementById("grid");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const comboEl = document.getElementById("comboCounter");
const highScoreEl = document.getElementById("highScore");
const overlay = document.getElementById("gameOverlay");
const overlayStats = document.getElementById("overlayStats");
const overlayTitle = document.getElementById("overlayTitle");

let cells = [];
let score = 0;
let lives = 3;
let combo = 0;
let gameRunning = false;
let gameTimeout;
let moleImg = "img/calahorra.PNG"; // Default image

let difficulty = { startSpeed: 1500, accel: 4, minSpeed: 500, infiltratorChance: 0.20 };

const bgMusic = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.2;

const feedbackWords = ["NICE!", "GREAT!", "AWESOME!", "KILLER!", "INSANE!", "UNSTOPPABLE!", "GODLIKE!"];

let highScore = localStorage.getItem("whackHigh") || 0;
highScoreEl.innerText = highScore;

document.getElementById("upload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        moleImg = URL.createObjectURL(file);
        // Update images if cells already exist
        document.querySelectorAll('.cell img').forEach(img => img.src = moleImg);
    }
});

function createGrid(size) {
    grid.innerHTML = "";
    cells = [];
    // Synchronized with CSS: 110px + gap
    grid.style.gridTemplateColumns = `repeat(${size}, 110px)`;

    for (let i = 0; i < size * size; i++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        const img = document.createElement("img");
        img.src = moleImg;
        cell.appendChild(img);
        cell.addEventListener("mousedown", (e) => handleClick(i, e));
        grid.appendChild(cell);
        cells.push(cell);
    }
}

function setDifficulty(level) {
    if (level === 'easy') {
        difficulty = { startSpeed: 2000, accel: 2, minSpeed: 800, infiltratorChance: 0 };
    } else if (level === 'medium') {
        difficulty = { startSpeed: 1500, accel: 5, minSpeed: 450, infiltratorChance: 0.20 };
    } else if (level === 'hard') {
        difficulty = {
            startSpeed: 800,         // Much faster initial spawn
            accel: 15,               // Score increases speed much faster
            minSpeed: 180,           // Extremely fast floor (borderline human limit)
            infiltratorChance: 0.70  // 70% chance to spawn 2 moles at once
        };
    }
}
function startGame(level = 'medium') {
    setDifficulty(level);
    score = 0;
    lives = 3;
    combo = 0;
    gameRunning = true;

    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});

    updateUI();
    overlay.style.display = "none";
    createGrid(3);
    spawnMole();
}

function spawnMole() {
    if (!gameRunning) return;
    clearTimeout(gameTimeout);

    cells.forEach(c => c.classList.remove("active", "bomb", "bonus"));

    const spawnCount = Math.random() < difficulty.infiltratorChance ? 2 : 1;
    let chosenIndices = new Set();
    while(chosenIndices.size < Math.min(spawnCount, cells.length)) {
        chosenIndices.add(Math.floor(Math.random() * cells.length));
    }

    chosenIndices.forEach(index => {
        const cell = cells[index];
        const rand = Math.random();
        let type = "normal";
        if (rand < 0.15) type = "bomb";
        else if (rand < 0.25) type = "bonus";

        cell.classList.add("active");
        if (type !== "normal") cell.classList.add(type);
    });

    const currentSpeed = Math.max(difficulty.minSpeed, difficulty.startSpeed - (score * difficulty.accel));

    gameTimeout = setTimeout(() => {
        const missedMole = cells.some(c => c.classList.contains("active") && !c.classList.contains("bomb"));
        if (missedMole) loseLife();
        if (gameRunning) spawnMole();
    }, currentSpeed);
}

function handleClick(index, e) {
    if (!gameRunning) return;
    const cell = cells[index];

    if (cell.classList.contains("active")) {
        const isBomb = cell.classList.contains("bomb");
        const isBonus = cell.classList.contains("bonus");
        cell.classList.remove("active", "bomb", "bonus");

        if (isBomb) {
            loseLife();
            showFloatingText("BOOM!", e.clientX, e.clientY, "#ff3e3e");
        } else {
            combo++;
            let points = isBonus ? 5 : 1;
            score += points * (Math.floor(combo / 5) + 1);
            triggerJuice(e);
            playSound(300 + (combo * 20));
        }
        cell.classList.add("hit");
        setTimeout(() => cell.classList.remove("hit"), 200);

        const anyLeft = cells.some(c => c.classList.contains("active"));
        if (!anyLeft && gameRunning) spawnMole();
    } else {
        loseLife();
        showFloatingText("MISS!", e.clientX, e.clientY, "#ccc");
    }
    updateUI();
}

function triggerJuice(e) {
    grid.classList.add("shake-it");
    setTimeout(() => grid.classList.remove("shake-it"), 200);
    let word = feedbackWords[Math.min(Math.floor(combo / 3), feedbackWords.length - 1)];
    showFloatingText(`${word} x${combo}`, e.clientX, e.clientY, "#ffeb3b");
}

function showFloatingText(text, x, y, color) {
    const el = document.createElement("div");
    el.className = "floating-text";
    el.innerText = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 700);
}

function loseLife() {
    if (!gameRunning) return;
    lives--;
    combo = 0;
    updateUI();
    playSound(100);
    if (lives <= 0) endGame();
}

function updateUI() {
    scoreEl.innerText = score;
    livesEl.innerText = lives;
    comboEl.innerText = combo;
}

function endGame() {
    gameRunning = false;
    clearTimeout(gameTimeout);
    bgMusic.pause();

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("whackHigh", score);
        highScoreEl.innerText = score;
    }
    overlayTitle.innerText = "GAME OVER";
    overlayStats.innerHTML = `Final Score: ${score}<br>Max Combo: ${combo}`;
    overlay.style.display = "flex";
}

function playSound(freq) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
}

createGrid(3);
