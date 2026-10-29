(function () {
  var btn = document.getElementById('music-toggle');
  var card = document.getElementById('magic-card');
  var flipEl = document.getElementById('card-flip');
  var presenceEl = document.getElementById('presence');
  var footerEl = document.getElementById('footer-text');
  if (!btn) return;

  var VOLUME = 0.3;
  var BASS_THRESHOLD = 160;
  var BASS_RANGE_END = 6;
  var SHAKE_DECAY = 80;

  var audio = null;
  var audioCtx = null;
  var analyser = null;
  var dataArray = null;
  var isPlaying = false;
  var animFrame = null;
  var shakeTimer = null;
  var initialized = false;
  var shakeReady = false;
  var firstShake = true;

  function initAudio() {
    if (initialized) return;
    initialized = true;

    audio = new Audio('assets/ouro%20rose.mp3');
    audio.volume = VOLUME;
    audio.loop = true;
    audio.preload = 'auto';

    audio.onerror = function () {
      console.error('Falha ao carregar audio');
      btn.classList.remove('loading');
    };

    btn.classList.add('loading');
    audio.addEventListener('canplaythrough', function () {
      btn.classList.remove('loading');
    }, { once: true });

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var source = audioCtx.createMediaElementSource(audio);

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    dataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  function getBassLevel() {
    if (!analyser || !dataArray) return 0;
    analyser.getByteFrequencyData(dataArray);
    var sum = 0;
    for (var i = 0; i < BASS_RANGE_END; i++) {
      sum += dataArray[i];
    }
    return sum / BASS_RANGE_END;
  }

  function clearShake() {
    if (flipEl) {
      flipEl.style.translate = '';
      flipEl.style.scale = '';
    }
    if (presenceEl) {
      presenceEl.style.translate = '';
      presenceEl.style.scale = '';
      presenceEl.classList.remove('bass-hit');
    }
    if (card) card.classList.remove('bass-hit');
    if (footerEl) footerEl.style.transform = '';
  }

  function bassLoop() {
    var bass = getBassLevel();

    if (bass > BASS_THRESHOLD && flipEl && shakeReady) {
      var intensity = Math.min((bass - BASS_THRESHOLD) / (255 - BASS_THRESHOLD), 1);

      var mult = firstShake ? 1.8 : 1;
      if (firstShake) firstShake = false;

      var tx = (Math.random() - 0.5) * 9 * intensity * mult;
      var ty = (Math.random() - 0.5) * 6.5 * intensity * mult;
      var sc = 1 + 0.013 * intensity * mult;

      var shakeTranslate = tx.toFixed(1) + 'px ' + ty.toFixed(1) + 'px';
      var shakeScale = sc.toFixed(4);

      // translate e scale sao propriedades independentes de transform,
      // entao nao conflitam com a animacao cardEntrance nem com o tilt do mouse
      flipEl.style.translate = shakeTranslate;
      flipEl.style.scale = shakeScale;
      if (card) card.classList.add('bass-hit');

      if (presenceEl && !presenceEl.hidden) {
        presenceEl.style.translate = shakeTranslate;
        presenceEl.style.scale = shakeScale;
        presenceEl.classList.add('bass-hit');
      }

      if (footerEl) {
        var ftx = (Math.random() - 0.5) * 4 * intensity * mult;
        var fty = (Math.random() - 0.5) * 2.5 * intensity * mult;
        footerEl.style.transform = 'translate(' + ftx.toFixed(1) + 'px, ' + fty.toFixed(1) + 'px)';
      }

      clearTimeout(shakeTimer);
      shakeTimer = setTimeout(clearShake, SHAKE_DECAY);
    }

    if (isPlaying) {
      animFrame = requestAnimationFrame(bassLoop);
    }
  }

  function play() {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    audio.play().catch(function (err) {
      console.error('Playback falhou:', err);
    });
    isPlaying = true;
    shakeReady = false;
    firstShake = true;
    setTimeout(function () { shakeReady = true; }, 4750);
    btn.classList.add('playing');
    bassLoop();
  }

  function pause() {
    if (audio) audio.pause();
    isPlaying = false;
    btn.classList.remove('playing');
    if (animFrame) cancelAnimationFrame(animFrame);
    clearTimeout(shakeTimer);
    clearShake();
  }

  function toggle() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  btn.addEventListener('click', toggle);

  window._musicPlay = play;
  window._musicIsPlaying = function () { return isPlaying; };
  window._getBassLevel = getBassLevel;
  window._getAudio = function () { return audio; };
})();