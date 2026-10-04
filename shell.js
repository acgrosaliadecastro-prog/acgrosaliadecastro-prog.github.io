/* Carcasa de la web app: pestañas, contador de avisos, instalación y notificaciones */
(function () {
  'use strict';
  var C = self.ACG_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var TITULOS = {
    cal: ['Calendario', 'ACG Rosalía de Castro', false],
    avisos: ['Avisos', 'ACG Rosalía de Castro', false],
    docs: ['Documentos', 'Solo lectura', true]
  };
  var frames = { cal: $('pane-cal'), avisos: $('pane-av') };
  var panes = { cal: $('pane-cal'), avisos: $('pane-av'), docs: $('pane-docs') };

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { }
    return null;
  }
  function win(nombre) { try { return frames[nombre].contentWindow; } catch (e) { return null; } }
  function llamar(nombre, fn) {
    var w = win(nombre);
    try { if (w) fn(w); } catch (e) { }
  }

  var shell = window.ACGShell = { tab: 'cal' };

  /* ---------- Pestañas ---------- */
  function elegir(tab) {
    if (!panes[tab]) tab = 'cal';
    shell.tab = tab;
    Object.keys(panes).forEach(function (k) { panes[k].hidden = k !== tab; });
    document.querySelectorAll('.tab').forEach(function (b) {
      var sel = b.dataset.tab === tab;
      b.classList.toggle('sel', sel);
      b.setAttribute('aria-current', sel ? 'page' : 'false');
    });
    var t = TITULOS[tab];
    $('title').textContent = t[0];
    $('subtitle').textContent = t[1];
    $('subLock').hidden = !t[2];
    $('refresh').hidden = tab === 'docs';
    llamar('avisos', function (w) { if (w.ACGAv) w.ACGAv.setVisible(tab === 'avisos' && !document.hidden); });
    shell.updateBadge();
  }
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () { elegir(b.dataset.tab); });
  });

  $('refresh').addEventListener('click', function () {
    var b = $('refresh');
    b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin');
    if (shell.tab === 'cal') llamar('cal', function (w) { if (w.ACG) w.ACG.refresh(); });
    else if (shell.tab === 'avisos') llamar('avisos', function (w) { if (w.ACGAv) w.ACGAv.refresh(); });
  });

  $('openDocs').href = C.onedrive || '#';

  frames.avisos.addEventListener('load', function () {
    llamar('avisos', function (w) { if (w.ACGAv) w.ACGAv.setVisible(shell.tab === 'avisos' && !document.hidden); });
  });

  /* ---------- Avisos sin leer ---------- */
  function sinLeer() {
    try {
      var c = JSON.parse(ls('acg.av') || 'null');
      var leido = Number(ls('acg.leido') || 0);
      if (!c || !c.avisos) return 0;
      return c.avisos.filter(function (a) { return a.id > leido; }).length;
    } catch (e) { return 0; }
  }
  shell.updateBadge = function () {
    var n = shell.tab === 'avisos' ? 0 : sinLeer();
    var b = $('badge');
    b.hidden = n === 0;
    b.textContent = n > 9 ? '9+' : String(n);
    $('tab-avisos').setAttribute('aria-label', n ? 'Avisos, ' + n + ' sin leer' : 'Avisos');
    var total = sinLeer();
    try {
      if (total && navigator.setAppBadge) navigator.setAppBadge(total);
      else if (!total && navigator.clearAppBadge) navigator.clearAppBadge();
    } catch (e) { }
    // El service worker usa esto para el número del icono cuando llega un aviso
    if (window.caches) {
      caches.open('acg-estado').then(function (c) {
        return c.put('estado', new Response(JSON.stringify({ leido: Number(ls('acg.leido') || 0) })));
      }).catch(function () { });
    }
  };

  /* ---------- Volver a la app ---------- */
  document.addEventListener('visibilitychange', function () {
    var visible = !document.hidden;
    llamar('avisos', function (w) { if (w.ACGAv) w.ACGAv.setVisible(visible && shell.tab === 'avisos'); });
    if (!visible) return;
    // Las apps instaladas vuelven sin recargar la página: se comprueba si hay versión nueva
    if (registro) registro.update().catch(function () { });
    llamar('cal', function (w) { if (w.ACG) w.ACG.onResume(); });
    llamar('avisos', function (w) { if (w.ACGAv) w.ACGAv.onResume(); });
    shell.updateBadge();
  });

  /* ---------- Instalación en el iPhone ---------- */
  var esIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var instalada = window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  function cerrarInstalar() {
    $('install').hidden = true;
    ls('acg.instalar', String(Date.now()));
  }
  if (esIOS && !instalada) {
    var ultimo = Number(ls('acg.instalar') || 0);
    if (Date.now() - ultimo > 3 * 86400000) $('install').hidden = false;
  }
  $('installClose').addEventListener('click', cerrarInstalar);
  $('installOk').addEventListener('click', cerrarInstalar);
  $('install').addEventListener('click', function (e) { if (e.target === this) cerrarInstalar(); });

  /* ---------- Notificaciones (Web Push) ---------- */
  shell.registrarSuscripcion = function (sub) {
    var datos = sub && sub.toJSON ? sub.toJSON() : sub;
    if (!datos || !datos.endpoint || !C.servidor) return Promise.resolve(false);
    return fetch(C.servidor, {
      method: 'POST', credentials: 'omit',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion: 'suscribir', sub: { endpoint: datos.endpoint } })
    }).then(function (r) { return r.json(); })
      .then(function (res) { return !!(res && res.ok); })
      .catch(function () { return false; });
  };

  var registro = null;
  shell.prepararPush = function () {
    if (!C.servidor) return;
    fetch(C.servidor + '?accion=vapid&_=' + Date.now(), { credentials: 'omit' })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok || !res.clave) return;
        var anterior = ls('acg.vapid');
        ls('acg.vapid', res.clave);
        if (!registro || !('PushManager' in window) || Notification.permission !== 'granted') return;
        return registro.pushManager.getSubscription().then(function (sub) {
          if (sub && anterior && anterior !== res.clave) {
            // El servidor cambió de claves: se rehace la suscripción
            return sub.unsubscribe().then(function () {
              return registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(res.clave) });
            });
          }
          return sub;
        }).then(function (sub) {
          if (!sub) { ls('acg.push', null); return; }
          return shell.registrarSuscripcion(sub).then(function (ok) { if (ok) ls('acg.push', '1'); });
        });
      })
      .catch(function () { })
      .then(function () { llamar('avisos', function (w) { if (w.ACGAv) w.ACGAv.onResume(); }); });
  };
  function aBytes(b64) {
    var raw = atob((b64 + '==='.slice((b64.length + 3) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function () {
      return navigator.serviceWorker.ready;
    }).then(function (r) {
      registro = r;
      shell.prepararPush();
    }).catch(function () { });
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.tab) {
        elegir(e.data.tab);
        llamar('avisos', function (w) { if (w.ACGAv) w.ACGAv.refresh(); });
      }
    });
  }

  /* ---------- Arranque ---------- */
  var inicial = new URLSearchParams(location.search).get('tab');
  elegir(inicial === 'avisos' || inicial === 'docs' ? inicial : 'cal');
})();
