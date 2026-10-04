/*
 * Lector de calendarios iCalendar (.ics) — ACG Rosalía de Castro
 * Soporta: eventos simples y de día completo, zonas horarias (TZID),
 * recurrencias (RRULE: DAILY/WEEKLY/MONTHLY/YEARLY con INTERVAL, COUNT,
 * UNTIL, BYDAY, BYMONTHDAY, BYMONTH, BYSETPOS), EXDATE y
 * modificaciones puntuales (RECURRENCE-ID), eventos cancelados.
 */
(function (global) {
  'use strict';

  var DAY = 86400000;
  var WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  // Nombres de zona de Windows/Outlook más habituales -> IANA
  var WIN_TZ = {
    'Romance Standard Time': 'Europe/Madrid',
    'W. Europe Standard Time': 'Europe/Berlin',
    'Central Europe Standard Time': 'Europe/Budapest',
    'Central European Standard Time': 'Europe/Warsaw',
    'GMT Standard Time': 'Europe/London',
    'Greenwich Standard Time': 'Atlantic/Reykjavik',
    'UTC': 'UTC'
  };

  /* ---------- Lectura de líneas y propiedades ---------- */

  function unfold(text) {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
  }

  function parseLine(line) {
    // NOMBRE;PARAM=VAL;PARAM="VAL":VALOR  (los dos puntos pueden ir entre comillas)
    var i = 0, inQuote = false, colon = -1;
    for (; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch === '"') inQuote = !inQuote;
      else if (ch === ':' && !inQuote) { colon = i; break; }
    }
    if (colon < 0) return null;
    var head = line.slice(0, colon), value = line.slice(colon + 1);
    var parts = head.split(';');
    var params = {};
    for (var p = 1; p < parts.length; p++) {
      var eq = parts[p].indexOf('=');
      if (eq > 0) params[parts[p].slice(0, eq).toUpperCase()] = parts[p].slice(eq + 1).replace(/^"|"$/g, '');
    }
    return { name: parts[0].toUpperCase(), params: params, value: value };
  }

  function unescapeText(v) {
    return v.replace(/\\([\\;,nN])/g, function (_, c) { return (c === 'n' || c === 'N') ? '\n' : c; });
  }

  /* ---------- Fechas ---------- */

  function resolveTz(tzid) {
    if (!tzid) return null;
    tzid = tzid.replace(/^\//, '');
    if (WIN_TZ[tzid]) return WIN_TZ[tzid];
    try { new Intl.DateTimeFormat('en-US', { timeZone: tzid }); return tzid; }
    catch (e) { return null; }
  }

  // Valor DATE o DATE-TIME -> {y,m,d,h,mi,s,date,tz}
  function parseDT(value, params) {
    params = params || {};
    var v = value.trim();
    var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v);
    if (!m) return null;
    var isDate = !m[4] || params.VALUE === 'DATE';
    var dt = {
      y: +m[1], m: +m[2], d: +m[3],
      h: isDate ? 0 : +m[4], mi: isDate ? 0 : +m[5], s: isDate ? 0 : +(m[6] || 0),
      date: isDate, tz: 'floating'
    };
    if (!isDate) {
      if (m[7]) dt.tz = 'UTC';
      else if (params.TZID) dt.tz = resolveTz(params.TZID) || 'floating';
    }
    return dt;
  }

  var fmtCache = {};
  function tzParts(ms, tz) {
    var f = fmtCache[tz];
    if (!f) {
      f = fmtCache[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour12: false, year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric'
      });
    }
    var o = {};
    f.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
    return Date.UTC(+o.year, +o.month - 1, +o.day, (+o.hour) % 24, +o.minute, +o.second);
  }

  // Hora "de pared" en una zona -> instante (ms)
  function zonedToMs(dt, tz) {
    var guess = Date.UTC(dt.y, dt.m - 1, dt.d, dt.h, dt.mi, dt.s);
    var ms = guess;
    for (var i = 0; i < 2; i++) {
      var diff = tzParts(ms, tz) - ms;
      ms = guess - diff;
    }
    return ms;
  }

  function dtToMs(dt) {
    if (dt.date) return new Date(dt.y, dt.m - 1, dt.d).getTime();
    if (dt.tz === 'UTC') return Date.UTC(dt.y, dt.m - 1, dt.d, dt.h, dt.mi, dt.s);
    if (dt.tz === 'floating') return new Date(dt.y, dt.m - 1, dt.d, dt.h, dt.mi, dt.s).getTime();
    try { return zonedToMs(dt, dt.tz); }
    catch (e) { return new Date(dt.y, dt.m - 1, dt.d, dt.h, dt.mi, dt.s).getTime(); }
  }

  // Aritmética de calendario civil (independiente de zona)
  function civil(y, m, d) { var t = new Date(Date.UTC(y, m - 1, d)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function civilMs(c) { return Date.UTC(c.y, c.m - 1, c.d); }
  function weekday(c) { return new Date(civilMs(c)).getUTCDay(); }
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function addDays(c, n) { return civil(c.y, c.m, c.d + n); }

  function parseDuration(v) {
    var m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec((v || '').trim());
    if (!m) return null;
    var sign = m[1] === '-' ? -1 : 1;
    var days = (+(m[2] || 0)) * 7 + (+(m[3] || 0));
    var ms = ((+(m[4] || 0)) * 3600 + (+(m[5] || 0)) * 60 + (+(m[6] || 0))) * 1000;
    return { days: sign * days, ms: sign * ms };
  }

  /* ---------- RRULE ---------- */

  function parseRRule(v) {
    var r = { FREQ: null, INTERVAL: 1 };
    v.split(';').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i < 0) return;
      var k = kv.slice(0, i).toUpperCase(), val = kv.slice(i + 1);
      switch (k) {
        case 'FREQ': r.FREQ = val.toUpperCase(); break;
        case 'INTERVAL': r.INTERVAL = Math.max(1, parseInt(val, 10) || 1); break;
        case 'COUNT': r.COUNT = parseInt(val, 10); break;
        case 'UNTIL': r.UNTIL = parseDT(val, {}); break;
        case 'BYDAY':
          r.BYDAY = val.split(',').map(function (s) {
            var mm = /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/i.exec(s.trim());
            return mm ? { n: mm[1] ? parseInt(mm[1], 10) : 0, wd: WD[mm[2].toUpperCase()] } : null;
          }).filter(Boolean);
          break;
        case 'BYMONTHDAY': r.BYMONTHDAY = val.split(',').map(function (s) { return parseInt(s, 10); }).filter(function (n) { return !isNaN(n); }); break;
        case 'BYMONTH': r.BYMONTH = val.split(',').map(function (s) { return parseInt(s, 10); }).filter(function (n) { return !isNaN(n); }); break;
        case 'BYSETPOS': r.BYSETPOS = val.split(',').map(function (s) { return parseInt(s, 10); }).filter(function (n) { return !isNaN(n); }); break;
      }
    });
    return r.FREQ ? r : null;
  }

  function monthDaysByRule(y, m, r, base) {
    var dim = daysInMonth(y, m), out = [], i, d;
    if (r.BYMONTHDAY && r.BYMONTHDAY.length) {
      r.BYMONTHDAY.forEach(function (n) {
        var dd = n > 0 ? n : dim + n + 1;
        if (dd >= 1 && dd <= dim) out.push(dd);
      });
      if (r.BYDAY && r.BYDAY.length) {
        out = out.filter(function (dd) {
          var w = weekday({ y: y, m: m, d: dd });
          return r.BYDAY.some(function (b) { return b.wd === w; });
        });
      }
    } else if (r.BYDAY && r.BYDAY.length) {
      r.BYDAY.forEach(function (b) {
        var list = [];
        for (d = 1; d <= dim; d++) if (weekday({ y: y, m: m, d: d }) === b.wd) list.push(d);
        if (!b.n) out = out.concat(list);
        else {
          i = b.n > 0 ? b.n - 1 : list.length + b.n;
          if (i >= 0 && i < list.length) out.push(list[i]);
        }
      });
    } else if (base.d <= dim) {
      out.push(base.d);
    }
    out.sort(function (a, b) { return a - b; });
    return out.filter(function (v, idx) { return idx === 0 || out[idx - 1] !== v; });
  }

  function applySetPos(list, r) {
    if (!r.BYSETPOS || !r.BYSETPOS.length || !list.length) return list;
    var res = [];
    r.BYSETPOS.forEach(function (p) {
      var i = p > 0 ? p - 1 : list.length + p;
      if (i >= 0 && i < list.length) res.push(list[i]);
    });
    res.sort(function (a, b) { return civilMs(a) - civilMs(b); });
    return res;
  }

  function candidates(r, base, k) {
    var out = [], c, i;
    if (r.FREQ === 'DAILY') {
      c = addDays(base, k * r.INTERVAL);
      if (r.BYMONTH && r.BYMONTH.indexOf(c.m) < 0) return [];
      if (r.BYDAY && r.BYDAY.length && !r.BYDAY.some(function (b) { return b.wd === weekday(c); })) return [];
      if (r.BYMONTHDAY && r.BYMONTHDAY.length) {
        var dim = daysInMonth(c.y, c.m);
        if (!r.BYMONTHDAY.some(function (n) { return (n > 0 ? n : dim + n + 1) === c.d; })) return [];
      }
      return [c];
    }
    if (r.FREQ === 'WEEKLY') {
      var bw = (weekday(base) + 6) % 7; // lunes = 0
      var monday = addDays(base, -bw + k * 7 * r.INTERVAL);
      var days = (r.BYDAY && r.BYDAY.length) ? r.BYDAY.map(function (b) { return (b.wd + 6) % 7; }) : [bw];
      days.sort(function (a, b) { return a - b; });
      for (i = 0; i < days.length; i++) {
        c = addDays(monday, days[i]);
        if (r.BYMONTH && r.BYMONTH.indexOf(c.m) < 0) continue;
        out.push(c);
      }
      return applySetPos(out, r);
    }
    if (r.FREQ === 'MONTHLY') {
      var mc = civil(base.y, base.m + k * r.INTERVAL, 1);
      if (r.BYMONTH && r.BYMONTH.indexOf(mc.m) < 0) return [];
      monthDaysByRule(mc.y, mc.m, r, base).forEach(function (d) { out.push({ y: mc.y, m: mc.m, d: d }); });
      return applySetPos(out, r);
    }
    if (r.FREQ === 'YEARLY') {
      var y = base.y + k * r.INTERVAL;
      var months = (r.BYMONTH && r.BYMONTH.length) ? r.BYMONTH.slice().sort(function (a, b) { return a - b; }) : [base.m];
      months.forEach(function (m) {
        monthDaysByRule(y, m, r, base).forEach(function (d) { out.push({ y: y, m: m, d: d }); });
      });
      return applySetPos(out, r);
    }
    return [];
  }

  function periodStart(r, base, k) {
    switch (r.FREQ) {
      case 'DAILY': return civilMs(addDays(base, k * r.INTERVAL));
      case 'WEEKLY': return civilMs(addDays(base, k * 7 * r.INTERVAL - 7));
      case 'MONTHLY': return civilMs(civil(base.y, base.m + k * r.INTERVAL, 1));
      case 'YEARLY': return Date.UTC(base.y + k * r.INTERVAL, 0, 1);
    }
    return Infinity;
  }

  /* ---------- Análisis del calendario ---------- */

  function parse(text) {
    var lines = unfold(text || '').split('\n');
    var events = [], cur = null, depth = 0, calName = '';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line) continue;
      var up = line.toUpperCase();
      if (up === 'BEGIN:VEVENT') { cur = { exdates: [] }; depth = 0; continue; }
      if (up === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
      if (!cur) {
        var top = parseLine(line);
        if (top && top.name === 'X-WR-CALNAME') calName = unescapeText(top.value);
        continue;
      }
      if (up.indexOf('BEGIN:') === 0) { depth++; continue; }   // VALARM, etc.
      if (up.indexOf('END:') === 0) { depth--; continue; }
      if (depth > 0) continue;
      var p = parseLine(line);
      if (!p) continue;
      switch (p.name) {
        case 'UID': cur.uid = p.value; break;
        case 'SUMMARY': cur.summary = unescapeText(p.value); break;
        case 'DESCRIPTION': cur.description = unescapeText(p.value); break;
        case 'LOCATION': cur.location = unescapeText(p.value); break;
        case 'URL': cur.url = p.value; break;
        case 'STATUS': cur.status = p.value.toUpperCase(); break;
        case 'DTSTART': cur.start = parseDT(p.value, p.params); break;
        case 'DTEND': cur.end = parseDT(p.value, p.params); break;
        case 'DURATION': cur.duration = parseDuration(p.value); break;
        case 'RRULE': cur.rrule = parseRRule(p.value); break;
        case 'RECURRENCE-ID': cur.recurrenceId = parseDT(p.value, p.params); break;
        case 'EXDATE':
          p.value.split(',').forEach(function (v) {
            var d = parseDT(v, p.params);
            if (d) cur.exdates.push(dtToMs(d));
          });
          break;
      }
    }

    events = events.filter(function (e) { return e.start; });
    events.forEach(function (e) {
      e.allDay = !!e.start.date;
      e.startMs = dtToMs(e.start);
      if (e.allDay) {
        var days = 1;
        if (e.end && e.end.date) days = Math.max(1, Math.round((civilMs(e.end) - civilMs(e.start)) / DAY));
        else if (e.duration) days = Math.max(1, e.duration.days || 1);
        e.durDays = days;
      } else {
        var dur = 0;
        if (e.end) dur = dtToMs(e.end) - e.startMs;
        else if (e.duration) dur = e.duration.days * DAY + e.duration.ms;
        e.durMs = Math.max(0, dur);
      }
      e.summary = (e.summary || '').trim() || 'Actividad';
      e.location = (e.location || '').trim();
      e.description = (e.description || '').trim();
    });

    // Modificaciones puntuales de eventos repetidos
    var overrides = {};
    events.forEach(function (e) {
      if (e.recurrenceId && e.uid) {
        (overrides[e.uid] = overrides[e.uid] || []).push(dtToMs(e.recurrenceId));
      }
    });

    return { name: calName, events: events, overrides: overrides };
  }

  function makeOcc(e, startMs, c) {
    var o = {
      ev: e, allDay: e.allDay, title: e.summary, location: e.location,
      description: e.description, url: e.url || ''
    };
    if (e.allDay) {
      var sc = c || { y: e.start.y, m: e.start.m, d: e.start.d };
      o.startMs = new Date(sc.y, sc.m - 1, sc.d).getTime();
      var ec = addDays(sc, e.durDays);
      o.endMs = new Date(ec.y, ec.m - 1, ec.d).getTime(); // exclusivo
      o.startDate = sc; o.days = e.durDays;
    } else {
      o.startMs = startMs; o.endMs = startMs + e.durMs;
    }
    o.id = (e.uid || e.summary) + '@' + o.startMs;
    return o;
  }

  // Ocurrencias que se solapan con [fromMs, toMs)
  function occurrences(cal, fromMs, toMs) {
    var out = [];
    cal.events.forEach(function (e) {
      if (e.status === 'CANCELLED') return;
      if (!e.rrule) {
        var o = makeOcc(e, e.startMs);
        if (o.endMs > fromMs && o.startMs < toMs) out.push(o);
        else if (o.endMs === o.startMs && o.startMs >= fromMs && o.startMs < toMs) out.push(o);
        return;
      }
      var r = e.rrule, base = { y: e.start.y, m: e.start.m, d: e.start.d };
      var baseKey = civilMs(base);
      var until = r.UNTIL ? (r.UNTIL.date ? dtToMs(r.UNTIL) + DAY - 1 : dtToMs(r.UNTIL)) : Infinity;
      var skip = (e.uid && cal.overrides[e.uid]) || [];
      var count = 0, limitMs = toMs + 400 * DAY;
      var span = e.allDay ? e.durDays * DAY : e.durMs;
      for (var k = 0; k < 40000; k++) {
        if (periodStart(r, base, k) > limitMs) break;
        var list = candidates(r, base, k);
        for (var j = 0; j < list.length; j++) {
          var c = list[j];
          if (civilMs(c) < baseKey) continue;
          var wall = { y: c.y, m: c.m, d: c.d, h: e.start.h, mi: e.start.mi, s: e.start.s, date: e.start.date, tz: e.start.tz };
          var ms = dtToMs(wall);
          if (ms > until) return;
          count++;
          if (r.COUNT && count > r.COUNT) return;
          if (ms >= toMs) return;
          if (e.exdates.indexOf(ms) >= 0 || skip.indexOf(ms) >= 0) continue;
          if (ms + span > fromMs || (span === 0 && ms >= fromMs)) out.push(makeOcc(e, ms, c));
        }
      }
    });
    out.sort(function (a, b) {
      return (a.startMs - b.startMs) || ((b.allDay ? 1 : 0) - (a.allDay ? 1 : 0)) || a.title.localeCompare(b.title);
    });
    return out;
  }

  global.ICS = { parse: parse, occurrences: occurrences, _parseDT: parseDT, _dtToMs: dtToMs };
})(window);
