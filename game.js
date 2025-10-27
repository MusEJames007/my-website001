(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl  = document.getElementById('best');
  const restartBtn = document.getElementById('restart');

  // Game state
  let w = canvas.width, h = canvas.height;
  let running = false, gameOver = false, lastTime = 0, accumulator = 0;
  let score = 0, best = Number(localStorage.getItem('tiffany_best') || 0);

  // Player
  const player = { x: w/2-15, y: h-60, s: 22, speed: 300, color: '#1f2937', vx:0, vy:0 };

  // Enemies (falling blocks)
  const enemies = [];
  let spawnTimer = 0;
  const SPAWN_INTERVAL_START = 900; // ms
  let spawnInterval = SPAWN_INTERVAL_START;

  // Input
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)) {
      e.preventDefault();
      keys.add(e.key.toLowerCase());
    }
    if (e.key.toLowerCase() === 'r') resetGame();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  restartBtn.addEventListener('click', resetGame);

  // Resize handler (keep internal resolution fixed, CSS scales)
  window.addEventListener('resize', () => { /* canvas drawn in fixed px; CSS responsive */ });

  function resetGame() {
    score = 0;
    spawnInterval = SPAWN_INTERVAL_START;
    enemies.length = 0;
    player.x = w/2 - player.s/2;
    player.y = h - 60;
    gameOver = false;
    running = true;
    lastTime = performance.now();
    drawSplash('Get ready...');
  }

  function spawnEnemy() {
    // Random x, width, speed
    const width = rand(18, 46);
    enemies.push({
      x: rand(0, w - width),
      y: -width,
      w: width,
      h: width,
      vy: rand(120, 260),
      color: '#81D8D0'
    });
  }

  function update(dt) {
    if (!running) return;

    // Difficulty ramps: spawn faster over time
    spawnTimer += dt * 1000;
    if (spawnTimer > spawnInterval) {
      spawnTimer = 0;
      spawnEnemy();
      spawnInterval = Math.max(280, spawnInterval - 8); // cap difficulty
    }

    // Movement
    const sp = player.speed * dt;
    if (keys.has('arrowleft') || keys.has('a'))  player.x -= sp;
    if (keys.has('arrowright')|| keys.has('d'))  player.x += sp;
    if (keys.has('arrowup')   || keys.has('w'))  player.y -= sp;
    if (keys.has('arrowdown') || keys.has('s'))  player.y += sp;

    // Clamp to bounds
    player.x = Math.max(0, Math.min(w - player.s, player.x));
    player.y = Math.max(0, Math.min(h - player.s, player.y));

    // Enemies fall
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.y += e.vy * dt;
      // remove off-screen
      if (e.y > h + 60) enemies.splice(i, 1);
      // collision
      if (rectIntersect(player.x, player.y, player.s, player.s, e.x, e.y, e.w, e.h)) {
        endGame();
        return;
      }
    }

    // Score by survival time
    score += dt * 60; // ~fps-based score
    scoreEl.textContent = Math.floor(score).toString();
  }

  function draw() {
    // background
    ctx.clearRect(0,0,w,h);
    // grid tint
    drawBackdrop();

    // player
    ctx.fillStyle = player.color;
    roundRect(ctx, player.x, player.y, player.s, player.s, 5, true);

    // enemies
    for (const e of enemies) {
      ctx.fillStyle = e.color;
      roundRect(ctx, e.x, e.y, e.w, e.h, 6, true);
      // slight border
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.strokeRect(e.x, e.y, e.w, e.h);
    }

    if (gameOver) {
      drawOverlay('Game Over', 'Press R or click Restart');
    }
  }

  function loop(t) {
    const dt = Math.min(0.033, (t - lastTime) / 1000); // clamp delta
    lastTime = t;
    if (running) update(dt);
    draw();
    requestAnimationFrame(loop);
