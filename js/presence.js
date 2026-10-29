(function () {
  var USER_ID = '1522660009287352436';

  var el = document.getElementById('presence');
  if (!el) return;
  if (!/^\d+$/.test(USER_ID)) {
    console.warn('[presence] coloque seu ID numerico do Discord em USER_ID');
    return;
  }

  var $ = function (id) { return document.getElementById(id); };
  var bg = $('presence-bg');
  var avatar = $('presence-avatar');
  var dot = $('presence-dot');
  var nameEl = $('presence-name');
  var line1 = $('presence-line1');
  var line2 = $('presence-line2');

  var VERBS = { 0: 'Jogando', 1: 'Transmitindo', 2: 'Ouvindo', 3: 'Assistindo', 5: 'Competindo em' };
  var STATUS_TXT = { online: 'online', idle: 'ausente', dnd: 'nao perturbe', offline: 'offline' };

  function activityImage(a) {
    var img = a.assets && a.assets.large_image;
    if (!img || img.indexOf('spotify:') === 0) return null;
    if (img.indexOf('mp:external/') === 0) {
      return 'https://media.discordapp.net/external/' + img.slice('mp:external/'.length);
    }
    return 'https://cdn.discordapp.com/app-assets/' + a.application_id + '/' + img + '.png?size=256';
  }

  function setLine1(verb, text) {
    line1.textContent = '';
    if (verb) {
      var b = document.createElement('b');
      b.textContent = verb;
      line1.appendChild(b);
      line1.appendChild(document.createTextNode(' ' + text));
    } else {
      line1.textContent = text;
    }
  }

  function render(d) {
    if (!d || !d.discord_user) return;
    var u = d.discord_user;

    var avatarUrl = u.avatar
      ? 'https://cdn.discordapp.com/avatars/' + u.id + '/' + u.avatar + '.' +
        (u.avatar.indexOf('a_') === 0 ? 'gif' : 'png') + '?size=128'
      : 'https://cdn.discordapp.com/embed/avatars/0.png';
    if (avatar.src !== avatarUrl) avatar.src = avatarUrl;

    nameEl.textContent = u.global_name || u.display_name || u.username;
    dot.className = 'presence-dot ' + (d.discord_status || 'offline');

    var acts = (d.activities || []).filter(function (a) { return a.type !== 4; });
    var custom = (d.activities || []).filter(function (a) { return a.type === 4; })[0];
    var main = acts[0];
    var bgUrl = avatarUrl;

    if (main && main.type === 2 && d.spotify) {
      setLine1(VERBS[2], d.spotify.song);
      line2.textContent = (d.spotify.artist || '').replace(/;\s*/g, ', ');
      bgUrl = d.spotify.album_art_url || bgUrl;
    } else if (main) {
      setLine1(VERBS[main.type] || 'Jogando', main.name);
      line2.textContent = [main.details, main.state].filter(Boolean).join(' · ');
      bgUrl = activityImage(main) || bgUrl;
    } else {
      setLine1('', (custom && custom.state) || STATUS_TXT[d.discord_status] || 'offline');
      line2.textContent = '';
    }

    bg.style.backgroundImage = 'url("' + bgUrl + '")';
    el.hidden = false;
  }

  // render rapido via REST, depois ao vivo via WebSocket
  fetch('https://api.lanyard.rest/v1/users/' + USER_ID)
    .then(function (r) { return r.json(); })
    .then(function (j) { if (j.success) render(j.data); })
    .catch(function () {});

  function connect() {
    var ws = new WebSocket('wss://api.lanyard.rest/socket');
    var hb;

    ws.onmessage = function (ev) {
      var m = JSON.parse(ev.data);
      if (m.op === 1) {
        ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: USER_ID } }));
        hb = setInterval(function () {
          if (ws.readyState === 1) ws.send(JSON.stringify({ op: 3 }));
        }, m.d.heartbeat_interval);
      } else if (m.op === 0) {
        render(m.d);
      }
    };

    ws.onclose = function () {
      clearInterval(hb);
      setTimeout(connect, 5000);
    };
  }
  connect();

  // botao vermelho: recolhe / expande
  $('presence-btn').addEventListener('click', function (e) {
    e.stopPropagation();
    el.classList.add('collapsed');
  });
  $('presence-avatar').parentNode.addEventListener('click', function () {
    el.classList.remove('collapsed');
  });
})();