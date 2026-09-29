const screens = {
  login: document.getElementById('screen-login'),
  loading: document.getElementById('screen-loading'),
  lobby: document.getElementById('screen-lobby'),
  settings: document.getElementById('screen-settings'),
  match: document.getElementById('screen-match'),
  result: document.getElementById('screen-result')
};

const loadingFill = document.getElementById('loadingFill');
const loadingText = document.getElementById('loadingText');
const profileName = document.getElementById('profileName');
const playerNameInput = document.getElementById('playerNameInput');
const resultTitle = document.getElementById('resultTitle');
const resultText = document.getElementById('resultText');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let currentScreen = 'login';
let playerName = 'Player01';
let matchActive = false;

const state = {
  phase: 'preparing',
  timer: 60,
  player: {
    x: 300,
    y: 430,
    radius: 14,
    speed: 3,
    hp: 100,
    ammo: 30,
    weapon: 'M4',
    alive: true
  },
  plane: {
    x: -180,
    y: 120,
    width: 180,
    height: 60,
    speed: 2.2
  },
  bullets: [],
  bots: [],
  loot: [],
  keys: {},
  matchResult: 'You are in the drop zone.'
};

function showScreen(name) {
  Object.keys(screens).forEach((key) => {
    screens[key].classList.toggle('active', key === name);
  });
  currentScreen = name;
}

function setPlayerName() {
  const text = playerNameInput.value.trim();
  playerName = text || 'Player01';
  profileName.textContent = playerName;
}

function animateLoading() {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    loadingFill.style.width = `${progress}%`;

    const messages = [
      'Initializing game...',
      'Loading lobby...',
      'Loading assets...',
      'Preparing map...',
      'Ready!'
    ];

    loadingText.textContent = messages[Math.min(Math.floor(progress / 25), messages.length - 1)];

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        showScreen('lobby');
      }, 300);
    }
  }, 180);
}

function setMatchStats() {
  document.getElementById('hpStat').textContent = state.player.hp;
  document.getElementById('ammoStat').textContent = state.player.ammo;
  document.getElementById('weaponStat').textContent = state.player.weapon;
}

function spawnBots() {
  state.bots = [];
  for (let i = 0; i < 12; i++) {
    state.bots.push({
      x: 100 + Math.random() * 780,
      y: 120 + Math.random() * 300,
      radius: 12,
      speed: 1 + Math.random() * 1.2,
      hp: 80,
      alive: true,
      color: i % 2 === 0 ? '#ef4444' : '#f59e0b'
    });
  }
}

function spawnLoot() {
  state.loot = [];
  const lootTypes = ['medkit', 'ammo', 'gun'];
  for (let i = 0; i < 14; i++) {
    state.loot.push({
      x: 80 + Math.random() * 820,
      y: 110 + Math.random() * 330,
      radius: 9,
      type: lootTypes[Math.floor(Math.random() * lootTypes.length)],
      collected: false
    });
  }
}

function resetGameState() {
  state.phase = 'preparing';
  state.timer = 60;
  state.player.x = 300;
  state.player.y = 430;
  state.player.hp = 100;
  state.player.ammo = 30;
  state.player.weapon = 'M4';
  state.player.alive = true;
  state.bullets = [];
  state.plane.x = -180;
  state.plane.y = 120;
  state.plane.speed = 2.2;
  setMatchStats();
  spawnBots();
  spawnLoot();
  document.getElementById('timerText').textContent = '60';
  document.getElementById('phaseText').textContent = 'Preparing';
  document.getElementById('ejectBtn').classList.add('hidden');
}

function startMatch() {
  resetGameState();
  showScreen('match');
  matchActive = true;
}

function endMatch(text, title = 'MATCH COMPLETE') {
  matchActive = false;
  resultTitle.textContent = title;
  resultText.textContent = text;
  showScreen('result');
}

function updateMatch(delta) {
  if (!matchActive) return;

  const player = state.player;

  if (state.phase === 'preparing') {
    state.timer -= delta * 0.06;
    document.getElementById('timerText').textContent = Math.max(0, Math.ceil(state.timer));
    document.getElementById('phaseText').textContent = 'Preparing';

    if (state.timer <= 0) {
      state.phase = 'plane';
      state.timer = 0;
      document.getElementById('phaseText').textContent = 'Drop';
      document.getElementById('ejectBtn').classList.remove('hidden');
    }
    return;
  }

  if (state.phase === 'plane') {
    state.plane.x += state.plane.speed * 60 * delta;
    if (state.plane.x > 950) {
      state.plane.x = -180;
    }
    document.getElementById('phaseText').textContent = 'Plane Inbound';

    if (state.player.y < 500) {
      player.y += 0.6;
    }

    if (state.keys.ArrowLeft || state.keys.a) player.x -= player.speed;
    if (state.keys.ArrowRight || state.keys.d) player.x += player.speed;
    if (state.keys.ArrowUp || state.keys.w) player.y -= player.speed;
    if (state.keys.ArrowDown || state.keys.s) player.y += player.speed;

    player.x = clamp(player.x, 20, canvas.width - 20);
    player.y = clamp(player.y, 20, canvas.height - 20);

    if (player.hp <= 0) {
      endMatch('You were eliminated.');
    }
    return;
  }

  if (state.phase === 'battle') {
    document.getElementById('phaseText').textContent = 'Battle';

    if (state.keys.ArrowLeft || state.keys.a) player.x -= player.speed;
    if (state.keys.ArrowRight || state.keys.d) player.x += player.speed;
    if (state.keys.ArrowUp || state.keys.w) player.y -= player.speed;
    if (state.keys.ArrowDown || state.keys.s) player.y += player.speed;

    player.x = clamp(player.x, 20, canvas.width - 20);
    player.y = clamp(player.y, 20, canvas.height - 20);

    for (const bot of state.bots) {
      if (!bot.alive) continue;
      const dx = player.x - bot.x;
      const dy = player.y - bot.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 180) {
        bot.x += (dx / dist) * bot.speed;
        bot.y += (dy / dist) * bot.speed;
      }
    }

    for (const bullet of state.bullets) {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      for (const bot of state.bots) {
        if (!bot.alive) continue;
        const dist = Math.hypot(bullet.x - bot.x, bullet.y - bot.y);
        if (dist < bullet.radius + bot.radius) {
          bot.hp -= 20;
          bullet.hit = true;
          if (bot.hp <= 0) {
            bot.alive = false;
          }
        }
      }
    }

    state.bullets = state.bullets.filter(
      (b) => !b.hit && b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height
    );

    for (const loot of state.loot) {
      if (loot.collected) continue;
      const dist = Math.hypot(player.x - loot.x, player.y - loot.y);
      if (dist < 18) {
        if (loot.type === 'medkit') player.hp = Math.min(100, player.hp + 30);
        if (loot.type === 'ammo') player.ammo += 12;
        if (loot.type === 'gun') player.weapon = 'AKM';
        loot.collected = true;
      }
    }

    state.loot = state.loot.filter((l) => !l.collected);

    if (state.bots.every((bot) => !bot.alive)) {
      endMatch('Winner Winner! You cleared the island.', 'VICTORY');
    }
  }

  setMatchStats();
}

