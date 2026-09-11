// Playground telemetry — privacy-first, anonymous, aggregate-only usage
// insights for the whole platform (hub + every game). It posts small custom
// events straight to Azure Application Insights' ingestion endpoint.

const IKEY = '4309a9dd-3e2a-4d77-bd61-f385d84f33a9';
const ENDPOINT = 'https://westeurope-5.in.applicationinsights.azure.com/v2/track';

function role() {
  try {
    const seg = location.pathname.split('/').filter(Boolean)[0] || 'root';
    return seg === 'playground' ? 'hub' : seg;
  } catch { return 'root'; }
}

function optedOut() {
  try { if (localStorage.getItem('telemetry') === 'off') return true; } catch {}
  const win = typeof window !== 'undefined' ? window : null;
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const dnt = nav.doNotTrack || (win && win.doNotTrack) || nav.msDoNotTrack;
  if (dnt === '1' || dnt === 'yes') return true;
  if (nav.globalPrivacyControl === true) return true;
  return false;
}

function rand() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function sessionId() {
  try {
    let id = sessionStorage.getItem('pg_sid');
    if (!id) { id = rand(); sessionStorage.setItem('pg_sid', id); }
    return id;
  } catch { return rand(); }
}

function lang() {
  try { return document.documentElement.lang || localStorage.getItem('lang') || 'en'; }
  catch { return 'en'; }
}

function displayMode() {
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
    if (navigator.standalone) return 'standalone';
  } catch {}
  return 'browser';
}

function envelope(name, properties, measurements) {
  return {
    name: 'Microsoft.ApplicationInsights.Event',
    time: new Date().toISOString(),
    iKey: IKEY,
    tags: {
      'ai.cloud.role': role(),
      'ai.session.id': sessionId(),
      'ai.device.type': 'Browser',
      'ai.operation.name': name,
    },
    data: {
      baseType: 'EventData',
      baseData: {
        ver: 2,
        name,
        properties: properties || {},
        measurements: measurements || {},
      },
    },
  };
}

export function track(name, properties, measurements) {
  if (optedOut()) return;
  try {
    const body = JSON.stringify(envelope(name, properties, measurements));
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(ENDPOINT, {
        method: 'POST', body, keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {});
    }
  } catch {}
}

function durationBucket(ms) {
  const s = ms / 1000;
  if (s < 10) return '0-10s';
  if (s < 30) return '10-30s';
  if (s < 60) return '30-60s';
  if (s < 180) return '1-3m';
  if (s < 600) return '3-10m';
  return '10m+';
}

const R = role();
const started = Date.now();

function fireOpen() {
  const isEmbedded = (typeof window !== 'undefined' && window.parent !== window) ? 'yes' : 'no';
  track(R === 'hub' ? 'hub_open' : 'game_open', {
    game: R,
    lang: lang(),
    embedded: isEmbedded,
    display: displayMode(),
  });
}
if (typeof queueMicrotask === 'function') queueMicrotask(fireOpen);
else Promise.resolve().then(fireOpen);

const ERR_CAP = 8;
let errCount = 0;
const errSeen = new Set();

function trim(s, n) {
  s = String(s == null ? '' : s);
  return s.length > n ? s.slice(0, n) : s;
}

function reportError(kind, message, source, line, col) {
  if (errCount >= ERR_CAP) return;
  const msg = trim(message, 300);
  const src = trim(source, 200);
  const sig = kind + '|' + msg + '|' + src + '|' + (line || '');
  if (errSeen.has(sig)) return;
  errSeen.add(sig);
  errCount++;
  track('error', {
    game: R,
    kind,
    message: msg,
    source: src,
    lang: lang(),
    display: displayMode(),
    embedded: (window.parent !== window) ? 'yes' : 'no',
  }, {
    line: Number(line) || 0,
    col: Number(col) || 0,
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e && e.message) {
      reportError('error', e.message, e.filename, e.lineno, e.colno);
    }
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    let reason = e && e.reason;
    if (reason && reason.message) reason = reason.message;
    reportError('unhandledrejection', reason, '', 0, 0);
  });
}

let ended = false;
function sessionEnd() {
  if (ended) return;
  ended = true;
  const ms = Date.now() - started;
  track('session_end', {
    game: R,
    lang: lang(),
    duration_bucket: durationBucket(ms),
  }, { duration_ms: ms });
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', sessionEnd, { capture: true });
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sessionEnd();
  });
}
