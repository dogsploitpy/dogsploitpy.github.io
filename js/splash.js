/* ============================================
   Splash / Warning screen — click to dismiss + play music
   ============================================ */
(function () {
  var splash = document.getElementById('splash');
  if (!splash) return;

  function dismiss() {
    splash.classList.add('dismissed');

    if (window._musicPlay && !window._musicIsPlaying()) {
      window._musicPlay();
    }

    setTimeout(function () {
      splash.remove();
    }, 700);
  }

  splash.addEventListener('click', dismiss);

  document.addEventListener('keydown', function (e) {
    if (!splash.parentNode) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dismiss();
    }
  });
})();