function shoot() {
  if (!matchActive) return;
  if (state.phase !== 'battle') return;

  if (state.player.ammo <= 0) {
    state.player.ammo = 0;
    return;
  }

  state.player.ammo -= 1;
  state.bullets.push({
    x: state.player.x + 14,
    y: state.player.y,
    vx: 7,
    vy: 0,
    radius: 3,
    hit: false
  });
  setMatchStats();
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#0a2640');
  skyGrad.addColorStop(0.6, '#183d51');
  skyGrad.addColorStop(1, '#2a7d4d');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#2c7d42';
  ctx.fillRect(0, 470, canvas.width, 120);

  ctx.beginPath();
  ctx.moveTo(60, 500);
  ctx.lineTo(200, 420);
  ctx.lineTo(420, 440);
  ctx.lineTo(670, 430);
  ctx.lineTo(900, 500);
  ctx.lineTo(980, 530);
  ctx.lineTo(0, 530);
  ctx.closePath();
  ctx.fillStyle = '#3d8d4d';
  ctx.fill();

  ctx.fillStyle = 'rgba(22, 94, 160, 0.6)';
  ctx.fillRect(0, 500, canvas.width, 60);

  state.loot.forEach((item) => {
    ctx.fillStyle = item.type === 'medkit' ? '#22c55e' : item.type === 'ammo' ? '#f59e0b' : '#60a5fa';
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  if (state.phase === 'plane' || state.phase === 'battle') {
    ctx.fillStyle = '#dfe7ef';
    ctx.fillRect(state.plane.x, state.plane.y, state.plane.width, state.plane.height);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(state.plane.x + 40, state.plane.y + 25, 40, 10);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(state.plane.x + 125, state.plane.y + 18, 30, 8);
  }
}

function drawPlayer() {
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(state.player.x - 18, state.player.y - 28, 36, 8);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(state.player.x - 18, state.player.y - 28, 36 * (state.player.hp / 100), 8);
}

function drawBots() {
  state.bots.forEach((bot) => {
    if (!bot.alive) return;
    ctx.fillStyle = bot.color;
    ctx.beginPath();
    ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBullets() {
  state.bullets.forEach((bullet) => {
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPhaseText() {
  if (state.phase === 'preparing') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Match starts in ${Math.ceil(state.timer)}s`, 350, 120);
  }
}

function render() {
  drawBackground();
  drawBots();
  drawBullets();
  drawPlayer();
  drawPhaseText();
}

let lastTime = 0;
function gameLoop(timestamp) {
  const delta = (timestamp - lastTime) / 16.67 || 1;
  lastTime = timestamp;

  if (matchActive) {
    updateMatch(delta);
  }

  render();
  requestAnimationFrame(gameLoop);
}

document.getElementById('guestBtn').addEventListener('click', () => {
  setPlayerName();
  showScreen('loading');
  animateLoading();
});

document.getElementById('startBtn').addEventListener('click', () => {
  startMatch();
});

document.getElementById('settingsBtn').addEventListener('click', () => {
  showScreen('settings');
});

document.getElementById('vaultBtn').addEventListener('click', () => {
  alert('Vault: M4, Medkit, Armor, Car unlocks');
});

document.getElementById('profileBtn').addEventListener('click', () => {
  alert('Profile: Rank Rookie, Kills 0, Wins 0');
});

document.getElementById('backToLobbyBtn').addEventListener('click', () => {
  showScreen('lobby');
});

document.getElementById('playAgainBtn').addEventListener('click', () => {
  showScreen('lobby');
});

document.getElementById('ejectBtn').addEventListener('click', () => {
  if (state.phase === 'plane') {
    state.phase = 'battle';
    state.player.x = 500;
    state.player.y = 120;
    state.player.alive = true;
    document.getElementById('ejectBtn').classList.add('hidden');
  }
});

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's', ' '].includes(e.key)) {
    e.preventDefault();
  }
  state.keys[e.key] = true;

  if (e.key === ' ') {
    shoot();
  }
});

window.addEventListener('keyup', (e) => {
  state.keys[e.key] = false;
});

resetGameState();
render();
requestAnimationFrame(gameLoop);
