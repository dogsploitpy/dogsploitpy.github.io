(function () {
  var hasPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!hasPointer) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'snow-trail';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:1000;pointer-events:none;';
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var flakes = [];
  var mx = -200, my = -200;
  var lastX = -200, lastY = -200;
  var w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;

    var dx = mx - lastX;
    var dy = my - lastY;
    var dist = Math.sqrt(dx * dx + dy * dy);

    var count = Math.min(Math.floor(dist / 6), 4);
    for (var i = 0; i < count; i++) {
      flakes.push({
        x: mx + (Math.random() - 0.5) * 12,
        y: my + (Math.random() - 0.5) * 12,
        size: Math.random() * 2.5 + 1,
        vx: (Math.random() - 0.5) * 1.2,
        vy: Math.random() * 1.5 + 0.5,
        life: 1,
        decay: Math.random() * 0.015 + 0.012,
      });
    }

    lastX = mx;
    lastY = my;
  });

  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (var i = flakes.length - 1; i >= 0; i--) {
      var f = flakes[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vx *= 0.98;
      f.life -= f.decay;

      if (f.life <= 0) {
        flakes.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * f.life, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 200, 210, ' + (f.life * 0.6).toFixed(2) + ')';
      ctx.fill();

      if (f.size > 1.5) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * f.life * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 200, 210, ' + (f.life * 0.08).toFixed(3) + ')';
        ctx.fill();
      }
    }

    if (flakes.length > 150) flakes.splice(0, flakes.length - 150);

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

(function () {
  var flip = document.getElementById('card-flip');
  if (!flip) return;

  flip.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    flip.classList.toggle('flipped');
  });
})();

(function () {
  var el = document.getElementById('footer-text');
  if (!el) return;

  var text = 'root@Ðogspløit.py:~$';
  var i = 0;
  var speed = 80;

  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed + Math.random() * 40);
    } else {
      el.classList.add('done');
    }
  }

  setTimeout(type, 1800);
})();

(function () {
  var code = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
  var pos = 0;
  var triggered = false;

  document.addEventListener('keydown', function (e) {
    if (triggered) return;
    if (e.keyCode === code[pos]) {
      pos++;
      if (pos === code.length) {
        triggered = true;
        activateEasterEgg();
      }
    } else {
      pos = 0;
    }
  });

  function activateEasterEgg() {
    document.body.style.animation = 'glitchEgg 0.3s ease 3';

    var msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;font-family:"Fira Code",monospace;font-size:1rem;color:#c23030;letter-spacing:4px;text-transform:uppercase;text-shadow:0 0 20px rgba(194,48,48,0.6);opacity:0;transition:opacity 0.5s ease;padding:20px;text-align:center;';
    msg.innerHTML = '> ACESSO ROOT LIBERADO <br><span style="font-size:0.6rem;color:#7c7a74;letter-spacing:2px;margin-top:8px;display:block;">voce encontrou o segredo</span>';
    document.body.appendChild(msg);

    setTimeout(function () { msg.style.opacity = '1'; }, 50);

    if (window._particlesBurst) window._particlesBurst();

    setTimeout(function () {
      msg.style.opacity = '0';
      setTimeout(function () { msg.remove(); }, 500);
    }, 3500);
  }

  var style = document.createElement('style');
  style.textContent = '@keyframes glitchEgg { 0%,100%{transform:translate(0)} 25%{transform:translate(-3px,2px)} 50%{transform:translate(3px,-2px)} 75%{transform:translate(-2px,-1px)} }';
  document.head.appendChild(style);
})();

(function () {
  var progress = document.getElementById('music-progress');
  if (!progress) return;

  function updateProgress() {
    if (window._getAudio && window._musicIsPlaying && window._musicIsPlaying()) {
      var audio = window._getAudio();
      if (audio && audio.duration) {
        var pct = (audio.currentTime / audio.duration) * 100;
        progress.style.setProperty('--progress', pct + '%');
      }
    }
    requestAnimationFrame(updateProgress);
  }
  requestAnimationFrame(updateProgress);
})();
