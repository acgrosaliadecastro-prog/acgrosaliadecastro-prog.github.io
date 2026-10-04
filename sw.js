/* Service worker: funcionamiento sin conexión y notificaciones de avisos */
importScripts('config.js');
var VERSION = 'acg-web-f509f3594a';
var ARCHIVOS = ["./", "avisos/avisos.css", "avisos/avisos.js", "avisos/index.html", "bridge.js", "calendar/app.js", "calendar/fonts/alegreya-latin-500-italic.woff2", "calendar/fonts/alegreya-latin-500-normal.woff2", "calendar/fonts/alegreya-latin-700-normal.woff2", "calendar/fonts/alegreya-latin-ext-500-italic.woff2", "calendar/fonts/alegreya-latin-ext-500-normal.woff2", "calendar/fonts/alegreya-latin-ext-700-normal.woff2", "calendar/fonts/alegreya-sans-latin-400-normal.woff2", "calendar/fonts/alegreya-sans-latin-500-normal.woff2", "calendar/fonts/alegreya-sans-latin-700-normal.woff2", "calendar/fonts/alegreya-sans-latin-ext-400-normal.woff2", "calendar/fonts/alegreya-sans-latin-ext-500-normal.woff2", "calendar/fonts/alegreya-sans-latin-ext-700-normal.woff2", "calendar/ics.js", "calendar/index.html", "calendar/style.css", "config.js", "icons/apple-touch-icon.png", "icons/badge-96.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "index.html", "manifest.webmanifest", "shell.css", "shell.js"];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    // cache: 'reload' para no rellenar la versión nueva con archivos viejos de la caché del navegador
    return c.addAll(ARCHIVOS.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.filter(function (k) { return k !== VERSION && k !== 'acg-estado'; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Archivos de la app: se sirven al momento desde la copia y se actualizan por detrás
self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (copia) {
      var red = fetch(req, { cache: 'no-cache' }).then(function (res) {
        if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
        return res;
      }).catch(function () { return copia; });
      if (copia) { e.waitUntil(red.catch(function () { })); return copia; }
      return red;
    });
  }));
});

// Llega un aviso: se pide el último al servidor y se muestra (Safari exige mostrar siempre algo)
self.addEventListener('push', function (e) {
  e.waitUntil(mostrarUltimoAviso());
});

function leerEstado() {
  return caches.open('acg-estado').then(function (c) { return c.match('estado'); })
    .then(function (r) { return r ? r.json() : {}; }).catch(function () { return {}; });
}

function mostrarUltimoAviso() {
  var titulo = 'Nuevo aviso', cuerpo = 'Hay un aviso nuevo de la ACG Rosalía de Castro.', etiqueta = 'aviso';
  var servidor = (self.ACG_CONFIG || {}).servidor;
  // Si el servidor tarda, se muestra un aviso genérico: iOS exige enseñar algo enseguida
  var control = self.AbortController ? new AbortController() : null;
  var reloj = setTimeout(function () { if (control) control.abort(); }, 7000);
  return fetch(servidor + '?accion=lista&_=' + Date.now(), { credentials: 'omit', signal: control ? control.signal : undefined })
    .then(function (r) { clearTimeout(reloj); return r.json(); })
    .then(function (res) {
      var lista = (res && res.avisos) || [];
      var a = lista[0];
      if (a) {
        titulo = a.titulo || titulo;
        cuerpo = a.texto ? String(a.texto).slice(0, 300) : 'Nuevo aviso de la ACG Rosalía de Castro';
        etiqueta = 'aviso-' + a.id;
      }
      return leerEstado().then(function (est) {
        var n = lista.filter(function (x) { return x.id > (est.leido || 0); }).length;
        if (n && self.navigator && self.navigator.setAppBadge) return self.navigator.setAppBadge(n).catch(function () { });
      });
    })
    .catch(function () { })
    .then(function () {
      return self.registration.showNotification(titulo, {
        body: cuerpo, tag: etiqueta, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
        data: { url: './?tab=avisos' }
      });
    });
}

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
    var principal = lista.filter(function (c) { return c.frameType !== 'nested'; })[0];
    if (principal) {
      principal.postMessage({ tab: 'avisos' });
      return principal.focus();
    }
    return self.clients.openWindow('./?tab=avisos');
  }));
});
