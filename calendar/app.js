/* Calendario de actividades — ACG Rosalía de Castro */
(function () {
  'use strict';

  var DAY = 86400000;
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
  var WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  var ICON = {
    clock: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M513-492v-171q0-13-8.5-21.5T483-693q-13 0-21.5 8.5T453-663v183q0 6 2 11t6 10l144 149q9 10 22.5 9.5T650-310q9-9 9-22t-9-22L513-492ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-82 31.5-155t86-127.5Q252-817 325-848.5T480-880q82 0 155 31.5t127.5 86Q817-708 848.5-635T880-480q0 82-31.5 155t-86 127.5Q708-143 635-111.5T480-80Zm0-400Zm0 340q140 0 240-100t100-240q0-140-100-240T480-820q-140 0-240 100T140-480q0 140 100 240t240 100Z"/></svg>',
    pin: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-159q133-121 196.5-219.5T740-552q0-118-75.5-193T480-820q-109 0-184.5 75T220-552q0 75 65 173.5T480-159Zm-21.5 55.5Q448-107 440-115q-42-38-91-87.5T258-309q-42-57-70-119t-28-124q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 62-28 124t-70 119q-42 57-91 106.5T520-115q-8 8-18.5 11.5T480-100q-11 0-21.5-3.5ZM480-552Zm.06 72Q510-480 531-501.06q21-21.05 21-51Q552-582 530.94-603q-21.05-21-51-21Q450-624 429-602.94q-21 21.05-21 51Q408-522 429.06-501q21.05 21 51 21Z"/></svg>',
    cal: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M180-80q-24 0-42-18t-18-42v-620q0-24 18-42t42-18h65v-28q0-13.6 9-22.8 9-9.2 23.02-9.2t23.5 9.2Q310-861.6 310-848v28h340v-28q0-13.6 9-22.8 9-9.2 23.02-9.2t23.5 9.2Q715-861.6 715-848v28h65q24 0 42 18t18 42v620q0 24-18 42t-42 18H180Zm0-60h600v-430H180v430Zm0-490h600v-130H180v130Zm0 0v-130 130Z"/></svg>',
    add: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M700-200h-90q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h90v-90q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v90h90q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5h-90v90q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-90Zm-520 80q-24 0-42-18t-18-42v-560q0-24 18-42t42-18h65v-30q0-13 9-21.5t22-8.5q14 0 23 8.5t9 21.5v30h260v-30q0-13 9-21.5t22-8.5q14 0 23 8.5t9 21.5v30h65q24 0 42 18t18 42v236q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-46H180v390h330q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H180Zm0-500h520v-110H180v110Zm0 0v-110 110Z"/></svg>',
    directions: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M380-490h184v49q0 10.5 9.5 14.25T590-430l69-69q9-9.27 9-21.64 0-12.36-9-21.36l-69-69q-7-7-16.5-3.25T564-600v50H350q-12.75 0-21.37 8.62Q320-532.75 320-520v130q0 12.75 8.68 21.37 8.67 8.63 21.5 8.63 12.82 0 21.32-8.63 8.5-8.62 8.5-21.37v-100ZM480-62q-11.48 0-22.74-4Q446-70 438-78L78-438q-8-8-12-19.26T62-480q0-11.48 4-22.74Q70-514 78-522l360-360q8-8 19.26-12t22.74-4q11.48 0 22.74 4Q514-890 522-882l360 360q8 8 12 19.26t4 22.74q0 11.48-4 22.74Q890-446 882-438L522-78q-8 8-19.26 12T480-62ZM320-320l160 160 320-320-320-320-320 320 160 160Zm160-160Z"/></svg>',
    share: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M686-80q-47.5 0-80.75-33.25T572-194q0-8 5-34L278-403q-16.28 17.34-37.64 27.17Q219-366 194-366q-47.5 0-80.75-33T80-480q0-48 33.25-81T194-594q24 0 45 9.3 21 9.29 37 25.7l301-173q-2-8-3.5-16.5T572-766q0-47.5 33.25-80.75T686-880q47.5 0 80.75 33.25T800-766q0 47.5-33.25 80.75T686-652q-23.27 0-43.64-9Q622-670 606-685L302-516q3 8 4.5 17.5t1.5 18q0 8.5-1 16t-3 15.5l303 173q16-15 36.09-23.5 20.1-8.5 43.07-8.5Q734-308 767-274.75T800-194q0 47.5-33.25 80.75T686-80Zm.04-60q22.96 0 38.46-15.54 15.5-15.53 15.5-38.5 0-22.96-15.54-38.46-15.53-15.5-38.5-15.5-22.96 0-38.46 15.54-15.5 15.53-15.5 38.5 0 22.96 15.54 38.46 15.53 15.5 38.5 15.5Zm-492-286q22.96 0 38.46-15.54 15.5-15.53 15.5-38.5 0-22.96-15.54-38.46-15.53-15.5-38.5-15.5-22.96 0-38.46 15.54-15.5 15.53-15.5 38.5 0 22.96 15.54 38.46 15.53 15.5 38.5 15.5Zm492-286q22.96 0 38.46-15.54 15.5-15.53 15.5-38.5 0-22.96-15.54-38.46-15.53-15.5-38.5-15.5-22.96 0-38.46 15.54-15.5 15.53-15.5 38.5 0 22.96 15.54 38.46 15.53 15.5 38.5 15.5Zm-.04 498ZM194-480Zm492-286Z"/></svg>',
    chevron: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M530-481 353-658q-9-9-8.5-21t9.5-21q9-9 21.5-9t21.5 9l198 198q5 5 7 10t2 11q0 6-2 11t-7 10L396-261q-9 9-21 8.5t-21-9.5q-9-9-9-21.5t9-21.5l176-176Z"/></svg>',
    refresh: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-160q-133 0-226.5-93.5T160-480q0-133 93.5-226.5T480-800q85 0 149 34.5T740-671v-99q0-13 8.5-21.5T770-800q13 0 21.5 8.5T800-770v194q0 13-8.5 21.5T770-546H576q-13 0-21.5-8.5T546-576q0-13 8.5-21.5T576-606h138q-38-60-97-97t-137-37q-109 0-184.5 75.5T220-480q0 109 75.5 184.5T480-220q75 0 140-39.5T717-367q6-11 17-16.5t23-1.5q13 4 18.5 16t-.5 23q-41 85-121 135.5T480-160Z"/></svg>'
  };

  /* ---------- Puente con la app Android ---------- */
  var N = window.ACGNative || null;
  function call(name) {
    if (!N || typeof N[name] !== 'function') return null;
    try { return N[name].apply(N, Array.prototype.slice.call(arguments, 1)); } catch (e) { return null; }
  }
  function readJSON(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }

  var config = readJSON(call('getConfig')) || { icsUrl: '' };

  // Letra grande del sistema: se amplía toda la pantalla de forma proporcional
  (function () {
    var z = Math.min(1.3, Math.max(1, +config.fontScale || 1));
    if (z > 1.01) {
      document.documentElement.style.setProperty('--z', String(z));
      document.body.style.zoom = String(z);
    }
  })();

  /* ---------- Estado ---------- */
  var today0 = startOfDay(Date.now());
  var state = {
    cal: null,
    savedAt: 0,
    phase: config.icsUrl ? 'loading' : 'pending', // pending | loading | ok | error
    lastError: '',
    y: new Date().getFullYear(),
    m: new Date().getMonth(),           // 0-11
    sel: null,                          // ms del día seleccionado
    occCache: {}
  };
  var listOcc = [];
  var openOcc = null;

  /* ---------- Utilidades ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function txt(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; e.textContent = text; return e; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function startOfDay(ms) { var d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  function addDaysMs(ms, n) { var d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime(); }
  function hhmm(ms) { var d = new Date(ms); return d.getHours() + ':' + pad(d.getMinutes()); }
  function dayLong(ms, withYear) {
    var d = new Date(ms);
    var s = WEEKDAYS[d.getDay()] + ', ' + d.getDate() + ' de ' + MONTHS[d.getMonth()];
    if (withYear) s += ' de ' + d.getFullYear();
    return cap(s);
  }
  function dayShort(ms) { var d = new Date(ms); return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()]; }

  function lastDayMs(o) { return o.allDay ? addDaysMs(o.startMs, Math.max(1, o.days) - 1) : startOfDay(Math.max(o.startMs, o.endMs - 1)); }
  function isMultiDay(o) { return startOfDay(o.startMs) !== lastDayMs(o); }

  function timeLine(o) {
    if (o.allDay) return isMultiDay(o) ? 'Hasta el ' + dayShort(lastDayMs(o)) : 'Todo el día';
    if (isMultiDay(o)) return hhmm(o.startMs) + ', hasta el ' + dayShort(o.endMs) + ' a las ' + hhmm(o.endMs);
    if (o.endMs > o.startMs) return hhmm(o.startMs) + ' – ' + hhmm(o.endMs);
    return 'A las ' + hhmm(o.startMs);
  }

  function relLabel(o, now) {
    if (o.startMs <= now && o.endMs > now) return { t: 'Ahora', now: true };
    var diff = Math.round((startOfDay(o.startMs) - startOfDay(now)) / DAY);
    if (diff <= 0) return { t: 'Hoy', now: true };
    if (diff === 1) return { t: 'Mañana' };
    if (diff < 7) return { t: 'Dentro de ' + diff + ' días' };
    return null;
  }

  // El servidor respondió (enlace no público o eliminado) frente a falta de internet
  function serverError() { return /^(HTTP 4\d\d|FORMATO)/.test(state.lastError || ''); }

  function occBetween(from, to) {
    if (!state.cal) return [];
    var key = from + ':' + to;
    if (!state.occCache[key]) state.occCache[key] = ICS.occurrences(state.cal, from, to);
    return state.occCache[key];
  }

  function cleanDescription(desc) {
    if (!desc) return '';
    if (/<\/?[a-z][^>]*>/i.test(desc)) {
      var html = desc.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n');
      var doc = new DOMParser().parseFromString(html, 'text/html');
      Array.prototype.forEach.call(doc.querySelectorAll('a[href]'), function (a) {
        var href = a.getAttribute('href') || '';
        var t = (a.textContent || '').trim();
        if (/^https?:/i.test(href) && t !== href) a.textContent = t + ' (' + href + ')';
      });
      Array.prototype.forEach.call(doc.querySelectorAll('li'), function (li) { li.insertBefore(doc.createTextNode('• '), li.firstChild); });
      desc = doc.body ? doc.body.textContent : desc;
    }
    return desc.replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  function linkify(container, text) {
    var re = /(https?:\/\/[^\s<>"')]+[^\s<>"').,;:!?])/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) container.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement('a');
      a.href = '#'; a.textContent = m[1];
      (function (url) { a.addEventListener('click', function (ev) { ev.preventDefault(); openUrl(url); }); })(m[1]);
      container.appendChild(a);
      last = m.index + m[1].length;
    }
    if (last < text.length) container.appendChild(document.createTextNode(text.slice(last)));
  }

  function openUrl(url) {
    if (call('openUrl', url) === null && !N) window.open(url, '_blank');
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- Carga de datos ---------- */
  function loadCached() {
    var c = readJSON(call('getCached'));
    if (c && c.ics) {
      try {
        state.cal = ICS.parse(c.ics);
        state.savedAt = c.savedAt || 0;
        state.occCache = {};
        return true;
      } catch (e) { /* se ignora una copia dañada */ }
    }
    return false;
  }

  function refresh() {
    if (!config.icsUrl) { state.phase = 'pending'; render(); return; }
    if (!state.cal) { state.phase = 'loading'; renderHero(); }
    renderStatus(true);
    if (call('refresh') === null && !N) { // sin app: modo de prueba
      onRefreshDone(false, 'Sin conexión con la app');
    }
  }

  function onRefreshDone(ok, err) {
    today0 = startOfDay(Date.now());
    if (ok && loadCached()) { state.phase = 'ok'; state.lastError = ''; }
    else { state.lastError = err || 'error'; state.phase = state.cal ? 'ok' : 'error'; }
    render();
  }

  /* ---------- Pintado ---------- */
  function render() {
    renderHero();
    renderMonth();
    renderList();
    renderStatus(false);
  }

  function renderHero() {
    var h = $('hero');
    h.className = 'hero';
    h.innerHTML = '';
    if (state.phase === 'pending') {
      h.classList.add('quiet');
      h.appendChild(txt('p', 'kicker', 'Calendario de la asociación'));
      h.appendChild(txt('h1', '', 'Calendario en preparación'));
      h.appendChild(txt('p', '', 'Muy pronto verás aquí las actividades de la ACG Rosalía de Castro.'));
      return;
    }
    if (state.phase === 'loading' && !state.cal) {
      h.classList.add('quiet', 'loading');
      h.appendChild(txt('p', 'kicker', 'Próxima actividad'));
      h.appendChild(txt('h1', '', 'Cargando actividades…'));
      return;
    }
    if (state.phase === 'error' && !state.cal) {
      h.classList.add('quiet');
      if (serverError()) {
        h.appendChild(txt('p', 'kicker', 'Calendario no disponible'));
        h.appendChild(txt('h1', '', 'El calendario todavía no está publicado'));
        h.appendChild(txt('p', '', 'La asociación aún no lo ha hecho público. Vuelve a intentarlo más tarde.'));
      } else {
        h.appendChild(txt('p', 'kicker', 'Sin conexión'));
        h.appendChild(txt('h1', '', 'No se pudo cargar el calendario'));
        h.appendChild(txt('p', '', 'Comprueba que el móvil tiene internet y vuelve a intentarlo.'));
      }
      var b = el('button', 'btn', ICON.refresh + '<span>Reintentar</span>');
      b.addEventListener('click', refresh);
      h.appendChild(b);
      return;
    }
    var now = Date.now();
    var next = occBetween(today0, addDaysMs(today0, 400)).filter(function (o) { return o.endMs > now || (o.endMs === o.startMs && o.startMs >= today0 && startOfDay(o.startMs) === today0); })[0];
    if (!next) {
      h.classList.add('quiet');
      h.appendChild(txt('p', 'kicker', 'Próxima actividad'));
      h.appendChild(txt('h1', '', 'No hay actividades próximas'));
      h.appendChild(txt('p', '', 'Cuando la asociación publique nuevas actividades, aparecerán aquí.'));
      return;
    }
    var k = el('p', 'kicker');
    k.appendChild(txt('span', '', 'Próxima actividad'));
    var rel = relLabel(next, now);
    if (rel) k.appendChild(txt('span', 'when-chip' + (rel.now ? ' now' : ''), rel.t));
    h.appendChild(k);
    h.appendChild(txt('h1', '', next.title));
    var facts = el('ul', 'facts');
    var f1 = el('li', '', ICON.cal); f1.appendChild(txt('span', '', dayLong(next.startMs))); facts.appendChild(f1);
    var f2 = el('li', '', ICON.clock); f2.appendChild(txt('span', '', timeLine(next))); facts.appendChild(f2);
    if (next.location) { var f3 = el('li', '', ICON.pin); f3.appendChild(txt('span', '', next.location)); facts.appendChild(f3); }
    h.appendChild(facts);
    var open = el('button', 'open', '<span>Ver detalles</span>' + ICON.chevron);
    open.addEventListener('click', function () { openSheet(next); });
    h.appendChild(open);
  }

  function renderMonth() {
    $('monthTitle').textContent = cap(MONTHS[state.m]) + ' ' + state.y;
    var now = new Date();
    $('todayBtn').hidden = (state.y === now.getFullYear() && state.m === now.getMonth());

    var first = new Date(state.y, state.m, 1).getTime();
    var next = new Date(state.y, state.m + 1, 1).getTime();
    var occ = occBetween(first, next);
    var marks = {};
    occ.forEach(function (o) {
      var a = Math.max(startOfDay(o.startMs), first), b = lastDayMs(o), multi = isMultiDay(o);
      for (var d = a; d <= b && d < next; d = addDaysMs(d, 1)) {
        marks[d] = marks[d] || { n: 0, multi: false };
        marks[d].n++; if (multi) marks[d].multi = true;
      }
    });

    var grid = $('grid');
    grid.innerHTML = '';
    var lead = (new Date(first).getDay() + 6) % 7;
    for (var i = 0; i < lead; i++) grid.appendChild(el('span', 'day blank'));
    var dim = new Date(state.y, state.m + 1, 0).getDate();
    for (var d = 1; d <= dim; d++) {
      var ms = new Date(state.y, state.m, d).getTime();
      var b = el('button', 'day');
      b.setAttribute('role', 'gridcell');
      var n = txt('span', 'n', String(d)); b.appendChild(n);
      var mk = marks[ms];
      if (mk) { b.classList.add('has'); if (mk.multi) b.classList.add('multi'); }
      if (ms === today0) b.classList.add('today');
      if (ms < today0) b.classList.add('past');
      if (state.sel === ms) b.classList.add('sel');
      var label = dayLong(ms) + (mk ? ', ' + mk.n + (mk.n === 1 ? ' actividad' : ' actividades') : '');
      b.setAttribute('aria-label', label);
      (function (dayMs) {
        b.addEventListener('click', function () {
          state.sel = (state.sel === dayMs) ? null : dayMs;
          renderMonth(); renderList();
        });
      })(ms);
      grid.appendChild(b);
    }
  }

  function renderList() {
    var first = new Date(state.y, state.m, 1).getTime();
    var next = new Date(state.y, state.m + 1, 1).getTime();
    var from = first, to = next;
    var title = 'Actividades de ' + MONTHS[state.m];
    if (state.sel != null) { from = state.sel; to = addDaysMs(state.sel, 1); title = dayLong(state.sel); }
    $('listTitle').textContent = title;
    $('showMonth').hidden = state.sel == null;
    document.querySelector('.agenda').hidden = !state.cal && state.phase !== 'pending';

    listOcc = state.cal ? occBetween(from, to) : [];
    var ol = $('events');
    ol.innerHTML = '';
    var now = Date.now();
    listOcc.forEach(function (o) {
      var li = el('li');
      var b = el('button', 'event');
      var past = o.endMs > o.startMs ? o.endMs <= now : startOfDay(o.startMs) < today0;
      if (past) b.classList.add('past');
      // En listas de un día, el azulejo muestra ese día; si no, el día de inicio
      var tileDay = (state.sel != null && o.startMs < state.sel) ? state.sel : (o.startMs < first ? first : o.startMs);
      if (startOfDay(tileDay) === today0) b.classList.add('is-today');
      var td = new Date(tileDay);
      var tile = el('div', 'tile');
      tile.appendChild(txt('span', 'dnum', String(td.getDate())));
      tile.appendChild(txt('span', 'dwk', WEEKDAYS_SHORT[td.getDay()]));
      b.appendChild(tile);
      var info = el('div', 'info');
      info.appendChild(txt('h4', '', o.title));
      var l1 = el('p', 'line', ICON.clock); l1.appendChild(txt('span', '', timeLine(o))); info.appendChild(l1);
      if (o.location) { var l2 = el('p', 'line', ICON.pin); l2.appendChild(txt('span', '', o.location)); info.appendChild(l2); }
      if (past) info.appendChild(txt('p', 'done', 'Ya celebrada'));
      b.appendChild(info);
      b.addEventListener('click', function () { openSheet(o); });
      li.appendChild(b);
      ol.appendChild(li);
    });

    var empty = $('empty');
    if (listOcc.length) { empty.hidden = true; }
    else {
      empty.hidden = false;
      if (state.phase === 'pending') empty.textContent = 'Todavía no hay actividades publicadas.';
      else if (!state.cal) empty.textContent = '';
      else empty.textContent = state.sel != null ? 'No hay actividades este día.' : 'No hay actividades este mes.';
      if (!empty.textContent) empty.hidden = true;
    }
  }

  function renderStatus(busy) {
    var s = $('status');
    s.className = 'status';
    s.innerHTML = '';
    if (state.phase === 'pending') return;
    if (busy) { s.appendChild(txt('span', '', 'Actualizando…')); return; }
    if (!state.savedAt) return;
    var saved = new Date(state.savedAt);
    var when = (startOfDay(state.savedAt) === today0 ? 'hoy' : 'el ' + saved.getDate() + ' de ' + MONTHS[saved.getMonth()]) + ' a las ' + hhmm(state.savedAt);
    if (state.lastError) {
      s.classList.add('warn');
      s.appendChild(txt('span', '', (serverError() ? 'No se pudo actualizar el calendario.' : 'Sin conexión.') + ' Se muestran las actividades guardadas ' + when + '.'));
    } else {
      s.appendChild(txt('span', '', 'Actualizado ' + when));
    }
  }

  /* ---------- Ficha ---------- */
  function row(icon, strong, sub) {
    var r = el('div', 'row', icon);
    var t = el('div', 't');
    t.appendChild(txt('strong', '', strong));
    if (sub) t.appendChild(txt('span', '', sub));
    r.appendChild(t);
    return r;
  }

  function whenRows(o) {
    if (o.allDay) {
      if (!isMultiDay(o)) return [dayLong(o.startMs, true), 'Todo el día'];
      return ['Del ' + dayLong(o.startMs).toLowerCase(), 'al ' + dayLong(lastDayMs(o), true).toLowerCase()];
    }
    if (isMultiDay(o)) return [dayLong(o.startMs, true) + ', ' + hhmm(o.startMs), 'Hasta el ' + dayLong(o.endMs).toLowerCase() + ', ' + hhmm(o.endMs)];
    return [dayLong(o.startMs, true), o.endMs > o.startMs ? 'De ' + hhmm(o.startMs) + ' a ' + hhmm(o.endMs) : 'A las ' + hhmm(o.startMs)];
  }

  function openSheet(o) {
    openOcc = o;
    $('sheetTitle').textContent = o.title;
    var body = $('sheetBody');
    body.innerHTML = '';
    var w = whenRows(o);
    body.appendChild(row(ICON.cal, w[0], w[1]));
    if (o.location) body.appendChild(row(ICON.pin, o.location, ''));
    var desc = cleanDescription(o.description);
    if (desc) { var p = el('p', 'desc'); linkify(p, desc); body.appendChild(p); }
    if (o.url && /^https?:/i.test(o.url)) {
      var lp = el('p', 'desc'); linkify(lp, o.url); body.appendChild(lp);
    }

    var act = $('sheetActions');
    act.innerHTML = '';
    var now = Date.now();
    var isPast = o.endMs > o.startMs ? o.endMs <= now : startOfDay(o.startMs) < today0;
    if (!isPast) {
      var add = el('button', 'btn wide', ICON.add + '<span>Añadir a mi calendario</span>');
      add.addEventListener('click', function () { addToCalendar(o); });
      act.appendChild(add);
    }
    if (o.location) {
      var go = el('button', 'btn secondary', ICON.directions + '<span>Cómo llegar</span>');
      go.addEventListener('click', function () { if (call('openMap', o.location) === null && !N) toast('Abriría el mapa'); });
      act.appendChild(go);
    }
    var sh = el('button', 'btn secondary' + (o.location ? '' : ' wide'), ICON.share + '<span>Compartir</span>');
    sh.addEventListener('click', function () { shareOcc(o); });
    act.appendChild(sh);

    var bd = $('backdrop');
    bd.hidden = false;
    $('sheet').scrollTop = 0;
    setTimeout(function () { $('sheetClose').focus({ preventScroll: true }); }, 50);
  }

  function closeSheet() {
    if ($('backdrop').hidden) return false;
    $('backdrop').hidden = true;
    openOcc = null;
    return true;
  }

  function addToCalendar(o) {
    var begin, end;
    if (o.allDay) {
      // Mediodía local: el calendario del móvil lo interpreta siempre como el mismo día
      begin = o.startMs + 12 * 3600000;
      end = lastDayMs(o) + 12 * 3600000;
    } else {
      begin = o.startMs;
      end = o.endMs > o.startMs ? o.endMs : o.startMs + 3600000;
    }
    var desc = cleanDescription(o.description);
    if (call('addToCalendar', o.title, begin, end, !!o.allDay, o.location || '', desc) === null && !N) toast('Se abriría el calendario del móvil');
  }

  function shareOcc(o) {
    var w = whenRows(o);
    var lines = [o.title, w[0] + (w[1] ? ' · ' + w[1] : '')];
    if (o.location) lines.push(o.location);
    lines.push('', 'ACG Rosalía de Castro');
    if (call('share', lines.join('\n')) === null && !N) toast('Se abriría el menú de compartir');
  }

  /* ---------- Navegación ---------- */
  function goMonth(delta) {
    var d = new Date(state.y, state.m + delta, 1);
    state.y = d.getFullYear(); state.m = d.getMonth(); state.sel = null;
    renderMonth(); renderList();
  }
  function goToday() {
    var d = new Date();
    state.y = d.getFullYear(); state.m = d.getMonth(); state.sel = null;
    renderMonth(); renderList();
  }

  $('prevMonth').addEventListener('click', function () { goMonth(-1); });
  $('nextMonth').addEventListener('click', function () { goMonth(1); });
  $('todayBtn').addEventListener('click', goToday);
  $('showMonth').addEventListener('click', function () { state.sel = null; renderMonth(); renderList(); });
  $('sheetClose').addEventListener('click', closeSheet);
  $('backdrop').addEventListener('click', function (e) { if (e.target === this) closeSheet(); });

  // Deslizar el mes con el dedo
  (function () {
    var sx = 0, sy = 0, on = false, m = $('month');
    m.addEventListener('touchstart', function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; on = true; }, { passive: true });
    m.addEventListener('touchend', function (e) {
      if (!on) return; on = false;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goMonth(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  /* ---------- API para la app ---------- */
  window.ACG = {
    refresh: refresh,
    onRefreshDone: onRefreshDone,
    handleBack: function () { return closeSheet(); },
    onResume: function () {
      var t = startOfDay(Date.now());
      if (t !== today0) { today0 = t; state.occCache = {}; render(); }
      if (config.icsUrl && Date.now() - state.savedAt > 30 * 60000) refresh();
    }
  };

  /* ---------- Arranque ---------- */
  if (config.icsUrl && loadCached()) state.phase = 'ok';
  render();
  if (config.icsUrl) refresh();
})();
