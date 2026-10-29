(function () {
  const canvas = document.getElementById('particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  let rings = [];
  let pops = [];
  let sparks = [];
  let animationId;

  let lastTime = 0;
  let vTime = 0;        // relogio virtual (desacelera junto com o slow motion)
  let timeScale = 1;    // 1 = normal, perto de 0 = camera lenta
  let slowUntil = 0;

  const mouse = { x: -9999, y: -9999, active: false };

  const CONFIG = {
    count: 45,
    minSize: 0.8,
    maxSize: 2.5,
    minSpeed: 0.02,
    maxSpeed: 0.08,
    colors: [
      { r: 160, g: 160, b: 168 },
      { r: 120, g: 120, b: 126 },
      { r: 139, g: 32, b: 32 },
    ],
    colorWeights: [0.5, 0.35, 0.15],
    minOpacity: 0.06,
    maxOpacity: 0.3,
    drift: 0.2,
    twinkleSpeed: 0.006,
    bassThreshold: 130,
    bassBoostSpeed: 1.5,
    bassSizeMultiplier: 2.5,
    bassSpread: 2,

    // densidade (area / densityDivisor, limitada entre min e max)
    densityDivisor: 10000,
    minCount: 45,
    maxCount: 150,

    // mouse: zona de repulsao (em tempo real, nao depende da velocidade nem do slow motion)
    repelRadius: 120,       // alcance em cima e nos lados (px)
    repelRadiusDown: 150,   // alcance para baixo (px)
    repelSpring: 0.28,      // quao rapido a particula e empurrada para fora da zona (0 a 1 por frame)
    repelFling: 0.3,        // empurrao extra para fora, para elas "fugirem" em vez de colar na borda
    repelBrake: 0.7,        // quanto da velocidade em direcao ao mouse e cancelada (0 a 1)
    repelSlide: 0.9,        // empurrao lateral para contornar o mouse (px por frame, so quem vem de baixo)
    nearBrightness: 0.35,   // brilho extra perto do mouse
    nearGrow: 1.2,          // crescimento extra perto do mouse (px)

    // clique: particulas proximas estouram
    popRadius: 190,         // raio do clique em px
    popStagger: 200,        // ms de atraso maximo por distancia (onda). 0 = todas ao mesmo tempo
    popRespawnMin: 6000,    // ms ate voltar (minimo)
    popRespawnMax: 10000,   // ms ate voltar (maximo)
    ringDuration: 600,      // ms da onda grande do clique

    // efeito POP de cada particula
    popFlashSize: 2.2,      // tamanho do flash central (multiplo do tamanho da particula)
    popRingRadius: 30,      // quanto o anel do pop se expande (px)
    popRingMs: 340,         // duracao do anel e do flash (ms)
    popSparks: 7,           // faiscas por particula
    popSparkSpeed: 3.2,     // velocidade das faiscas
    popSparkMs: 420,        // duracao das faiscas (ms)

    // clique: slow motion em todas as particulas
    slowScale: 0.08,        // velocidade durante o slow (0.08 = 8% do normal)
    slowHold: 4000,         // ms segurando o slow
    slowEnter: 0.3,         // quao rapido entra no slow (0 a 1)
    slowExit: 0.015,        // quao devagar volta ao normal (menor = volta mais devagar)

    debug: false,           // true = desenha a zona de repulsao do mouse
  };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    const area = width * height;
    CONFIG.count = Math.max(
      CONFIG.minCount,
      Math.min(CONFIG.maxCount, Math.floor(area / CONFIG.densityDivisor))
    );
  }

  function randomBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  function pickColor() {
    var r = Math.random();
    var cumulative = 0;
    for (var i = 0; i < CONFIG.colorWeights.length; i++) {
      cumulative += CONFIG.colorWeights[i];
      if (r <= cumulative) return CONFIG.colors[i];
    }
    return CONFIG.colors[0];
  }

  function createParticle() {
    var color = pickColor();
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: randomBetween(CONFIG.minSize, CONFIG.maxSize),
      baseSize: 0,
      speedY: -randomBetween(CONFIG.minSpeed, CONFIG.maxSpeed),
      baseSpeedY: 0,
      drift: randomBetween(-CONFIG.drift, CONFIG.drift),
      opacity: randomBetween(CONFIG.minOpacity, CONFIG.maxOpacity),
      baseOpacity: 0,
      twinkleOffset: Math.random() * Math.PI * 2,
      twinkleSpeed: randomBetween(CONFIG.twinkleSpeed * 0.5, CONFIG.twinkleSpeed * 1.5),
      color: color,
      impulseX: 0,
      impulseY: 0,
      currentSize: 0,
      fade: 1,
      near: 0,
      dead: false,
      popAt: 0,
      respawnAt: 0,
    };
  }

  function finalizeParticle(p) {
    p.baseSize = p.size;
    p.baseSpeedY = p.speedY;
    p.baseOpacity = p.opacity;
    p.currentSize = p.size;
    return p;
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < CONFIG.count; i++) {
      particles.push(finalizeParticle(createParticle()));
    }
  }

  // cria o efeito POP na posicao da particula
  function spawnPop(p, now) {
    var c = (p.color.r > 130 && p.color.g < 60)
      ? { r: 224, g: 70, b: 70 }
      : { r: 225, g: 225, b: 235 };
    var size = Math.max(p.currentSize, 1.5);

    pops.push({ x: p.x, y: p.y, born: now, c: c, size: size });

    var offset = Math.random() * Math.PI * 2;
    for (var i = 0; i < CONFIG.popSparks; i++) {
      var angle = offset + (i / CONFIG.popSparks) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
      var speed = CONFIG.popSparkSpeed * (0.5 + Math.random() * 0.7);
      sparks.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        born: now,
        life: CONFIG.popSparkMs * (0.7 + Math.random() * 0.5),
        size: 0.8 + Math.random() * 1.2,
        c: c,
      });
    }

    if (pops.length > 300) pops.splice(0, pops.length - 300);
    if (sparks.length > 1500) sparks.splice(0, sparks.length - 1500);
  }

  function drawPops(time, dt) {
    for (var i = pops.length - 1; i >= 0; i--) {
      var pop = pops[i];
      var t = (time - pop.born) / CONFIG.popRingMs;
      if (t >= 1) {
        pops.splice(i, 1);
        continue;
      }
      var c = pop.c;

      // anel que se expande
      var ease = 1 - Math.pow(1 - t, 3);
      var ringR = pop.size + CONFIG.popRingRadius * ease;
      ctx.beginPath();
      ctx.arc(pop.x, pop.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (0.8 * (1 - t)).toFixed(3) + ')';
      ctx.lineWidth = 0.6 + 1.8 * (1 - t);
      ctx.stroke();

      // flash central (so no comeco)
      var ft = Math.min(t / 0.4, 1);
      if (ft < 1) {
        var flashR = pop.size * (1 + ft * CONFIG.popFlashSize);
        ctx.beginPath();
        ctx.arc(pop.x, pop.y, flashR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (0.95 * (1 - ft)).toFixed(3) + ')';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pop.x, pop.y, flashR * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (0.18 * (1 - ft)).toFixed(3) + ')';
        ctx.fill();
      }
    }

    var k = dt / 16.7;
    var friction = Math.pow(0.9, k);
    for (var j = sparks.length - 1; j >= 0; j--) {
      var s = sparks[j];
      var st = (time - s.born) / s.life;
      if (st >= 1) {
        sparks.splice(j, 1);
        continue;
      }
      s.x += s.vx * k;
      s.y += s.vy * k;
      s.vx *= friction;
      s.vy *= friction;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * (1 - st * 0.6), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + s.c.r + ',' + s.c.g + ',' + s.c.b + ',' + (0.85 * (1 - st)).toFixed(3) + ')';
      ctx.fill();
    }
  }

  function drawRings(time) {
    for (var i = rings.length - 1; i >= 0; i--) {
      var ring = rings[i];
      var t = (time - ring.born) / CONFIG.ringDuration;
      if (t >= 1) {
        rings.splice(i, 1);
        continue;
      }
      var ease = 1 - Math.pow(1 - t, 3);
      var radius = CONFIG.popRadius * (0.25 + 0.75 * ease);

      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(194, 48, 48, ' + (0.4 * (1 - t)).toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200, 200, 210, ' + (0.18 * (1 - t)).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    // relogio virtual e escala de tempo (slow motion do clique)
    var dt = lastTime ? Math.min(time - lastTime, 50) : 16.7;
    lastTime = time;
    var k = dt / 16.7; // fator de tempo REAL (a repulsao usa este, nao o slow motion)
    var slowTarget = time < slowUntil ? CONFIG.slowScale : 1;
    timeScale += (slowTarget - timeScale) * (slowTarget < timeScale ? CONFIG.slowEnter : CONFIG.slowExit);
    vTime += dt * timeScale;
    var ts = timeScale;
    var decayX = Math.pow(0.88, ts);
    var decayY = Math.pow(0.92, ts);

    var bass = 0;
    var bassIntensity = 0;
    if (window._getBassLevel) {
      bass = window._getBassLevel();
      if (bass > CONFIG.bassThreshold) {
        bassIntensity = Math.min((bass - CONFIG.bassThreshold) / (255 - CONFIG.bassThreshold), 1);
      }
    }

    var repelR = CONFIG.repelRadius;
    var repelRDown = CONFIG.repelRadiusDown;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // particula estourada: espera o respawn
      if (p.dead) {
        if (time >= p.respawnAt) {
          p.dead = false;
          p.fade = 0;
          p.x = Math.random() * width;
          p.y = height + 10;
          p.impulseX = 0;
          p.impulseY = 0;
          p.currentSize = p.baseSize;
        } else {
          continue;
        }
      } else if (p.fade < 1) {
        p.fade = Math.min(1, p.fade + 0.015);
      }

      // hora de estourar (onda a partir do clique)
      if (p.popAt && time >= p.popAt) {
        spawnPop(p, time);
        p.popAt = 0;
        p.dead = true;
        p.fade = 0;
        p.respawnAt = time + randomBetween(CONFIG.popRespawnMin, CONFIG.popRespawnMax);
        continue;
      }

      // repulsao do mouse: a zona e uma meia-elipse (maior para baixo).
      // Funciona por posicao e em tempo real, entao nao depende da velocidade
      // da particula nem do slow motion.
      var target = 0;
      if (mouse.active) {
        var mdx = p.x - mouse.x;
        var mdy = p.y - mouse.y;
        var dist = Math.sqrt(mdx * mdx + mdy * mdy);
        var ux, uy;
        if (dist < 0.001) {
          ux = 0;
          uy = -1;
          dist = 0.001;
        } else {
          ux = mdx / dist;
          uy = mdy / dist;
        }

        // distancia da borda da zona nessa direcao
        var rb;
        if (uy > 0) {
          var ea = ux / repelR;
          var eb = uy / repelRDown;
          rb = 1 / Math.sqrt(ea * ea + eb * eb);
        } else {
          rb = repelR;
        }

        if (dist < rb) {
          var pen = rb - dist;
          var force = pen / rb;
          target = force;

          // empurra para fora da zona
          var push = Math.min(pen * CONFIG.repelSpring * k, pen);
          p.x += ux * push;
          p.y += uy * push;

          // cancela a velocidade que aponta para o mouse
          var vn = p.impulseX * ux + (p.baseSpeedY + p.impulseY) * uy;
          if (vn < 0) {
            var cancel = vn * CONFIG.repelBrake * Math.min(1, force * 4);
            p.impulseX -= cancel * ux;
            p.impulseY -= cancel * uy;
          }

          // pequeno impulso para fora, para elas fugirem em vez de colar na borda
          p.impulseX += ux * force * CONFIG.repelFling * k;
          p.impulseY += uy * force * CONFIG.repelFling * k;

          // quem vem de baixo contorna o mouse pelo lado
          if (uy > 0) {
            p.x += (ux >= 0 ? 1 : -1) * force * CONFIG.repelSlide * k;
          }
        }
      }
      p.near += (target - p.near) * 0.2;

      if (bassIntensity > 0) {
        var jitter = (Math.random() - 0.5) * 2;
        p.impulseX += jitter * CONFIG.bassSpread * bassIntensity;
        p.impulseY += -CONFIG.bassBoostSpeed * bassIntensity * (0.5 + Math.random() * 0.5);
        p.currentSize = p.baseSize + (CONFIG.bassSizeMultiplier * bassIntensity * p.baseSize);
      } else {
        p.currentSize += (p.baseSize - p.currentSize) * 0.15;
      }

      p.impulseX *= decayX;
      p.impulseY *= decayY;

      p.y += (p.baseSpeedY + p.impulseY) * ts;
      p.x += (p.drift * Math.sin(vTime * 0.001 + p.twinkleOffset) + p.impulseX) * ts;

      const twinkle = Math.sin(vTime * p.twinkleSpeed + p.twinkleOffset);
      var opacityBoost = bassIntensity > 0 ? bassIntensity * 0.4 : 0;
      var baseAlpha = Math.min(
        p.baseOpacity * (0.5 + 0.5 * twinkle) + opacityBoost + p.near * CONFIG.nearBrightness,
        0.9
      );

      // quem esta marcado para estourar brilha um pouco antes do pop
      var armed = p.popAt ? 0.25 : 0;
      const alpha = Math.min(baseAlpha + armed, 0.95) * p.fade;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
        p.impulseX = 0;
        p.impulseY = 0;
        p.currentSize = p.baseSize;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      if (alpha <= 0) continue;

      var drawSize = p.currentSize + p.near * CONFIG.nearGrow;

      ctx.beginPath();
      ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
      ctx.fill();

      if (drawSize > 2) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawSize * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.12})`;
        ctx.fill();
      }
    }

    drawRings(time);
    drawPops(time, dt);

    if (CONFIG.debug && mouse.active) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, CONFIG.repelRadius, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(mouse.x, mouse.y, CONFIG.repelRadius, CONFIG.repelRadiusDown, 0, 0, Math.PI);
      ctx.stroke();
    }

    animationId = requestAnimationFrame(draw);
  }

  resize();
  initParticles();
  requestAnimationFrame(draw);

  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      initParticles();
    }, 200);
  });

  // mouse: listeners na window, em fase de captura, para nada na pagina bloquear
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }, { capture: true, passive: true });

  document.documentElement.addEventListener('mouseleave', function () {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // clique: onda visual, slow motion em tudo e particulas proximas estouram em onda
  window.addEventListener('click', function (e) {
    var now = performance.now();
    var r2 = CONFIG.popRadius * CONFIG.popRadius;

    rings.push({ x: e.clientX, y: e.clientY, born: now });
    slowUntil = now + CONFIG.slowHold;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.dead || p.popAt) continue;
      var dx = p.x - e.clientX;
      var dy = p.y - e.clientY;
      var d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        var d = Math.sqrt(d2);
        p.popAt = now + (d / CONFIG.popRadius) * CONFIG.popStagger;
      }
    }
  }, true);

  window._particlesBurst = function () {
    var burstColors = [
      { r: 194, g: 48, b: 48 },
      { r: 200, g: 200, b: 210 },
      { r: 139, g: 32, b: 32 },
    ];
    for (var i = 0; i < 30; i++) {
      var p = finalizeParticle(createParticle());
      p.x = width / 2 + (Math.random() - 0.5) * 100;
      p.y = height / 2;
      p.impulseX = (Math.random() - 0.5) * 12;
      p.impulseY = (Math.random() - 0.5) * 12;
      p.currentSize = randomBetween(2, 5);
      p.baseSize = 1;
      p.baseOpacity = 0.6;
      p.color = burstColors[Math.floor(Math.random() * burstColors.length)];
      particles.push(p);
    }
  };

  console.info('[particles] v6 carregado');
})();
