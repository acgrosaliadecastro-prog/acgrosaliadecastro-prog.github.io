/*
 * Puente web para iPhone: hace en el navegador lo que en Android hace la app nativa
 * (descargar el calendario y los avisos, guardarlos, abrir el mapa, compartir,
 * añadir al calendario y activar las notificaciones).
 * En Android este archivo no se usa: allí ya existen ACGNative y ACGAvisosNative.
 */
(function () {
  'use strict';
  if (window.ACGNative || window.ACGAvisosNative) return;

  var C = self.ACG_CONFIG || {};
  var S = C.servidor || '';
  var shell = null;
  try { if (window.parent !== window && window.parent.ACGShell) shell = window.parent.ACGShell; } catch (e) { }

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { }
    return null;
  }
  function readJSON(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function abrir(url) { window.open(url, '_blank', 'noopener'); }
  function getJSON(url) {
    url += (url.indexOf('?') < 0 ? '?' : '&') + '_=' + Date.now();
    return fetch(url, { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  function errorTexto(e) {
    var m = String((e && e.message) || e || 'RED');
    return /^HTTP \d+|^FORMATO/.test(m) ? m : 'RED';
  }
  function maxId(lista) {
    var m = 0;
    (lista || []).forEach(function (a) { if (a.id > m) m = a.id; });
    return m;
  }

  /* ---------------- Calendario ---------------- */
  window.ACGNative = {
    getConfig: function () { return JSON.stringify({ icsUrl: S ? 'web' : '', fontScale: 1 }); },
    getCached: function () { return ls('acg.cal') || ''; },
    refresh: function () {
      getJSON(S + '?accion=calendario').then(function (res) {
        if (!res.ok) throw new Error(res.error || 'SERVIDOR');
        ls('acg.cal', JSON.stringify({ ics: res.ics, savedAt: Date.now() }));
        if (window.ACG) window.ACG.onRefreshDone(true, '');
      }).catch(function (e) {
        if (window.ACG) window.ACG.onRefreshDone(false, errorTexto(e));
      });
    },
    addToCalendar: function (titulo, inicio, fin, todoElDia, lugar, descripcion) {
      var q = 'accion=evento' +
        '&t=' + encodeURIComponent(titulo || '') +
        '&b=' + Math.round(inicio) + '&e=' + Math.round(fin) +
        '&a=' + (todoElDia ? '1' : '0') +
        (lugar ? '&l=' + encodeURIComponent(lugar) : '') +
        (descripcion ? '&d=' + encodeURIComponent(String(descripcion).slice(0, 1500)) : '');
      abrir(S + '?' + q);
    },
    openMap: function (lugar) { abrir('https://maps.apple.com/?q=' + encodeURIComponent(lugar)); },
    share: function (texto) {
      if (navigator.share) navigator.share({ text: texto }).catch(function () { });
      else if (navigator.clipboard) navigator.clipboard.writeText(texto).then(function () { alert('Copiado. Ya puedes pegarlo donde quieras.'); });
    },
    openUrl: function (url) { abrir(url); }
  };

  /* ---------------- Avisos ---------------- */
  var LS_AV = 'acg.av', LS_LEIDO = 'acg.leido', LS_PUSH = 'acg.push', LS_VAPID = 'acg.vapid';

  function pushDisponible() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  var registro = null;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(function (r) { registro = r; }).catch(function () { });
  }
  function b64aBytes(b64) {
    var pad = '='.repeat((4 - b64.length % 4) % 4);
    var raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function avisarCambio() {
    if (shell) shell.updateBadge();
    if (window.ACGAv && window.ACGAv.onResume) window.ACGAv.onResume();
  }

  window.ACGAvisosNative = {
    getConfig: function () { return JSON.stringify({ configurado: !!S, fontScale: 1 }); },
    isVisible: function () { return !!(shell && shell.tab === 'avisos' && !document.hidden); },
    getCached: function () {
      var c = readJSON(ls(LS_AV));
      if (!c) return '';
      c.leido = Number(ls(LS_LEIDO) || 0);
      return JSON.stringify(c);
    },
    refresh: function () {
      getJSON(S + '?accion=lista').then(function (res) {
        if (!res.ok) throw new Error(res.error || 'SERVIDOR');
        var lista = res.avisos || [];
        if (ls(LS_LEIDO) === null) ls(LS_LEIDO, String(maxId(lista))); // primera vez: lo antiguo no cuenta como nuevo
        ls(LS_AV, JSON.stringify({ avisos: lista, savedAt: Date.now() }));
        if (shell) shell.updateBadge();
        if (window.ACGAv) window.ACGAv.onRefreshDone(true, '');
      }).catch(function (e) {
        if (window.ACGAv) window.ACGAv.onRefreshDone(false, errorTexto(e));
      });
    },
    send: function (id, json) {
      fetch(S, {
        method: 'POST', credentials: 'omit',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: json
      }).then(function (r) { return r.text(); }).then(function (texto) {
        JSON.parse(texto);
        if (window.ACGAv) window.ACGAv.onSendDone(id, true, texto);
      }).catch(function (e) {
        if (window.ACGAv) window.ACGAv.onSendDone(id, false, String(e));
      });
    },
    markRead: function (m) {
      if (m > Number(ls(LS_LEIDO) || 0)) ls(LS_LEIDO, String(m));
      if (shell) shell.updateBadge();
    },
    openUrl: function (url) { abrir(url); },

    /* El aviso «Activar notificaciones» solo aparece si el iPhone puede recibirlas y aún no están activadas. */
    notificationsEnabled: function () {
      if (!pushDisponible()) return true;
      return Notification.permission === 'granted' && ls(LS_PUSH) === '1';
    },

    /* Se llama directamente desde el toque en el botón: Safari exige que la suscripción salga de un gesto. */
    openNotificationSettings: function () {
      if (!pushDisponible()) return;
      if (Notification.permission === 'denied') {
        alert('Las notificaciones están bloqueadas. Actívalas en Ajustes › Notificaciones › ACG Rosalía.');
        return;
      }
      var clave = ls(LS_VAPID);
      if (!clave || !registro) {
        alert('La app todavía se está preparando. Espera unos segundos y vuelve a pulsar.');
        if (shell) shell.prepararPush();
        return;
      }
      registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64aBytes(clave) })
        .then(function (sub) { return shell ? shell.registrarSuscripcion(sub) : null; })
        .then(function (ok) {
          if (ok) ls(LS_PUSH, '1');
          avisarCambio();
        })
        .catch(function () {
          avisarCambio();
          if (Notification.permission !== 'granted') return;
          alert('No se pudieron activar las notificaciones. Inténtalo de nuevo más tarde.');
        });
    }
  };
})();
