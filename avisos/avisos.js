/* Avisos — ACG Rosalía de Castro */
(function () {
  'use strict';

  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var ICON_TRASH = '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M261-120q-24.75 0-42.37-17.63Q201-155.25 201-180v-570h-11q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h158q0-13 8.63-21.5 8.62-8.5 21.37-8.5h204q12.75 0 21.38 8.62Q612-842.75 612-830h158q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5h-11v570q0 24.75-17.62 42.37Q723.75-120 699-120H261Zm438-630H261v570h438v-570ZM367-266q0 12.75 8.68 21.37 8.67 8.63 21.5 8.63 12.82 0 21.32-8.63 8.5-8.62 8.5-21.37v-399q0-12.75-8.68-21.38-8.67-8.62-21.5-8.62-12.82 0-21.32 8.62-8.5 8.63-8.5 21.38v399Zm166 0q0 12.75 8.68 21.37 8.67 8.63 21.5 8.63 12.82 0 21.32-8.63 8.5-8.62 8.5-21.37v-399q0-12.75-8.68-21.38-8.67-8.62-21.5-8.62-12.82 0-21.32 8.62-8.5 8.63-8.5 21.38v399ZM261-750v570-570Z"/></svg>';
  var ICON_REFRESH = '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-160q-133 0-226.5-93.5T160-480q0-133 93.5-226.5T480-800q85 0 149 34.5T740-671v-99q0-13 8.5-21.5T770-800q13 0 21.5 8.5T800-770v194q0 13-8.5 21.5T770-546H576q-13 0-21.5-8.5T546-576q0-13 8.5-21.5T576-606h138q-38-60-97-97t-137-37q-109 0-184.5 75.5T220-480q0 109 75.5 184.5T480-220q75 0 140-39.5T717-367q6-11 17-16.5t23-1.5q13 4 18.5 16t-.5 23q-41 85-121 135.5T480-160Z"/></svg>';

  /* ---------- Puente con Android ---------- */
  var N = window.ACGAvisosNative || null;
  function call(name) {
    if (!N || typeof N[name] !== 'function') return null;
    try { return N[name].apply(N, Array.prototype.slice.call(arguments, 1)); } catch (e) { return null; }
  }
  function readJSON(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }

  var config = readJSON(call('getConfig')) || { configurado: false };
  (function () {
    var z = Math.min(1.3, Math.max(1, +config.fontScale || 1));
    if (z > 1.01) { document.documentElement.style.setProperty('--z', String(z)); document.body.style.zoom = String(z); }
  })();

  var state = {
    avisos: [], savedAt: 0, leido: 0, leidoVista: 0,
    phase: config.configurado ? 'loading' : 'pending', // pending | loading | ok | error
    lastError: '', visible: call('isVisible') === true, pin: null, removeId: null
  };

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function txt(tag, cls, t) { var e = document.createElement(tag); if (cls) e.className = cls; e.textContent = t; return e; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function startOfDay(ms) { var d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }

  function cuando(ms) {
    var d = new Date(ms), hoy = startOfDay(Date.now()), dia = startOfDay(ms);
    var hora = d.getHours() + ':' + pad(d.getMinutes());
    var diff = Math.round((hoy - dia) / 86400000);
    if (diff === 0) return 'Hoy, ' + hora;
    if (diff === 1) return 'Ayer, ' + hora;
    var s = d.getDate() + ' de ' + MONTHS[d.getMonth()];
    if (d.getFullYear() !== new Date().getFullYear()) s += ' de ' + d.getFullYear();
    return s + ', ' + hora;
  }

  function linkify(container, text) {
    var re = /(https?:\/\/[^\s<>"')]+[^\s<>"').,;:!?])/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) container.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement('a');
      a.href = '#'; a.textContent = m[1];
      (function (url) { a.addEventListener('click', function (ev) { ev.preventDefault(); call('openUrl', url); }); })(m[1]);
      container.appendChild(a);
      last = m.index + m[1].length;
    }
    if (last < text.length) container.appendChild(document.createTextNode(text.slice(last)));
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2800);
  }

  /* ---------- Datos ---------- */
  function loadCached() {
    var c = readJSON(call('getCached'));
    if (c && c.avisos) {
      state.avisos = c.avisos;
      state.savedAt = c.savedAt || 0;
      state.leido = c.leido || 0;
      return true;
    }
    return false;
  }

  function maxId() {
    var m = 0;
    state.avisos.forEach(function (a) { if (a.id > m) m = a.id; });
    return m;
  }

  function markReadIfVisible() {
    if (!state.visible || !state.avisos.length) return;
    var m = maxId();
    if (m > state.leido) { call('markRead', m); state.leido = m; }
  }

  function refresh() {
    if (!config.configurado) { state.phase = 'pending'; render(); return; }
    if (!state.avisos.length && state.phase !== 'ok') { state.phase = 'loading'; render(); }
    renderStatus(true);
    call('refresh');
  }

  function onRefreshDone(ok, err) {
    var hay = loadCached(); // también recoge lo que haya descargado la comprobación en segundo plano
    if (ok && hay) { state.phase = 'ok'; state.lastError = ''; }
    else { state.lastError = ok ? '' : (err || 'error'); state.phase = hay ? 'ok' : 'error'; }
    render();
    markReadIfVisible();
  }

  /* ---------- Envíos al servidor ---------- */
  var pending = {}, seq = 0;
  function send(payload, cb) {
    var id = 'r' + (++seq);
    pending[id] = cb;
    if (call('send', id, JSON.stringify(payload)) === null && !N) {
      setTimeout(function () { onSendDone(id, false, 'sin app'); }, 50);
    }
  }
  function onSendDone(id, ok, out) {
    var cb = pending[id]; delete pending[id];
    if (!cb) return;
    var res = ok ? readJSON(out) : null;
    cb(res || { ok: false, error: 'RED' });
  }

  function errorText(code) {
    switch (code) {
      case 'PIN': return 'La contraseña no es correcta.';
      case 'MAESTRA': return 'La clave maestra no es correcta.';
      case 'BLOQUEADO': return 'Demasiados intentos fallidos. Espera 30 minutos y vuelve a probar.';
      case 'PIN_CORTO': return 'La nueva contraseña debe tener al menos 4 caracteres.';
      case 'TITULO': return 'Escribe un título para el aviso.';
      case 'NO_EXISTE': return 'Ese aviso ya no existe.';
      case 'RED': return 'No hay conexión con el servidor de avisos. Comprueba internet y vuelve a intentarlo.';
      default: return 'No se pudo completar. Vuelve a intentarlo.';
    }
  }

  function busy(btn, on, label) {
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Enviando…'; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
  }

  /* ---------- Pintado ---------- */
  function render() {
    $('adminBar').hidden = !state.pin;
    $('notifBar').hidden = !config.configurado || call('notificationsEnabled') !== false;
    $('composeBtn').hidden = !config.configurado;

    var box = $('stateBox');
    box.hidden = true; box.innerHTML = '';
    var list = $('list'); list.innerHTML = '';

    if (state.phase === 'pending') {
      showState('Avisos en preparación', 'Muy pronto la junta podrá publicar aquí sus avisos y te llegarán como notificación.');
    } else if (state.phase === 'loading' && !state.avisos.length) {
      showState('Cargando avisos…', '');
    } else if (state.phase === 'error' && !state.avisos.length) {
      showState('No se pudieron cargar los avisos', 'Comprueba que el móvil tiene internet y vuelve a intentarlo.', true);
    } else if (!state.avisos.length) {
      showState('No hay avisos', 'Cuando la junta publique un aviso, aparecerá aquí y te llegará una notificación.');
    }

    state.avisos.forEach(function (a) {
      var li = el('li');
      var art = el('article', 'aviso');
      var nuevo = a.id > state.leidoVista;
      if (nuevo) art.classList.add('nuevo');
      var meta = el('div', 'meta');
      meta.appendChild(txt('time', '', cuando(a.fecha || a.id)));
      if (nuevo) meta.appendChild(txt('span', 'chip', 'Nuevo'));
      art.appendChild(meta);
      art.appendChild(txt('h2', '', a.titulo || 'Aviso'));
      if (a.texto) { var p = el('p', 'texto'); linkify(p, a.texto); art.appendChild(p); }
      if (state.pin) {
        var rm = el('button', 'remove', ICON_TRASH + '<span>Retirar</span>');
        rm.addEventListener('click', function () { openRemove(a); });
        art.appendChild(rm);
      }
      li.appendChild(art);
      list.appendChild(li);
    });
    renderStatus(false);
  }

  function showState(title, text, retry) {
    var box = $('stateBox');
    box.hidden = false;
    box.appendChild(txt('h1', '', title));
    if (text) box.appendChild(txt('p', '', text));
    if (retry) {
      var b = el('button', 'btn', ICON_REFRESH + '<span>Reintentar</span>');
      b.addEventListener('click', refresh);
      box.appendChild(b);
    }
  }

  function renderStatus(isBusy) {
    var s = $('status');
    s.className = 'status'; s.innerHTML = '';
    if (state.phase === 'pending') return;
    if (isBusy) { s.appendChild(txt('span', '', 'Actualizando…')); return; }
    if (!state.savedAt) return;
    var d = new Date(state.savedAt);
    var when = (startOfDay(state.savedAt) === startOfDay(Date.now()) ? 'hoy' : 'el ' + d.getDate() + ' de ' + MONTHS[d.getMonth()]) + ' a las ' + d.getHours() + ':' + pad(d.getMinutes());
    if (state.lastError) { s.classList.add('warn'); s.appendChild(txt('span', '', 'Sin conexión. Se muestran los avisos guardados ' + when + '.')); }
    else s.appendChild(txt('span', '', 'Actualizado ' + when));
  }

  /* ---------- Fichas ---------- */
  var PANES = ['pinPane', 'composePane', 'changePane', 'removePane'];
  function openSheet(pane, title) {
    PANES.forEach(function (p) { $(p).hidden = p !== pane; });
    $('sheetTitle').textContent = title;
    ['pinErr', 'composeErr', 'changeErr', 'removeErr'].forEach(function (e) { $(e).textContent = ''; });
    $('backdrop').hidden = false;
    $('sheet').scrollTop = 0;
  }
  function closeSheet() {
    if ($('backdrop').hidden) return false;
    $('backdrop').hidden = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    return true;
  }
  function focusLater(id) { setTimeout(function () { var e = $(id); if (e) e.focus(); }, 120); }

  var composeNonce = null;

  // La contraseña ha cambiado mientras se escribía: se vuelve a pedir
  function pinChanged(code) {
    state.pin = null;
    render();
    $('pinInput').value = '';
    openSheet('pinPane', 'Publicar un aviso');
    $('pinErr').textContent = code === 'BLOQUEADO' ? errorText('BLOQUEADO') : 'La contraseña ha cambiado. Escribe la nueva para continuar.';
    focusLater('pinInput');
  }

  function openCompose() {
    if (state.pin) { openSheet('composePane', 'Nuevo aviso'); focusLater('titleInput'); }
    else { $('pinInput').value = ''; openSheet('pinPane', 'Publicar un aviso'); focusLater('pinInput'); }
  }

  function openRemove(a) {
    state.removeId = a.id;
    $('removeText').textContent = '«' + (a.titulo || 'Aviso') + '» dejará de verse en la app de todos los socios.';
    openSheet('removePane', '¿Retirar este aviso?');
  }

  $('composeBtn').addEventListener('click', openCompose);
  $('notifOn').addEventListener('click', function () { call('openNotificationSettings'); });
  $('adminExit').addEventListener('click', function () { state.pin = null; render(); toast('Has salido del modo publicación'); });
  $('sheetClose').addEventListener('click', closeSheet);
  $('backdrop').addEventListener('click', function (e) { if (e.target === this) closeSheet(); });
  $('toChange').addEventListener('click', function () {
    $('masterInput').value = ''; $('newPin').value = ''; $('newPin2').value = '';
    openSheet('changePane', 'Cambiar la contraseña');
    focusLater('masterInput');
  });
  $('removeCancel').addEventListener('click', closeSheet);

  $('pinPane').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var pin = $('pinInput').value.trim(), btn = $('pinOk');
    if (!pin) { $('pinErr').textContent = 'Escribe la contraseña.'; return; }
    busy(btn, true, 'Comprobando…');
    send({ accion: 'comprobar', pin: pin }, function (res) {
      busy(btn, false);
      if (!res.ok) { $('pinErr').textContent = errorText(res.error); return; }
      var volver = !$('titleInput').value.trim();
      state.pin = pin;
      render();
      if (volver) { $('titleInput').value = ''; $('textInput').value = ''; composeNonce = null; }
      openSheet('composePane', 'Nuevo aviso');
      focusLater('titleInput');
    });
  });

  $('composePane').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var titulo = $('titleInput').value.trim(), texto = $('textInput').value.trim(), btn = $('composeOk');
    if (!titulo) { $('composeErr').textContent = errorText('TITULO'); return; }
    busy(btn, true, 'Publicando…');
    // El mismo identificador en los reintentos evita publicar el aviso dos veces
    if (!composeNonce) composeNonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    send({ accion: 'publicar', pin: state.pin, titulo: titulo, texto: texto, nonce: composeNonce }, function (res) {
      busy(btn, false);
      if (!res.ok) {
        if (res.error === 'PIN' || res.error === 'BLOQUEADO') return pinChanged(res.error);
        $('composeErr').textContent = errorText(res.error);
        return;
      }
      composeNonce = null;
      if (res.aviso) {
        state.avisos.unshift(res.aviso);
        state.leidoVista = Math.max(state.leidoVista, res.aviso.id);
        call('markRead', res.aviso.id); // en este móvil no hace falta notificarlo
        state.leido = Math.max(state.leido, res.aviso.id);
      }
      $('titleInput').value = ''; $('textInput').value = '';
      closeSheet();
      render();
      toast(res.repetido ? 'El aviso ya estaba publicado' : 'Aviso publicado');
      refresh();
    });
  });

  $('changePane').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var m = $('masterInput').value, a = $('newPin').value.trim(), b = $('newPin2').value.trim(), btn = $('changeOk');
    if (!m) { $('changeErr').textContent = 'Escribe la clave maestra.'; return; }
    if (a.length < 4) { $('changeErr').textContent = errorText('PIN_CORTO'); return; }
    if (a !== b) { $('changeErr').textContent = 'Las dos contraseñas nuevas no coinciden.'; return; }
    busy(btn, true, 'Cambiando…');
    send({ accion: 'cambiarPin', maestra: m, nuevoPin: a }, function (res) {
      busy(btn, false);
      if (!res.ok) { $('changeErr').textContent = errorText(res.error); return; }
      state.pin = null;
      closeSheet();
      render();
      toast('Contraseña cambiada');
    });
  });

  $('removeOk').addEventListener('click', function () {
    var btn = $('removeOk'), id = state.removeId;
    busy(btn, true, 'Retirando…');
    send({ accion: 'retirar', pin: state.pin, id: id }, function (res) {
      busy(btn, false);
      if (!res.ok && res.error !== 'NO_EXISTE') {
        if (res.error === 'PIN' || res.error === 'BLOQUEADO') return pinChanged(res.error);
        $('removeErr').textContent = errorText(res.error);
        return;
      }
      state.avisos = state.avisos.filter(function (x) { return x.id !== id; });
      closeSheet();
      render();
      toast('Aviso retirado');
      refresh();
    });
  });

  /* ---------- API para la app ---------- */
  window.ACGAv = {
    refresh: refresh,
    onRefreshDone: onRefreshDone,
    onSendDone: onSendDone,
    handleBack: closeSheet,
    setVisible: function (v) {
      var was = state.visible;
      state.visible = !!v;
      if (state.visible && !was) {
        // Al entrar se marcan los nuevos; la etiqueta «Nuevo» se mantiene mientras se está en la pestaña
        if (config.configurado && loadCached() && state.phase !== 'ok') state.phase = 'ok';
        state.leidoVista = state.leido;
        render();
        markReadIfVisible();
        if (config.configurado && Date.now() - state.savedAt > 2 * 60000) refresh();
      }
    },
    onResume: function () {
      render();
      if (config.configurado && Date.now() - state.savedAt > 5 * 60000) refresh();
    }
  };

  /* ---------- Arranque ---------- */
  if (config.configurado && loadCached()) state.phase = 'ok';
  state.leidoVista = state.leido;
  render();
  markReadIfVisible();
  if (config.configurado) refresh();
})();
