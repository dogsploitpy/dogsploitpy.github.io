(function () {
  const hasPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!hasPointer) return;

  const MAX_TILT = 6;
  const GLOW_SIZE = 250;

  function attachTilt(card) {
    if (!card) return;

    const glowOverlay = document.createElement('div');
    glowOverlay.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
      z-index: 3;
      opacity: 0;
      transition: opacity 0.3s ease;
      overflow: hidden;
    `;
    card.appendChild(glowOverlay);

    card.addEventListener('mouseenter', function () {
      glowOverlay.style.opacity = '1';
      card.style.transition = 'transform 0.1s ease-out';
    });

    let tiltFrame = null;

    card.addEventListener('mousemove', function (e) {
      if (tiltFrame) return;
      tiltFrame = requestAnimationFrame(function () {
        tiltFrame = null;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -MAX_TILT;
        const rotateY = ((x - centerX) / centerX) * MAX_TILT;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        glowOverlay.style.background = `radial-gradient(${GLOW_SIZE}px circle at ${x}px ${y}px, rgba(176, 176, 184, 0.06), transparent 60%)`;
      });
    });

    card.addEventListener('mouseleave', function () {
      card.style.transition = 'transform 0.4s ease';
      card.style.transform = '';
      glowOverlay.style.opacity = '0';
    });
  }

  attachTilt(document.getElementById('magic-card'));
  attachTilt(document.getElementById('presence'));
})();