(function () {
'use strict';

/* ================= basics ================= */
var CFG = window.APP_CONFIG || {};
var DEMO = Array.isArray(window.DEMO_POINTS);
var HAS_SB = !DEMO && !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
var $ = function (s, r) { return (r || document).querySelector(s); };
var app = $('#app');
var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
var store = {
  get: function (k, d) { try { var v = localStorage.getItem('sr.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem('sr.' + k, JSON.stringify(v)); } catch (e) {} },
  del: function (k) { try { localStorage.removeItem('sr.' + k); } catch (e) {} }
};

var CATS = { mall: 'ห้าง/ศูนย์การค้า', market: 'ตลาด', fuel: 'ปั๊มน้ำมัน', park: 'สวนสาธารณะ', building: 'อาคาร', campus: 'สถานศึกษา', sport: 'สนามกีฬา/สระว่ายน้ำ', restroom: 'ห้องน้ำสาธารณะ', other: 'อื่น ๆ' };
var ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  nav: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 20 21 12 17 4 21z"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.500 7 13 7 13z"/><circle cx="12" cy="9" r="2.500"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/></svg>',
  radar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" opacity=".35"/><circle cx="12" cy="12" r="5" opacity=".65"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 12 19 6" stroke-linecap="round"/></svg>'
};
function arrowSvg(deg) { return '<svg class="arrow" viewBox="0 0 16 16" style="transform:rotate(' + Math.round(deg) + 'deg)" aria-hidden="true"><path d="M8 1 13 14 8 11 3 14z" fill="currentColor"/></svg>'; }

/* ================= settings ================= */
var SET = Object.assign({ radius: 300, sound: true, voice: false, vibrate: true, alertInactive: false, alertApprox: true, rings: true, rays: true, wake: false, theme: 'auto' }, store.get('set', {}));
function saveSet() { store.set('set', SET); }

/* ================= geo math ================= */
var R = 6371008.8, RAD = Math.PI / 180;
function dist(a, b) {
  var dLat = (b.lat - a.lat) * RAD, dLng = (b.lng - a.lng) * RAD;
  var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
function bearing(a, b) {
  var y = Math.sin((b.lng - a.lng) * RAD) * Math.cos(b.lat * RAD);
  var x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lng - a.lng) * RAD);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}
function offsetPoint(c, meters, brgDeg) {
  var d = meters / R, br = brgDeg * RAD, la = c.lat * RAD, lo = c.lng * RAD;
  var la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(br));
  var lo2 = lo + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return { lat: la2 / RAD, lng: lo2 / RAD };
}
var DIRS = ['เหนือ', 'ตะวันออกเฉียงเหนือ', 'ตะวันออก', 'ตะวันออกเฉียงใต้', 'ใต้', 'ตะวันตกเฉียงใต้', 'ตะวันตก', 'ตะวันตกเฉียงเหนือ'];
function dirName(b) { return DIRS[Math.round(b / 45) % 8]; }
function fmtParts(m) {
  if (m == null || !isFinite(m)) return ['–', ''];
  if (m < 995) return [String(Math.round(m / 5) * 5 || Math.round(m)), 'ม.'];
  if (m < 9950) return [(m / 1000).toFixed(2), 'กม.'];
  if (m < 99500) return [(m / 1000).toFixed(1), 'กม.'];
  return [String(Math.round(m / 1000)), 'กม.'];
}
function fmtDist(m) { var p = fmtParts(m); return p[1] ? p[0] + ' ' + p[1] : p[0]; }
function fmtShort(m) {
  if (m == null) return '';
  if (m < 995) return (Math.round(m / 5) * 5 || Math.round(m)) + ' ม.';
  if (m < 99500) return (m / 1000).toFixed(1) + ' กม.';
  return Math.round(m / 1000) + ' กม.';
}
function fmtRing(m) { return m < 1000 ? m + ' ม.' : (m / 1000) + ' กม.'; }
function hasPos(p) { return p && typeof p.lat === 'number' && typeof p.lng === 'number' && isFinite(p.lat) && isFinite(p.lng); }

/* ================= state ================= */
var S = {
  points: new Map(), sel: null, filter: 'all', q: '',
  user: null, sheet: 'peek', visible: 208, view: 'list', pin: null,
  follow: true, gps: 'idle', sim: false, watchId: null, fix: null,
  near: [], fired: new Map(), alertQ: [], alertCur: null
};
var me = { disp: null, from: null, to: null, t0: 0, dur: 0, heading: null, acc: null, speed: null, raf: 0, tFix: 0 };

/* ================= theme ================= */
function theme() {
  var t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark' || t === 'light') return t;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
var themeByApp = false;
function applyThemeSetting() {
  if (SET.theme === 'dark' || SET.theme === 'light') { document.documentElement.setAttribute('data-theme', SET.theme); themeByApp = true; }
  else if (themeByApp) { document.documentElement.removeAttribute('data-theme'); themeByApp = false; }
}

/* ================= map ================= */
var map = L.map('map', { zoomControl: false, minZoom: 5, maxZoom: 19, zoomSnap: 0.5, worldCopyJump: false, attributionControl: true, tapHold: true, bounceAtZoomLimits: false })
  .setView([13.765, 100.555], 11);
map.attributionControl.setPrefix(false);
['base', 'rings', 'rays'].forEach(function (n, i) { map.createPane(n).style.zIndex = [150, 410, 420][i]; map.getPane(n).style.pointerEvents = 'none'; });
var TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
var ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
var tiles = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTR }).addTo(map);
app.classList.toggle('map-dark', theme() === 'dark');
var tileOK = false, tileErr = 0, fallbackOn = false, baseLayer = null, geoLabels = L.layerGroup().addTo(map), baseRenderer = null;
tiles.on('tileload', function () { if (!tileOK) { tileOK = true; setFallback(false); } });
tiles.on('tileerror', function () { tileErr++; if (!tileOK && tileErr >= 2) setFallback(true); });

function decodeDistricts() {
  if (decodeDistricts.cache) return decodeDistricts.cache;
  var src = window.TH_DISTRICTS || [], out = [];
  for (var i = 0; i < src.length; i++) {
    var d = src[i], rings = [];
    for (var r = 0; r < d[4].length; r++) {
      var f = d[4][r], x = 0, y = 0, ring = [];
      for (var k = 0; k < f.length; k += 2) { x += f[k]; y += f[k + 1]; ring.push([y / 1000, x / 1000]); }
      rings.push(ring);
    }
    out.push({ amp: d[0], pro: d[1], lat: d[2], lng: d[3], rings: rings });
  }
  decodeDistricts.cache = out;
  return out;
}
function baseStyle() { return { renderer: baseRenderer, pane: 'base', interactive: false, color: cssVar('--dline'), weight: 1, fillColor: cssVar('--land'), fillOpacity: 1 }; }
function setFallback(on) {
  if (on === fallbackOn) return;
  fallbackOn = on;
  if (on) {
    var ds = decodeDistricts();
    if (!ds.length) { fallbackOn = false; return; }
    if (!baseLayer) {
      baseRenderer = L.canvas({ pane: 'base', padding: 0.3 });
      baseLayer = L.layerGroup();
      var st = baseStyle();
      ds.forEach(function (d) { d.rings.forEach(function (ring) { baseLayer.addLayer(L.polygon(ring, st)); }); });
    }
    baseLayer.addTo(map);
    map.attributionControl.addAttribution('ขอบเขตอำเภอ: OpenGISData-Thailand');
    updateGeoLabels();
  } else {
    if (baseLayer) map.removeLayer(baseLayer);
    geoLabels.clearLayers();
  }
}
function updateGeoLabels() {
  geoLabels.clearLayers();
  if (!fallbackOn) return;
  var z = map.getZoom(), b = map.getBounds().pad(-0.02), ds = decodeDistricts(), items = [];
  if (z < 9.5) {
    var acc = {};
    ds.forEach(function (d) { var a = acc[d.pro] || (acc[d.pro] = { n: 0, lat: 0, lng: 0 }); a.n++; a.lat += d.lat; a.lng += d.lng; });
    Object.keys(acc).forEach(function (k) { var a = acc[k]; items.push({ t: k, lat: a.lat / a.n, lng: a.lng / a.n, big: true }); });
  } else {
    ds.forEach(function (d) { items.push({ t: d.amp, lat: d.lat, lng: d.lng }); });
  }
  var n = 0;
  for (var i = 0; i < items.length && n < 70; i++) {
    var it = items[i];
    if (!b.contains([it.lat, it.lng])) continue;
    n++;
    L.marker([it.lat, it.lng], { interactive: false, keyboard: false, zIndexOffset: -1000, icon: L.divIcon({ className: 'lbl-wrap', iconSize: [0, 0], html: '<span class="lbl geo' + (it.big ? ' big' : '') + '">' + esc(it.t) + '</span>' }) }).addTo(geoLabels);
  }
}
function onThemeChange() {
  app.classList.toggle('map-dark', theme() === 'dark');
  if (baseLayer) { var st = baseStyle(); baseLayer.eachLayer(function (l) { l.setStyle(st); }); }
  restyleOverlays();
}
if (window.matchMedia) {
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', onThemeChange); else if (mq.addListener) mq.addListener(onThemeChange);
}
if (window.MutationObserver) new MutationObserver(onThemeChange).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

function zoomClass() {
  var z = map.getZoom();
  app.classList.toggle('z-far', z < 11);
  app.classList.toggle('z-near', z >= 13.5);
}
map.on('zoomend', function () { zoomClass(); updateRings(true); });
var geoT = 0;
map.on('moveend', function () { if (fallbackOn) { clearTimeout(geoT); geoT = setTimeout(updateGeoLabels, 160); } if (S.pin) updatePinCoords(); });
map.on('move', function () { if (S.pin) updatePinCoords(); });
map.on('dragstart', function () { setFollow(false); });
zoomClass();

/* ---- focus helpers: keep the subject in the part of the map the sheet does not cover ---- */
function focusY() {
  var H = app.offsetHeight;
  if (S.pin) return H * 0.40;
  var top = $('#top').getBoundingClientRect().bottom - app.getBoundingClientRect().top + 8;
  var vis = Math.min(S.visible, H * 0.55);
  return Math.max(top + 30, top + (H - vis - top) / 2);
}
function centerFor(ll, zoom) {
  var dy = focusY() - app.offsetHeight / 2;
  return map.unproject(map.project(L.latLng(ll.lat, ll.lng), zoom).subtract([0, dy]), zoom);
}
function focusOn(ll, zoom, instant) {
  zoom = zoom == null ? map.getZoom() : zoom;
  var c = centerFor(ll, zoom);
  if (instant || REDUCED) map.setView(c, zoom, { animate: false });
  else map.flyTo(c, zoom, { duration: 0.9 });
}
function focusLatLng() { return map.containerPointToLatLng([app.offsetWidth / 2, focusY()]); }

/* ================= toast / banner ================= */
var toastT = 0;
function toast(msg, ms) {
  var t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, ms || 3200);
}
function banner(html) {
  var b = $('#banner');
  if (!html) { b.hidden = true; b.innerHTML = ''; return; }
  b.innerHTML = '<div>' + html + '</div><button type="button" aria-label="ปิด">×</button>';
  b.hidden = false;
  b.querySelector('button').onclick = function () { b.hidden = true; refreshSheetGeometry(); };
  refreshSheetGeometry();
}

/* ================= data stores ================= */
function normPoint(p) {
  return {
    id: p.id, code: p.code || null, list: p.list || 'user', name: p.name || '', note: p.note || '', description: p.description || '',
    category: CATS[p.category] ? p.category : 'other', lat: typeof p.lat === 'number' ? p.lat : null, lng: typeof p.lng === 'number' ? p.lng : null,
    precision_level: p.precision_level || (typeof p.lat === 'number' ? 'exact' : 'none'), pos_source: p.pos_source || 'member',
    active: p.active !== false, gmaps_query: p.gmaps_query || '', created_by: p.created_by || null, created_by_email: p.created_by_email || '',
    updated_at: p.updated_at || null, updated_by_email: p.updated_by_email || '', _d: null, _b: null
  };
}

function demoStore() {
  var rows = window.DEMO_POINTS.map(normPoint), nextId = 100000, saved = store.get('demo', null);
  if (saved && saved.rows) { rows = saved.rows.map(normPoint); nextId = saved.nextId || nextId; }
  function persist() { store.set('demo', { rows: rows, nextId: nextId }); }
  var st = { mode: 'demo', user: { id: 'demo', email: 'โหมดพรีวิว', isAdmin: true } };
  st.init = function (cb) { setTimeout(function () { cb('SIGNED_IN', { user: { id: 'demo', email: 'โหมดพรีวิว' } }); }, 0); };
  st.member = function () { return Promise.resolve({ email: 'demo', is_admin: true }); };
  st.load = function () { return Promise.resolve(rows.slice()); };
  st.insert = function (r) { var p = normPoint(Object.assign({}, r, { id: nextId, code: 'U' + (nextId - 99999), created_by: 'demo' })); nextId++; rows.push(p); persist(); return Promise.resolve(p); };
  st.update = function (id, patch) { var p = rows.find(function (x) { return x.id === id; }); Object.assign(p, patch, { updated_at: new Date().toISOString() }); persist(); return Promise.resolve(normPoint(p)); };
  st.remove = function (id) { rows = rows.filter(function (x) { return x.id !== id; }); persist(); return Promise.resolve(); };
  st.subscribe = function () {};
  st.signOut = function () { store.del('demo'); rows = window.DEMO_POINTS.map(normPoint); nextId = 100000; setPoints(rows.slice()); showList(); setSheet('peek'); toast('ล้างข้อมูลที่แก้ในพรีวิวแล้ว'); return Promise.resolve(); };
  return st;
}

function sbStore() {
  var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
  var st = { mode: 'sb', user: null }, chan = null;
  function unwrap(res) { if (res.error) throw res.error; return res.data; }
  st.init = function (cb) { sb.auth.onAuthStateChange(function (ev, session) { setTimeout(function () { cb(ev, session); }, 0); }); };
  st.signIn = function (email, pw) { return sb.auth.signInWithPassword({ email: email, password: pw }).then(unwrap); };
  st.signUp = function (email, pw) { return sb.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: location.origin + location.pathname } }).then(unwrap); };
  st.resetPw = function (email) { return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(unwrap); };
  st.setPassword = function (pw) { return sb.auth.updateUser({ password: pw }).then(unwrap); };
  st.signOut = function () { if (chan) { sb.removeChannel(chan); chan = null; } return sb.auth.signOut(); };
  st.member = function (email) { return sb.from('members').select('email,is_admin').eq('email', String(email).toLowerCase()).maybeSingle().then(unwrap); };
  st.load = function () { return sb.from('points').select('*').order('id', { ascending: true }).limit(5000).then(unwrap).then(function (a) { return a.map(normPoint); }); };
  st.insert = function (r) { return sb.from('points').insert(r).select().single().then(unwrap).then(normPoint); };
  st.update = function (id, patch) { return sb.from('points').update(patch).eq('id', id).select().single().then(unwrap).then(normPoint); };
  st.remove = function (id) { return sb.from('points').delete().eq('id', id).then(unwrap); };
  st.subscribe = function (cb) {
    if (chan) sb.removeChannel(chan);
    chan = sb.channel('points-live').on('postgres_changes', { event: '*', schema: 'public', table: 'points' }, function (pl) {
      if (pl.eventType === 'DELETE') cb({ type: 'delete', id: pl.old && pl.old.id });
      else cb({ type: 'upsert', point: normPoint(pl.new) });
    }).subscribe();
  };
  st.listMembers = function () { return sb.from('members').select('*').order('added_at', { ascending: true }).then(unwrap); };
  st.addMember = function (email) { return sb.from('members').insert({ email: email.toLowerCase() }).then(unwrap); };
  st.setAdmin = function (email, v) { return sb.from('members').update({ is_admin: v }).eq('email', email).then(unwrap); };
  st.removeMember = function (email) { return sb.from('members').delete().eq('email', email).then(unwrap); };
  return st;
}
var Store = DEMO ? demoStore() : (HAS_SB ? sbStore() : null);

function errText(e) {
  var m = (e && (e.message || e.error_description || e.msg)) || String(e || '');
  if (/Invalid login credentials/i.test(m)) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (/Email not confirmed/i.test(m)) return 'ยังไม่ได้ยืนยันอีเมล เปิดลิงก์ยืนยันในกล่องจดหมายก่อน';
  if (/already registered|already been registered/i.test(m)) return 'อีเมลนี้สมัครไว้แล้ว ให้เข้าสู่ระบบแทน';
  if (/Database error saving new user|EMAIL_NOT_ALLOWED/i.test(m)) return 'อีเมลนี้ยังไม่อยู่ในรายชื่อที่อนุญาต ให้ผู้ดูแลกลุ่มเพิ่มอีเมลก่อน';
  if (/Password should be|at least 6/i.test(m)) return 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร';
  if (/rate limit|too many/i.test(m)) return 'ลองถี่เกินไป รอสักครู่แล้วลองใหม่';
  if (/Signups not allowed/i.test(m)) return 'ระบบปิดการสมัครเอง ให้ผู้ดูแลกลุ่มสร้างบัญชีให้';
  if (/row-level security|permission denied|not authorized/i.test(m)) return 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้';
  if (/duplicate key/i.test(m)) return 'มีรายการนี้อยู่แล้ว';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่';
  return 'ทำรายการไม่สำเร็จ: ' + m;
}

/* ================= points & markers ================= */
var markers = new Map();
function codeOf(p) { return p.code || '•'; }
function passes(p) {
  if (S.filter === 'on' && !p.active) return false;
  if (S.filter === 'off' && p.active) return false;
  if (S.filter === 'wait' && p.precision_level === 'exact') return false;
  if (S.filter === 'mine' && !(S.user && p.created_by === S.user.id)) return false;
  return true;
}
function pinHtml(p) {
  var c = ['pin', p.active ? 'ok' : 'off'];
  if (p.precision_level === 'approx') c.push('approx');
  if (S.sel === p.id) c.push('sel');
  if (S.near.indexOf(p.id) >= 0) c.push('near');
  return '<div class="' + c.join(' ') + '"><span class="pin-tag">' + esc(codeOf(p)) + '</span><span class="pin-dist">' + (p._d != null ? fmtShort(p._d) : '') + '</span></div>';
}
function upsertMarker(p) {
  var m = markers.get(p.id);
  var show = hasPos(p) && (passes(p) || S.sel === p.id);
  if (!show) { if (m) { map.removeLayer(m); markers.delete(p.id); } return; }
  var icon = L.divIcon({ className: 'pin-wrap', iconSize: [0, 0], html: pinHtml(p) });
  if (!m) {
    m = L.marker([p.lat, p.lng], { icon: icon, keyboard: false, title: p.name, zIndexOffset: S.sel === p.id ? 800 : (p.active ? 100 : 0) });
    m.on('click', function () { if (!S.pin) selectPoint(p.id, true); });
    m.addTo(map); markers.set(p.id, m);
  } else {
    m.setLatLng([p.lat, p.lng]); m.setIcon(icon); m.setZIndexOffset(S.sel === p.id ? 800 : (p.active ? 100 : 0));
  }
}
function rebuildMarkers() { S.points.forEach(upsertMarker); }
function setPoints(arr) {
  markers.forEach(function (m) { map.removeLayer(m); }); markers.clear();
  S.points.clear();
  arr.forEach(function (p) { S.points.set(p.id, p); });
  recomputeDistances(true);
  rebuildMarkers(); renderChips(); renderList();
}
function applyChange(ch) {
  if (ch.type === 'delete') {
    var m = markers.get(ch.id); if (m) { map.removeLayer(m); markers.delete(ch.id); }
    S.points.delete(ch.id);
    if (S.sel === ch.id) { S.sel = null; showList(); }
  } else {
    var p = ch.point; S.points.set(p.id, p);
    if (S.fix && hasPos(p)) { p._d = dist(S.fix, p); p._b = bearing(S.fix, p); }
    upsertMarker(p);
    if (S.sel === p.id && S.view === 'detail') renderDetail();
  }
  recomputeDistances(true); renderChips(); renderList();
}
function fitAll() {
  var pts = []; S.points.forEach(function (p) { if (hasPos(p) && p.lat > 12.9 && p.lat < 14.6 && p.lng > 99.8 && p.lng < 101.3) pts.push([p.lat, p.lng]); });
  if (pts.length > 1) map.fitBounds(pts, { paddingTopLeft: [24, 150], paddingBottomRight: [24, S.visible + 20], animate: false, maxZoom: 13 });
}

/* ================= me marker, rings, rays ================= */
var meMarker = null, accCircle = null, alertCircle = null, alertLabel = null, ringLayers = [], rayLayers = [];
function alertLabelIcon() { return L.divIcon({ className: 'lbl-wrap', iconSize: [0, 0], html: '<span class="lbl ring alert-ring-lbl">เตือน ' + fmtRing(SET.radius) + '</span>' }); }
function meHtml() {
  var cone = me.heading == null ? '' : '<div class="me-cone" style="transform:rotate(' + Math.round(me.heading) + 'deg)"><svg viewBox="0 0 52 52"><path d="M26 26 13 2a28 28 0 0 1 26 0z" fill="' + cssVar(S.sim ? '--warn' : '--accent') + '" opacity=".38"/></svg></div>';
  return '<div class="me' + (S.sim ? ' sim' : '') + '"><div class="me-pulse"></div>' + cone + '<div class="me-dot"></div></div>';
}
function ensureMe() {
  if (meMarker) return;
  meMarker = L.marker([me.disp.lat, me.disp.lng], { interactive: false, keyboard: false, zIndexOffset: 2000, icon: L.divIcon({ className: 'me-wrap', iconSize: [0, 0], html: meHtml() }) }).addTo(map);
  accCircle = L.circle([me.disp.lat, me.disp.lng], { radius: 1, pane: 'rings', interactive: false, stroke: false, fillOpacity: 0.12 }).addTo(map);
  alertCircle = L.circle([me.disp.lat, me.disp.lng], { radius: SET.radius, pane: 'rings', interactive: false, weight: 1.5, dashArray: '4 5', fillOpacity: 0.06 }).addTo(map);
  alertLabel = L.marker(offsetPoint(me.disp, SET.radius, 180), { interactive: false, keyboard: false, zIndexOffset: -400, icon: alertLabelIcon() }).addTo(map);
  restyleOverlays();
}
function restyleOverlays() {
  var a = cssVar(S.sim ? '--warn' : '--accent'), ok = cssVar('--ok'), mu = cssVar('--muted');
  if (accCircle) accCircle.setStyle({ fillColor: a });
  if (alertCircle) alertCircle.setStyle({ color: ok, fillColor: ok });
  ringLayers.forEach(function (r) { r.c.setStyle({ color: mu }); });
  rayLayers.forEach(function (r) { r.line.setStyle({ color: a }); });
  if (meMarker) meMarker.setIcon(L.divIcon({ className: 'me-wrap', iconSize: [0, 0], html: meHtml() }));
}
var lastHeadingDrawn = null;
function drawMe() {
  if (!me.disp) return;
  ensureMe();
  var ll = [me.disp.lat, me.disp.lng];
  meMarker.setLatLng(ll);
  if (me.heading !== lastHeadingDrawn) {
    lastHeadingDrawn = me.heading;
    var el = meMarker.getElement(), cone = el && el.querySelector('.me-cone');
    if (cone) cone.style.transform = 'rotate(' + Math.round(me.heading) + 'deg)';
    else meMarker.setIcon(L.divIcon({ className: 'me-wrap', iconSize: [0, 0], html: meHtml() }));
  }
  accCircle.setLatLng(ll); accCircle.setRadius(Math.max(1, Math.min(me.acc || 1, 2000)));
  alertCircle.setLatLng(ll); alertLabel.setLatLng(offsetPoint(me.disp, SET.radius, 180));
  ringLayers.forEach(function (r) { r.c.setLatLng(ll); r.l.setLatLng(offsetPoint(me.disp, r.m, 0)); });
  rayLayers.forEach(function (r) {
    var p = S.points.get(r.id); if (!p) return;
    r.line.setLatLngs([ll, [p.lat, p.lng]]);
    r.lbl.setLatLng([(me.disp.lat + p.lat) / 2, (me.disp.lng + p.lng) / 2]);
  });
  if (S.follow && !S.pin && !flying) map.panTo(centerFor(me.disp, map.getZoom()), { animate: false });
}
function tick(now) {
  var k = me.dur ? Math.min(1, (now - me.t0) / me.dur) : 1;
  me.disp = { lat: me.from.lat + (me.to.lat - me.from.lat) * k, lng: me.from.lng + (me.to.lng - me.from.lng) * k };
  drawMe();
  me.raf = k < 1 ? requestAnimationFrame(tick) : 0;
}
var RING_STEPS = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
function updateRings(force) {
  if (!me.disp || !SET.rings) { ringLayers.forEach(function (r) { map.removeLayer(r.c); map.removeLayer(r.l); }); ringLayers = []; return; }
  var mpp = 40075016.686 * Math.cos(me.disp.lat * RAD) / Math.pow(2, map.getZoom() + 8);
  var maxPx = Math.max(app.offsetWidth, app.offsetHeight) * 0.75;
  var want = RING_STEPS.filter(function (m) { var px = m / mpp; return px >= 46 && px <= maxPx && m !== SET.radius; }).slice(0, 3);
  var have = ringLayers.map(function (r) { return r.m; });
  if (!force && want.join() === have.join()) return;
  ringLayers.forEach(function (r) { map.removeLayer(r.c); map.removeLayer(r.l); });
  var mu = cssVar('--muted');
  ringLayers = want.map(function (m) {
    var c = L.circle([me.disp.lat, me.disp.lng], { radius: m, pane: 'rings', interactive: false, fill: false, color: mu, weight: 1, opacity: 0.55 }).addTo(map);
    var l = L.marker(offsetPoint(me.disp, m, 0), { interactive: false, keyboard: false, zIndexOffset: -500, icon: L.divIcon({ className: 'lbl-wrap', iconSize: [0, 0], html: '<span class="lbl ring">' + fmtRing(m) + '</span>' }) }).addTo(map);
    return { m: m, c: c, l: l };
  });
}
function updateRays() {
  rayLayers.forEach(function (r) { map.removeLayer(r.line); map.removeLayer(r.lbl); });
  rayLayers = [];
  if (!me.disp) return;
  var ids = SET.rays ? S.near.slice(0, 3) : [];
  if (S.sel != null && ids.indexOf(S.sel) < 0) { var sp = S.points.get(S.sel); if (sp && hasPos(sp)) ids.push(S.sel); }
  var a = cssVar(S.sim ? '--warn' : '--accent');
  ids.forEach(function (id) {
    var p = S.points.get(id); if (!p || !hasPos(p)) return;
    var sel = id === S.sel;
    var line = L.polyline([[me.disp.lat, me.disp.lng], [p.lat, p.lng]], { pane: 'rays', interactive: false, color: a, weight: sel ? 3.5 : 2, opacity: sel ? 0.95 : 0.6, className: sel ? 'ray-line' : '', dashArray: sel ? null : '2 7' }).addTo(map);
    var lbl = L.marker([(me.disp.lat + p.lat) / 2, (me.disp.lng + p.lng) / 2], { interactive: false, keyboard: false, zIndexOffset: 900, icon: L.divIcon({ className: 'lbl-wrap', iconSize: [0, 0], html: sel ? '<span class="lbl ray sel">' + fmtDist(p._d) + '</span>' : '' }) }).addTo(map);
    rayLayers.push({ id: id, line: line, lbl: lbl });
  });
}

/* ================= distances ================= */
var lastListRender = 0;
function recomputeDistances(force) {
  var prevNear = S.near.join();
  if (S.fix) {
    var arr = [];
    S.points.forEach(function (p) {
      if (hasPos(p)) { p._d = dist(S.fix, p); p._b = bearing(S.fix, p); if (passes(p)) arr.push(p); }
      else { p._d = null; p._b = null; }
    });
    arr.sort(function (a, b) { return a._d - b._d; });
    S.near = arr.slice(0, 5).map(function (p) { return p.id; });
  } else S.near = [];
  // distance chips on pins
  markers.forEach(function (m, id) {
    var p = S.points.get(id), el = m.getElement(); if (!p || !el) return;
    var chip = el.querySelector('.pin-dist'); if (chip) chip.textContent = p._d != null ? fmtShort(p._d) : '';
    var pin = el.querySelector('.pin'); if (pin) pin.classList.toggle('near', S.near.indexOf(id) >= 0);
  });
  if (force || prevNear !== S.near.join()) updateRays();
  else rayLayers.forEach(function (r) { var p = S.points.get(r.id), el = r.lbl.getElement(); if (p && el) { var s = el.querySelector('.lbl'); if (s) s.textContent = fmtDist(p._d); } });
  updateHud();
  var now = Date.now();
  if (force || now - lastListRender > 1500) {
    lastListRender = now;
    if (S.view === 'list') renderList();
    if (S.view === 'detail') updateDetailMeter();
  }
}
function updateHud() {
  var g = $('#hud-gps'), cls = '', txt = 'ยังไม่เริ่ม';
  if (S.sim) { txt = 'จำลอง'; cls = 'is-sim'; }
  else if (S.gps === 'on') { txt = me.acc != null ? '±' + Math.round(me.acc) + ' ม.' : 'ทำงาน'; cls = 'is-live'; }
  else if (S.gps === 'wait') txt = 'กำลังหา…';
  else if (S.gps === 'blocked') { txt = 'ไม่ได้รับสิทธิ์'; cls = 'is-bad'; }
  else if (S.gps === 'none') { txt = 'ไม่รองรับ'; cls = 'is-bad'; }
  g.textContent = txt; g.className = 'hud-v ' + cls;
  $('#hud-speed').textContent = me.speed != null && S.gps === 'on' && !S.sim ? Math.round(me.speed * 3.6) + ' กม./ชม.' : '–';
  var n = S.near.length ? S.points.get(S.near[0]) : null;
  $('#hud-near').textContent = n ? codeOf(n) + ' · ' + fmtShort(n._d) : '–';
}

/* ================= position pipeline ================= */
var flying = false, flyT = 0;
function fly(ll, zoom) { flying = true; clearTimeout(flyT); flyT = setTimeout(function () { flying = false; }, 1600); focusOn(ll, zoom); }
map.on('moveend', function () { if (!map._flyToFrame) { flying = false; } });
function setFollow(v) { S.follow = v; $('#btn-locate').classList.toggle('is-on', v && !!me.disp); }
function pushFix(lat, lng, acc, speed, heading) {
  var now = performance.now(), prev = me.to, first = !me.disp;
  var to = { lat: lat, lng: lng };
  if (heading != null && !isNaN(heading) && speed != null && speed > 0.8) me.heading = heading;
  else if (prev && dist(prev, to) > 6) me.heading = bearing(prev, to);
  if (speed == null && prev && me.tFix) { var dt = (now - me.tFix) / 1000; speed = dt > 0.3 ? dist(prev, to) / dt : null; if (speed != null && speed > 70) speed = null; }
  me.from = me.disp || to; me.to = to; me.acc = acc; me.speed = speed;
  var jump = me.disp ? dist(me.disp, to) : 0;
  me.dur = (first || jump > 3000 || REDUCED) ? 0 : Math.max(250, Math.min(1500, me.tFix ? now - me.tFix : 800));
  me.t0 = now; me.tFix = now;
  S.fix = to;
  if (first) {
    me.disp = to; drawMe();
    if (S.follow) fly(to, Math.max(map.getZoom(), 14.5));
    setFollow(S.follow);
  }
  if (!me.raf) me.raf = requestAnimationFrame(tick);
  updateRings(first);
  recomputeDistances(first);
  checkAlerts();
}
function onPos(pos) {
  if (S.sim) return;
  var c = pos.coords;
  S.gps = 'on'; banner(null);
  pushFix(c.latitude, c.longitude, c.accuracy, c.speed, c.heading);
}
function onPosErr(e) {
  if (S.sim) return;
  if (e && e.code === 1) {
    stopGPS(); S.gps = 'blocked'; updateHud();
    banner(DEMO
      ? '<b>หน้าพรีวิวนี้อ่าน GPS ไม่ได้</b><br>แตะค้างบนแผนที่ แล้วเลือก “จำลองตำแหน่งฉัน” เพื่อลองระยะทางและการแจ้งเตือน'
      : '<b>ยังไม่ได้รับสิทธิ์ตำแหน่ง</b><br>เปิดสิทธิ์ตำแหน่งให้เว็บนี้ในการตั้งค่าเบราว์เซอร์ แล้วแตะปุ่มเป้าเพื่อลองใหม่ หรือแตะค้างบนแผนที่เพื่อจำลองตำแหน่ง');
  } else if (!S.fix) { S.gps = 'wait'; updateHud(); }
}
function startGPS() {
  if (S.sim || S.watchId != null) return;
  if (!('geolocation' in navigator)) { S.gps = 'none'; updateHud(); return; }
  S.gps = 'wait'; updateHud();
  try { S.watchId = navigator.geolocation.watchPosition(onPos, onPosErr, { enableHighAccuracy: true, maximumAge: 1500, timeout: 25000 }); }
  catch (e) { S.gps = 'blocked'; updateHud(); }
}
function stopGPS() { if (S.watchId != null) { try { navigator.geolocation.clearWatch(S.watchId); } catch (e) {} S.watchId = null; } }
function simulateAt(ll) {
  S.sim = true; stopGPS(); banner(null);
  pushFix(ll.lat, ll.lng, null, null, null);
  restyleOverlays(); updateHud();
  toast('จำลองตำแหน่งอยู่ที่จุดนี้ · แตะค้างที่อื่นเพื่อย้าย');
}
function useRealGPS() { S.sim = false; restyleOverlays(); setFollow(true); startGPS(); updateHud(); }

/* ---- long-press menu ---- */
map.on('contextmenu', function (e) {
  if (S.pin) return;
  var wrap = document.createElement('div'); wrap.className = 'stack'; wrap.style.gap = '8px'; wrap.style.minWidth = '190px';
  wrap.innerHTML = '<button type="button" class="btn solid" data-a="add">' + ICON.pin + 'เพิ่มจุดที่นี่</button><button type="button" class="btn" data-a="sim">จำลองตำแหน่งฉันที่นี่</button>';
  var pop = L.popup({ closeButton: false, offset: [0, -2], className: 'menu-pop' }).setLatLng(e.latlng).setContent(wrap).openOn(map);
  wrap.onclick = function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    map.closePopup(pop);
    if (b.dataset.a === 'sim') simulateAt(e.latlng);
    else beginAdd(e.latlng);
  };
});

/* ================= proximity alerts ================= */
var actx = null;
function unlockAudio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} }
document.addEventListener('pointerdown', unlockAudio, { passive: true });
function chime() {
  if (!actx || !SET.sound) return;
  try {
    var t = actx.currentTime;
    [880, 1174.66, 1567.98].forEach(function (f, i) {
      var o = actx.createOscillator(), g = actx.createGain(), s = t + i * 0.17;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.4, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.5);
      o.connect(g); g.connect(actx.destination); o.start(s); o.stop(s + 0.55);
    });
  } catch (e) {}
}
function speak(text) {
  if (!SET.voice || !window.speechSynthesis) return;
  try { var u = new SpeechSynthesisUtterance(text); u.lang = 'th-TH'; u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}
function alertEligible(p) {
  if (!hasPos(p) || p._d == null) return false;
  if (!p.active && !SET.alertInactive) return false;
  if (p.precision_level === 'approx' && !SET.alertApprox) return false;
  return true;
}
function checkAlerts() {
  if (!S.fix) return;
  var R1 = SET.radius, R2 = SET.radius * 1.5 + 60, hits = [];
  S.points.forEach(function (p) {
    if (!alertEligible(p)) return;
    var armed = !S.fired.get(p.id);
    if (armed && p._d <= R1) { S.fired.set(p.id, true); hits.push(p); }
    else if (!armed && p._d > R2) S.fired.delete(p.id);
  });
  if (!hits.length) return;
  hits.sort(function (a, b) { return a._d - b._d; });
  hits.forEach(function (p) { S.alertQ.push(p.id); });
  if (!S.alertCur) nextAlert();
}
var alertT = 0;
function nextAlert() {
  clearTimeout(alertT);
  var box = $('#alert');
  var id = S.alertQ.shift();
  if (id == null) { S.alertCur = null; box.hidden = true; return; }
  var p = S.points.get(id); if (!p) return nextAlert();
  S.alertCur = id;
  $('#alert-code').textContent = codeOf(p);
  $('#alert-k').textContent = (p.precision_level === 'approx' ? 'เข้าใกล้บริเวณจุด (ตำแหน่งโดยประมาณ)' : 'เข้าใกล้จุด') + (S.alertQ.length ? ' · อีก ' + S.alertQ.length + ' จุด' : '');
  $('#alert-name').textContent = p.name;
  $('#alert-d').textContent = (p._d != null ? 'ห่าง ' + fmtDist(p._d) + ' · ทิศ' + dirName(p._b) : '') + (p.active ? '' : ' · Inactive');
  box.hidden = false; box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
  chime();
  if (SET.vibrate && navigator.vibrate) { try { navigator.vibrate([180, 90, 180, 90, 320]); } catch (e) {} }
  speak('ใกล้ถึง ' + p.name + ' อีก ' + fmtDist(p._d).replace('ม.', 'เมตร').replace('กม.', 'กิโลเมตร'));
  alertT = setTimeout(nextAlert, 12000);
}
$('#alert-open').onclick = function () { var id = S.alertCur; S.alertQ = []; nextAlert(); if (id != null) selectPoint(id, true); };
$('#alert-close').onclick = function () { nextAlert(); };
function testAlert() {
  unlockAudio();
  var p = S.near.length ? S.points.get(S.near[0]) : S.points.values().next().value;
  if (!p) return;
  S.alertQ.unshift(p.id); nextAlert();
}

/* ================= wake lock ================= */
var wakeLock = null;
function syncWake() {
  if (!SET.wake) { if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; } return; }
  if (wakeLock || !navigator.wakeLock || document.visibilityState !== 'visible') return;
  navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; w.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {});
}
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { syncWake(); if (!S.sim && S.user && S.gps !== 'blocked') { stopGPS(); startGPS(); } } });

/* ================= sheet ================= */
var sheet = $('#sheet');
var PEEK = 208;
function visibleFor(state) {
  var H = sheet.offsetHeight;
  if (state === 'full') return H;
  if (state === 'half') return Math.min(H, Math.round(app.offsetHeight * 0.54));
  return Math.min(H, PEEK);
}
function applyVisible(v) {
  S.visible = v;
  sheet.style.setProperty('--sheet-y', Math.max(0, sheet.offsetHeight - v) + 'px');
  app.style.setProperty('--sheet-visible', Math.round(Math.min(v, app.offsetHeight * 0.55)) + 'px');
  sheet.style.setProperty('--sheet-pad', Math.max(0, sheet.offsetHeight - v) + 'px');
}
function setSheet(state) { S.sheet = state; app.dataset.sheet = state; applyVisible(visibleFor(state)); }
function refreshSheetGeometry() { applyVisible(visibleFor(S.sheet)); }
window.addEventListener('resize', function () { map.invalidateSize(); refreshSheetGeometry(); });
(function dragSheet() {
  var drag = null;
  sheet.addEventListener('pointerdown', function (e) {
    var h = e.target.closest('.sheet-grip,.head-row');
    if (!h || e.target.closest('button,a,input,select,textarea')) return;
    drag = { y: e.clientY, v: S.visible, moved: false, t: performance.now(), id: e.pointerId, grip: !!e.target.closest('.sheet-grip') };
    try { sheet.setPointerCapture(e.pointerId); } catch (err) {}
  });
  sheet.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) < 5) return;
    drag.moved = true; sheet.classList.add('is-drag');
    applyVisible(Math.max(96, Math.min(sheet.offsetHeight, drag.v - dy)));
  });
  function end(e) {
    if (!drag || e.pointerId !== drag.id) return;
    sheet.classList.remove('is-drag');
    var d = drag; drag = null;
    if (!d.moved) { if (d.grip) setSheet(S.sheet === 'peek' ? 'half' : 'peek'); return; }
    var vel = (d.y - e.clientY) / Math.max(1, performance.now() - d.t); // px/ms, positive = up
    var order = ['peek', 'half', 'full'], cur = S.visible, best = 'peek', bd = 1e9;
    order.forEach(function (s) { var dd = Math.abs(visibleFor(s) - cur); if (dd < bd) { bd = dd; best = s; } });
    if (Math.abs(vel) > 0.6) { var i = order.indexOf(S.sheet) + (vel > 0 ? 1 : -1); best = order[Math.max(0, Math.min(2, i))]; }
    setSheet(best);
  }
  sheet.addEventListener('pointerup', end); sheet.addEventListener('pointercancel', end);
})();

/* ================= list view ================= */
function counts() {
  var c = { all: 0, on: 0, off: 0, wait: 0, mine: 0 };
  S.points.forEach(function (p) { c.all++; if (p.active) c.on++; else c.off++; if (p.precision_level !== 'exact') c.wait++; if (S.user && p.created_by === S.user.id) c.mine++; });
  return c;
}
function renderChips() {
  var c = counts();
  var defs = [['all', 'ทั้งหมด', ''], ['on', 'Active', 'ok'], ['off', 'Inactive', 'off'], ['wait', 'รอยืนยันตำแหน่ง', 'wait']];
  if (!DEMO) defs.push(['mine', 'ที่ฉันเพิ่ม', '']);
  $('#chips').innerHTML = defs.map(function (d) {
    return '<button type="button" class="chip" data-f="' + d[0] + '" aria-pressed="' + (S.filter === d[0]) + '">' + (d[2] ? '<span class="dot ' + d[2] + '"></span>' : '') + d[1] + ' <b>' + c[d[0]] + '</b></button>';
  }).join('');
}
$('#chips').onclick = function (e) {
  var b = e.target.closest('.chip'); if (!b) return;
  S.filter = b.dataset.f; renderChips(); rebuildMarkers(); recomputeDistances(true);
};
$('#q').addEventListener('input', function () { S.q = this.value.trim().toLowerCase(); renderList(); if (S.q && S.sheet === 'peek') setSheet('half'); });
$('#q').addEventListener('focus', function () { if (S.sheet === 'peek') setSheet('half'); });
function listOrder(p) { return (p.list === 'od' ? 0 : p.list === 'num' ? 1e6 : 2e6) + (parseInt(String(p.code || '').replace(/\D/g, ''), 10) || 0); }
function visibleList() {
  var arr = [];
  S.points.forEach(function (p) {
    if (!passes(p)) return;
    if (S.q && (p.name + ' ' + (p.code || '') + ' ' + p.description + ' ' + p.note + ' ' + CATS[p.category]).toLowerCase().indexOf(S.q) < 0) return;
    arr.push(p);
  });
  if (S.fix) arr.sort(function (a, b) { return (a._d == null ? 1e12 : a._d) - (b._d == null ? 1e12 : b._d); });
  else arr.sort(function (a, b) { return listOrder(a) - listOrder(b); });
  return arr;
}
function subLine(p) {
  var s = esc(CATS[p.category]);
  if (p.precision_level === 'approx') s += ' · <span class="approx">≈ ตำแหน่งโดยประมาณ</span>';
  else if (p.precision_level === 'none') s += ' · <span class="approx">ยังไม่ปักหมุด</span>';
  return s;
}
function renderList() {
  var arr = visibleList();
  $('#list-title').textContent = S.fix ? 'จุดใกล้ฉัน' : 'จุดทั้งหมด';
  $('#list-count').textContent = arr.length + ' จุด';
  var box = $('#rows');
  if (!arr.length) { box.innerHTML = '<div class="empty">ไม่มีจุดที่ตรงกับตัวกรองนี้</div>'; return; }
  box.innerHTML = arr.map(function (p) {
    var d = fmtParts(p._d);
    var right = p._d != null ? '<span class="row-dist">' + d[0] + ' <small>' + d[1] + '</small>' + arrowSvg(p._b) + '</span>' : (hasPos(p) ? '' : '<span class="row-dist"><small>ไม่มีหมุด</small></span>');
    return '<button type="button" class="row" data-id="' + esc(p.id) + '"><span class="code ' + (p.active ? 'ok' : 'off') + '">' + esc(codeOf(p)) + '</span><span><span class="row-name">' + esc(p.name) + '</span><span class="row-sub">' + subLine(p) + '</span></span>' + right + '</button>';
  }).join('');
}
$('#rows').onclick = function (e) { var r = e.target.closest('.row'); if (r) selectPoint(idFrom(r.dataset.id), true); };
function idFrom(s) { var n = Number(s); return isNaN(n) ? s : n; }

/* ================= panel plumbing ================= */
var panel = $('#view-panel');
function showList() {
  S.view = 'list'; panel.hidden = true; panel.innerHTML = ''; $('#view-list').hidden = false;
  var prev = S.sel; S.sel = null;
  if (prev != null) { var p = S.points.get(prev); if (p) upsertMarker(p); }
  updateRays(); renderList();
}
function showPanel(view, headHtml, bodyHtml) {
  S.view = view; $('#view-list').hidden = true; panel.hidden = false;
  panel.innerHTML = '<div class="view-head">' + headHtml + '</div><div class="view-scroll"><div class="stack">' + bodyHtml + '</div></div>';
  var b = panel.querySelector('[data-a="back"]'); if (b) b.onclick = function () { showList(); setSheet('peek'); };
}
function headRow(title, extra) { return '<div class="head-row"><button type="button" class="back" data-a="back" aria-label="กลับไปที่รายการ">' + ICON.back + '</button>' + (extra || '') + '<h2 class="h-title">' + esc(title) + '</h2></div>'; }

/* ================= detail ================= */
function gmapsNav(p) {
  var dest = (p.pos_source === 'member' && hasPos(p)) || !(p.gmaps_query || p.name) ? p.lat + ',' + p.lng : (p.gmaps_query || p.name);
  return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(dest) + '&travelmode=driving';
}
function gmapsPin(p) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.lat + ',' + p.lng); }
function gmapsSearch(p) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.gmaps_query || p.name); }
function canDelete(p) { return !!S.user && (S.user.isAdmin || p.created_by === S.user.id); }
function meterHtml(p) {
  if (!hasPos(p)) return '<div class="meter"><div class="meter-note">จุดนี้ยังไม่มีหมุดบนแผนที่ เพราะรายการต้นฉบับระบุตำแหน่งไม่ชัดเจน แตะ “ปักหมุดจุดนี้” เพื่อวางตำแหน่งจริง</div></div>';
  if (p._d == null) return '<div class="meter"><div class="meter-note">ยังไม่รู้ตำแหน่งของคุณ จึงยังคำนวณระยะทางไม่ได้</div></div>';
  var d = fmtParts(p._d);
  return '<div class="meter"><div class="meter-big" id="m-big">' + d[0] + '<small>' + d[1] + '</small></div><div class="meter-side" id="m-side"><span>ทิศ' + dirName(p._b) + '<br><span class="num">' + Math.round(p._b) + '°</span></span>' + arrowSvg(p._b) + '</div><div class="meter-note">ระยะทางเส้นตรงจาก' + (S.sim ? 'ตำแหน่งจำลอง' : 'ตำแหน่งของคุณ') + (p.precision_level === 'approx' ? ' ถึงหมุดโดยประมาณ' : '') + '</div></div>';
}
function updateDetailMeter() {
  var p = S.points.get(S.sel); if (!p) return;
  var m = panel.querySelector('.meter'); if (m) m.outerHTML = meterHtml(p);
}
function renderDetail() {
  var p = S.points.get(S.sel); if (!p) return showList();
  var badges = '<span class="badge ' + (p.active ? 'ok' : 'off') + '"><span class="dot ' + (p.active ? 'ok' : 'off') + '"></span>' + (p.active ? 'Active' : 'Inactive') + '</span><span class="badge">' + esc(CATS[p.category]) + '</span>';
  if (p.precision_level === 'approx') badges += '<span class="badge warn">≈ ตำแหน่งโดยประมาณ</span>';
  if (p.precision_level === 'none') badges += '<span class="badge warn">ยังไม่ปักหมุด</span>';
  var acts = '';
  if (hasPos(p) || p.gmaps_query) acts += '<a class="btn primary" href="' + esc(gmapsNav(p)) + '" target="_blank" rel="noopener">' + ICON.nav + 'นำทางด้วย Google Maps</a>';
  acts += '<a class="btn" href="' + esc(gmapsSearch(p)) + '" target="_blank" rel="noopener">' + ICON.search + 'ค้นชื่อใน Maps</a>';
  if (hasPos(p)) acts += '<a class="btn" href="' + esc(gmapsPin(p)) + '" target="_blank" rel="noopener">' + ICON.ext + 'เปิดหมุดใน Maps</a>';
  else acts += '<span></span>';
  acts += '<button type="button" class="btn" data-a="move">' + ICON.pin + (hasPos(p) ? (p.precision_level === 'approx' ? 'ยืนยันตำแหน่ง' : 'ย้ายหมุด') : 'ปักหมุดจุดนี้') + '</button>';
  acts += '<button type="button" class="btn" data-a="edit">' + ICON.edit + 'แก้ไขข้อมูล</button>';
  acts += '<button type="button" class="btn wide" data-a="toggle">' + (p.active ? 'เปลี่ยนเป็น Inactive' : 'เปลี่ยนเป็น Active') + '</button>';
  if (canDelete(p)) acts += '<button type="button" class="btn wide danger" data-a="del">' + ICON.trash + 'ลบจุดนี้</button>';
  var body = '<h3 class="d-name">' + esc(p.name) + '</h3><div class="badges">' + badges + '</div>' + meterHtml(p);
  if (p.description) body += '<p class="d-desc">' + esc(p.description) + '</p>';
  if (p.note) body += '<p class="d-desc"><b>รายละเอียดจุด:</b> ' + esc(p.note) + '</p>';
  if (p.precision_level === 'approx') body += '<p class="hint">หมุดนี้วางระดับย่านจากชื่อในรายการ อาจคลาดจากจุดจริงได้ 1–2 กม. ปุ่มนำทางจึงค้นด้วยชื่อสถานที่แทนพิกัด เมื่อไปถึงแล้วแตะ “ยืนยันตำแหน่ง” เพื่อแก้หมุดให้ทุกคน</p>';
  body += '<div class="acts">' + acts + '</div><div id="d-confirm"></div>';
  var metaBits = [];
  if (p.created_by_email) metaBits.push('เพิ่มโดย ' + p.created_by_email);
  if (p.updated_at) metaBits.push('แก้ไขล่าสุด ' + new Date(p.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) + (p.updated_by_email ? ' โดย ' + p.updated_by_email : ''));
  if (hasPos(p)) metaBits.push(p.lat.toFixed(5) + ', ' + p.lng.toFixed(5));
  body += '<p class="meta">' + esc(metaBits.join(' · ')) + '</p>';
  showPanel('detail', headRow('', '<span class="code ' + (p.active ? 'ok' : 'off') + '">' + esc(codeOf(p)) + '</span>'), body);
  panel.querySelector('.h-title').textContent = p.list === 'user' ? 'จุดที่สมาชิกเพิ่ม' : (p.list === 'od' ? 'รายการ OD' : 'รายการหมายเลข');
  panel.querySelector('.stack').onclick = function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var a = b.dataset.a;
    if (a === 'edit') openForm(p);
    else if (a === 'move') movePoint(p);
    else if (a === 'toggle') save(Store.update(p.id, { active: !p.active }), p.active ? 'เปลี่ยนเป็น Inactive แล้ว' : 'เปลี่ยนเป็น Active แล้ว');
    else if (a === 'del') {
      $('#d-confirm').innerHTML = '<div class="confirm"><span>ลบ “' + esc(p.name) + '” ออกจากแผนที่ของทุกคน?</span><button type="button" class="btn danger" data-a="del-yes">ลบ</button><button type="button" class="btn" data-a="del-no">ไม่ลบ</button></div>';
    } else if (a === 'del-no') $('#d-confirm').innerHTML = '';
    else if (a === 'del-yes') Store.remove(p.id).then(function () { applyChange({ type: 'delete', id: p.id }); setSheet('peek'); toast('ลบจุดแล้ว'); }).catch(function (er) { toast(errText(er), 5000); });
  };
}
function save(promise, okMsg) {
  return promise.then(function (pt) { applyChange({ type: 'upsert', point: pt }); if (okMsg) toast(okMsg); return pt; }).catch(function (er) { toast(errText(er), 5000); throw er; });
}
function selectPoint(id, doFly) {
  var prev = S.sel; S.sel = id;
  if (prev != null && prev !== id) { var pp = S.points.get(prev); if (pp) upsertMarker(pp); }
  var p = S.points.get(id); if (!p) { S.sel = null; return; }
  upsertMarker(p); updateRays();
  renderDetail();
  if (S.sheet !== 'full') setSheet('half');
  if (doFly && hasPos(p)) { setFollow(false); fly(p, Math.max(map.getZoom(), p.precision_level === 'approx' ? 14 : 15.5)); }
}

/* ================= add / edit ================= */
function openForm(p, ll) {
  var isNew = !p;
  var v = p || { name: '', note: '', description: '', category: 'other', active: true };
  var opts = Object.keys(CATS).map(function (k) { return '<option value="' + k + '"' + (v.category === k ? ' selected' : '') + '>' + CATS[k] + '</option>'; }).join('');
  var body =
    (isNew ? '<p class="hint num">หมุดใหม่ที่ ' + ll.lat.toFixed(5) + ', ' + ll.lng.toFixed(5) + '</p>' : '') +
    '<label class="field"><span>ชื่อจุด</span><input class="input" id="f-name" maxlength="200" value="' + esc(v.name) + '" placeholder="เช่น ปตท. ถนน… / ห้าง… ชั้น 3" autocomplete="off"></label>' +
    '<label class="field"><span>รายละเอียดจุด (ชั้น โซน ทางเข้า)</span><input class="input" id="f-note" maxlength="300" value="' + esc(v.note) + '" autocomplete="off"></label>' +
    '<label class="field"><span>สถานที่นี้คืออะไร</span><textarea id="f-desc" maxlength="1000">' + esc(v.description) + '</textarea></label>' +
    '<label class="field"><span>ประเภท</span><select id="f-cat">' + opts + '</select></label>' +
    '<div class="field"><span>สถานะ</span><div class="seg" id="f-active"><button type="button" data-v="1" aria-pressed="' + (v.active ? 'true' : 'false') + '">✓ Active</button><button type="button" data-v="0" aria-pressed="' + (v.active ? 'false' : 'true') + '">✕ Inactive</button></div></div>' +
    '<p class="err" id="f-err" style="color:var(--off);margin:0;font-size:13.5px"></p>' +
    '<div class="acts"><button type="button" class="btn primary" id="f-save">' + (isNew ? 'เพิ่มจุดนี้' : 'บันทึก') + '</button><button type="button" class="btn wide" id="f-cancel">ยกเลิก</button></div>';
  showPanel('form', headRow(isNew ? 'เพิ่มจุดใหม่' : 'แก้ไขจุด ' + codeOf(p)), body);
  setSheet('full');
  var seg = $('#f-active');
  seg.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); };
  var done = function () { if (p) { S.sel = p.id; renderDetail(); setSheet('half'); } else { showList(); setSheet('peek'); } };
  panel.querySelector('[data-a="back"]').onclick = done;
  $('#f-cancel').onclick = done;
  $('#f-save').onclick = function () {
    var name = $('#f-name').value.trim();
    if (!name) { $('#f-err').textContent = 'ใส่ชื่อจุดก่อนบันทึก'; $('#f-name').focus(); return; }
    var row = { name: name, note: $('#f-note').value.trim(), description: $('#f-desc').value.trim(), category: $('#f-cat').value, active: seg.querySelector('[aria-pressed="true"]').dataset.v === '1' };
    var btn = this; btn.disabled = true;
    var pr = isNew
      ? Store.insert(Object.assign(row, { lat: ll.lat, lng: ll.lng, precision_level: 'exact', pos_source: 'member', list: 'user' }))
      : Store.update(p.id, row);
    save(pr, isNew ? 'เพิ่มจุดแล้ว ทุกคนในกลุ่มเห็นจุดนี้' : 'บันทึกแล้ว').then(function (pt) { selectPoint(pt.id, isNew); }).catch(function () { btn.disabled = false; });
  };
}
function beginAdd(ll) {
  startPinning({
    title: 'เพิ่มจุดใหม่', hint: 'เลื่อนแผนที่ให้ปลายหมุดอยู่ตรงตำแหน่งจริง', start: ll || (S.follow && me.disp ? me.disp : null), query: '', ok: 'ใช้ตำแหน่งนี้',
    done: function (pos) { openForm(null, pos); }
  });
}
function movePoint(p) {
  startPinning({
    title: (hasPos(p) ? 'ย้ายหมุด ' : 'ปักหมุด ') + codeOf(p), hint: p.name, start: hasPos(p) ? p : null, query: p.gmaps_query || p.name, ok: 'บันทึกตำแหน่งนี้',
    done: function (pos) {
      save(Store.update(p.id, { lat: pos.lat, lng: pos.lng, precision_level: 'exact', pos_source: 'member' }), 'บันทึกตำแหน่งแล้ว').then(function (pt) { selectPoint(pt.id, true); }).catch(function () { selectPoint(p.id); });
    },
    cancel: function () { selectPoint(p.id); }
  });
}

/* ================= pin placement mode ================= */
function updatePinCoords() { var c = $('#pin-coords'); if (c) { var ll = focusLatLng(); c.textContent = ll.lat.toFixed(5) + ', ' + ll.lng.toFixed(5); } }
function startPinning(o) {
  S.pin = o; app.dataset.mode = 'pin'; setFollow(false);
  var bar = $('#pinbar');
  bar.innerHTML =
    '<div class="head-row"><h2 class="h-title">' + esc(o.title) + '</h2><span class="spacer"></span><span class="pin-coords" id="pin-coords"></span></div>' +
    '<p class="hint">' + esc(o.hint) + '</p>' +
    '<form class="inline" id="pin-search"><input class="input" id="pin-q" type="search" placeholder="ค้นหาสถานที่ใน OpenStreetMap" value="' + esc(o.query || '') + '" enterkeyhint="search" autocomplete="off"><button class="btn" type="submit" aria-label="ค้นหา">' + ICON.search + '</button></form>' +
    '<div id="pin-results"></div>' +
    '<div class="acts"><button type="button" class="btn primary" id="pin-ok">' + esc(o.ok) + '</button><button type="button" class="btn" id="pin-me">ใช้ตำแหน่งฉัน</button><button type="button" class="btn" id="pin-cancel">ยกเลิก</button></div>';
  bar.hidden = false; $('#crosshair').hidden = false;
  if (o.start) focusOn(o.start, Math.max(map.getZoom(), 16), true);
  updatePinCoords();
  $('#pin-ok').onclick = function () { var ll = focusLatLng(); endPinning(); o.done({ lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) }); };
  $('#pin-cancel').onclick = function () { endPinning(); if (o.cancel) o.cancel(); else { showList(); setSheet('peek'); } };
  $('#pin-me').onclick = function () { if (me.disp) focusOn(me.disp, Math.max(map.getZoom(), 17)); else toast('ยังไม่รู้ตำแหน่งของคุณ'); };
  $('#pin-search').onsubmit = function (e) { e.preventDefault(); searchPlaces($('#pin-q').value.trim()); $('#pin-q').blur(); };
}
function endPinning() { S.pin = null; delete app.dataset.mode; $('#pinbar').hidden = true; $('#pinbar').innerHTML = ''; $('#crosshair').hidden = true; }
function searchPlaces(q) {
  var box = $('#pin-results'); if (!box) return;
  if (!q) { box.innerHTML = ''; return; }
  box.innerHTML = '<p class="hint">กำลังค้นหา…</p>';
  var b = map.getBounds().pad(0.5);
  var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=th&accept-language=th&q=' + encodeURIComponent(q) + '&viewbox=' + [b.getWest(), b.getNorth(), b.getEast(), b.getSouth()].map(function (n) { return n.toFixed(4); }).join(',');
  fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(function (res) {
    if (!$('#pin-results')) return;
    if (!res.length) { box.innerHTML = '<p class="hint">ไม่พบ “' + esc(q) + '” ใน OpenStreetMap ลองใช้ชื่อสั้นลง หรือเลื่อนแผนที่เอง</p>'; return; }
    box.innerHTML = '<div class="results">' + res.map(function (r, i) {
      var parts = String(r.display_name || '').split(',');
      return '<button type="button" data-i="' + i + '">' + esc(parts[0]) + '<small>' + esc(parts.slice(1, 4).join(',').trim()) + '</small></button>';
    }).join('') + '</div>';
    box.querySelector('.results').onclick = function (e) {
      var bt = e.target.closest('button'); if (!bt) return;
      var r = res[+bt.dataset.i]; focusOn({ lat: +r.lat, lng: +r.lon }, 17);
    };
  }).catch(function () {
    if ($('#pin-results')) box.innerHTML = '<p class="hint">' + (DEMO ? 'หน้าพรีวิวนี้ค้นหาสถานที่ไม่ได้ เลื่อนแผนที่เองได้เลย' : 'ค้นหาไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่ หรือเลื่อนแผนที่เอง') + '</p>';
  });
}

/* ================= settings panel ================= */
function sw(key, title, sub) { return '<div class="set"><div class="set-t"><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div><button type="button" class="switch" role="switch" data-k="' + key + '" aria-checked="' + (SET[key] ? 'true' : 'false') + '" aria-label="' + title + '"></button></div>'; }
function openSettings() {
  var radii = [100, 200, 300, 500, 1000];
  var body =
    '<h3 class="sec">แจ้งเตือนเมื่อเข้าใกล้จุด</h3>' +
    '<div class="field"><span>ระยะที่เริ่มแจ้งเตือน</span><div class="seg" id="s-radius">' + radii.map(function (r) { return '<button type="button" data-v="' + r + '" aria-pressed="' + (SET.radius === r) + '">' + (r < 1000 ? r + ' ม.' : '1 กม.') + '</button>'; }).join('') + '</div></div>' +
    '<div>' + sw('sound', 'เสียงเตือน', 'เสียงกริ่งสามจังหวะ') + sw('voice', 'อ่านชื่อจุดด้วยเสียงพูด', 'ใช้เสียงภาษาไทยของเครื่อง') + sw('vibrate', 'สั่น', 'ใช้ได้บน Android') + sw('alertInactive', 'แจ้งเตือนจุด Inactive ด้วย', 'ปกติแจ้งเฉพาะจุด Active') + sw('alertApprox', 'รวมจุดที่ตำแหน่งโดยประมาณ', 'จุดที่ยังไม่ยืนยันอาจเตือนคลาดได้ 1–2 กม.') + '</div>' +
    '<button type="button" class="btn" id="s-test">ทดสอบการแจ้งเตือน</button>' +
    '<p class="hint">การแจ้งเตือนทำงานเฉพาะตอนที่เปิดหน้านี้ค้างไว้บนจอ ถ้าล็อกจอหรือสลับแอป เบราว์เซอร์จะหยุดอ่าน GPS</p>' +
    '<h3 class="sec">แผนที่</h3>' +
    '<div>' + sw('wake', 'เปิดจอค้างไว้', 'กันจอดับระหว่างขับรถ') + sw('rings', 'วงระยะรอบตัว', 'วงกลมบอกระยะ 100 ม. ถึง 100 กม. ตามระดับซูม') + sw('rays', 'เส้นไปยัง 3 จุดที่ใกล้ที่สุด', 'พร้อมป้ายระยะทางบนเส้น') + '</div>' +
    '<div class="field"><span>โทนสีแผนที่</span><div class="seg" id="s-theme">' + [['auto', 'ตามระบบ'], ['light', 'สว่าง'], ['dark', 'มืด']].map(function (t) { return '<button type="button" data-v="' + t[0] + '" aria-pressed="' + (SET.theme === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
    '<h3 class="sec">ตำแหน่งของฉัน</h3>' +
    (S.sim ? '<button type="button" class="btn" id="s-real">หยุดจำลอง กลับไปใช้ GPS จริง</button>' : '<p class="hint">แตะค้างบนแผนที่เพื่อจำลองตำแหน่ง ใช้ลองการแจ้งเตือนโดยไม่ต้องเดินทางจริง</p>');
  showPanel('settings', headRow('ตั้งค่า'), body);
  setSheet('full');
  panel.querySelector('.stack').onclick = function (e) {
    var s = e.target.closest('.switch');
    if (s) { var k = s.dataset.k; SET[k] = !SET[k]; s.setAttribute('aria-checked', SET[k] ? 'true' : 'false'); saveSet(); if (k === 'wake') syncWake(); if (k === 'rings') updateRings(true); if (k === 'rays') updateRays(); if (k === 'voice' && SET.voice) speak('เปิดเสียงพูดแล้ว'); return; }
    var b = e.target.closest('.seg button');
    if (b) {
      var seg = b.parentNode; seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      if (seg.id === 's-radius') { SET.radius = +b.dataset.v; if (alertCircle) { alertCircle.setRadius(SET.radius); alertLabel.setIcon(alertLabelIcon()); drawMe(); } S.fired.clear(); updateRings(true); }
      if (seg.id === 's-theme') { SET.theme = b.dataset.v; applyThemeSetting(); onThemeChange(); }
      saveSet(); return;
    }
    if (e.target.closest('#s-test')) testAlert();
    if (e.target.closest('#s-real')) { useRealGPS(); showList(); setSheet('peek'); }
  };
}

/* ================= account & members ================= */
function openAccount() {
  if (!S.user) return;
  var body = '<div class="meter"><div class="meter-note">' + (DEMO ? 'โหมดพรีวิว: ข้อมูลที่แก้จะเก็บในเบราว์เซอร์นี้เท่านั้น ยังไม่มีการ login' : 'เข้าสู่ระบบด้วย') + '</div>' + (DEMO ? '' : '<div style="grid-column:1/-1;font-weight:600;overflow-wrap:anywhere">' + esc(S.user.email) + '</div><div class="meter-note">' + (S.user.isAdmin ? 'ผู้ดูแลกลุ่ม: เพิ่ม/ลบสมาชิก และลบจุดของทุกคนได้' : 'สมาชิก: เพิ่มและแก้ไขจุดได้ ลบได้เฉพาะจุดที่เพิ่มเอง') + '</div>') + '</div>';
  if (!DEMO && S.user.isAdmin) body += '<h3 class="sec">อีเมลที่อนุญาต</h3><form class="inline" id="m-add"><input class="input" id="m-email" type="email" placeholder="name@example.com" autocomplete="off" required><button class="btn solid" type="submit">เพิ่ม</button></form><div id="m-list"><p class="hint">กำลังโหลดรายชื่อ…</p></div><p class="hint">คนที่อยู่ในรายชื่อนี้เท่านั้นที่สมัครและเข้าดูแผนที่ได้</p>';
  body += '<button type="button" class="btn" id="a-out">' + (DEMO ? 'ล้างข้อมูลที่แก้ในพรีวิว' : 'ออกจากระบบ') + '</button>';
  showPanel('account', headRow('บัญชี'), body);
  setSheet('full');
  $('#a-out').onclick = function () { Store.signOut(); };
  if (!DEMO && S.user.isAdmin) {
    var load = function () {
      Store.listMembers().then(function (ms) {
        var box = $('#m-list'); if (!box) return;
        box.innerHTML = ms.map(function (m) {
          var self = m.email === S.user.email.toLowerCase();
          return '<div class="mrow"><span>' + esc(m.email) + (m.is_admin ? ' <b class="badge ok">ผู้ดูแล</b>' : '') + '</span>' + (self ? '' : '<button type="button" data-a="adm" data-e="' + esc(m.email) + '" data-v="' + (m.is_admin ? '0' : '1') + '">' + (m.is_admin ? 'ถอดผู้ดูแล' : 'ตั้งเป็นผู้ดูแล') + '</button><button type="button" data-a="rm" data-e="' + esc(m.email) + '">ลบ</button>') + '</div>';
        }).join('');
      }).catch(function (er) { var box = $('#m-list'); if (box) box.innerHTML = '<p class="hint">' + esc(errText(er)) + '</p>'; });
    };
    load();
    $('#m-add').onsubmit = function (e) { e.preventDefault(); var v = $('#m-email').value.trim(); if (!v) return; Store.addMember(v).then(function () { $('#m-email').value = ''; toast('เพิ่มอีเมลแล้ว'); load(); }).catch(function (er) { toast(errText(er), 5000); }); };
    $('#m-list').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var pr = b.dataset.a === 'rm' ? Store.removeMember(b.dataset.e) : Store.setAdmin(b.dataset.e, b.dataset.v === '1');
      pr.then(load).catch(function (er) { toast(errText(er), 5000); });
    };
  }
}

/* ================= auth overlay ================= */
var authBox = $('#auth');
function authCard(inner) { authBox.innerHTML = '<div class="card">' + inner + '</div>'; authBox.hidden = false; }
function showSetup() {
  authCard('<h1>' + ICON.radar + 'Spot Radar</h1><p>ยังไม่ได้ตั้งค่าฐานข้อมูล</p><p>ใส่ <b>Project URL</b> และ <b>anon / publishable key</b> ของ Supabase ในไฟล์ <code>config.js</code> แล้วโหลดหน้านี้ใหม่</p>');
}
function showAuth(mode, msg) {
  mode = mode || 'in';
  var title = mode === 'in' ? 'เข้าสู่ระบบ' : mode === 'up' ? 'สมัครสมาชิก' : mode === 'reset' ? 'ลืมรหัสผ่าน' : 'ตั้งรหัสผ่านใหม่';
  var html = '<h1>' + ICON.radar + 'Spot Radar</h1><p>' + (mode === 'up' ? 'สมัครได้เฉพาะอีเมลที่ผู้ดูแลกลุ่มเพิ่มไว้ในรายชื่อ' : mode === 'reset' ? 'ใส่อีเมลที่สมัครไว้ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้' : mode === 'newpw' ? 'ตั้งรหัสผ่านใหม่สำหรับบัญชีนี้' : 'แผนที่นี้เปิดให้เฉพาะสมาชิกกลุ่ม') + '</p><form id="auth-form" class="stack" novalidate>';
  if (mode !== 'newpw') html += '<label class="field"><span>อีเมล</span><input class="input" id="au-email" type="email" autocomplete="email" inputmode="email" required></label>';
  if (mode !== 'reset') html += '<label class="field"><span>' + (mode === 'newpw' ? 'รหัสผ่านใหม่' : 'รหัสผ่าน') + (mode !== 'in' ? ' (อย่างน้อย 6 ตัวอักษร)' : '') + '</span><input class="input" id="au-pw" type="password" autocomplete="' + (mode === 'in' ? 'current-password' : 'new-password') + '" minlength="6" required></label>';
  html += '<div class="err" id="au-err" role="alert">' + esc(msg || '') + '</div><button class="btn primary" type="submit" id="au-go">' + title + '</button></form>';
  if (mode === 'in') html += '<button type="button" class="linkbtn" data-m="up">ยังไม่มีบัญชี? สมัครสมาชิก</button><button type="button" class="linkbtn" data-m="reset">ลืมรหัสผ่าน</button>';
  else if (mode !== 'newpw') html += '<button type="button" class="linkbtn" data-m="in">กลับไปหน้าเข้าสู่ระบบ</button>';
  authCard(html);
  authBox.querySelectorAll('.linkbtn').forEach(function (b) { b.onclick = function () { showAuth(b.dataset.m); }; });
  $('#auth-form').onsubmit = function (e) {
    e.preventDefault();
    var email = $('#au-email') ? $('#au-email').value.trim() : '', pw = $('#au-pw') ? $('#au-pw').value : '';
    var err = $('#au-err'), go = $('#au-go');
    if (mode !== 'newpw' && !/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'ใส่อีเมลให้ถูกต้อง'; return; }
    if (mode !== 'reset' && pw.length < 6) { err.textContent = 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร'; return; }
    err.textContent = ''; go.disabled = true;
    var pr = mode === 'in' ? Store.signIn(email, pw) : mode === 'up' ? Store.signUp(email, pw) : mode === 'reset' ? Store.resetPw(email) : Store.setPassword(pw);
    pr.then(function (data) {
      go.disabled = false;
      if (mode === 'up' && !(data && data.session)) showAuth('in', 'สมัครแล้ว เปิดลิงก์ยืนยันในอีเมลก่อน แล้วกลับมาเข้าสู่ระบบ');
      else if (mode === 'reset') showAuth('in', 'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว');
      else if (mode === 'newpw') { authBox.hidden = true; toast('ตั้งรหัสผ่านใหม่แล้ว'); }
    }).catch(function (er) { go.disabled = false; err.textContent = errText(er); });
  };
}

var pendingMsg = '';
function enter(user) {
  Store.member(user.email).then(function (m) {
    if (!m) { pendingMsg = 'บัญชีนี้ไม่อยู่ในรายชื่อที่อนุญาต ให้ผู้ดูแลกลุ่มเพิ่มอีเมลก่อน'; Store.signOut(); showAuth('in', pendingMsg); return; }
    S.user = { id: user.id, email: user.email, isAdmin: !!m.is_admin };
    authBox.hidden = true;
    var cached = !DEMO ? store.get('pts.' + user.id, null) : null;
    if (cached && cached.length && !S.points.size) { setPoints(cached.map(normPoint)); if (!S.fix) fitAll(); }
    return Store.load().then(function (pts) {
      var firstPaint = !S.points.size;
      setPoints(pts);
      if (!DEMO) store.set('pts.' + user.id, pts);
      if (firstPaint && !S.fix) fitAll();
      Store.subscribe(applyChange);
      startGPS(); syncWake();
    });
  }).catch(function (er) {
    if (S.points.size) { toast('ใช้ข้อมูลที่เก็บไว้ในเครื่อง: ' + errText(er), 6000); startGPS(); }
    else showAuth('in', errText(er));
  });
}
function onAuth(ev, session) {
  if (ev === 'PASSWORD_RECOVERY') { showAuth('newpw'); return; }
  if (session && session.user) {
    if (S.user && S.user.id === session.user.id) return;
    enter(session.user);
  } else {
    if (S.user) store.del('pts.' + S.user.id);
    S.user = null; stopGPS(); setPoints([]); showAuth('in', pendingMsg); pendingMsg = '';
  }
}

/* ================= wiring ================= */
$('#btn-locate').onclick = function () {
  unlockAudio();
  if (!me.disp) { if (S.gps === 'blocked' || S.gps === 'idle' || S.gps === 'none') { stopGPS(); startGPS(); } toast(S.gps === 'none' ? 'เบราว์เซอร์นี้ไม่รองรับ GPS' : 'กำลังหาตำแหน่งของคุณ…'); return; }
  setFollow(true); fly(me.disp, Math.max(map.getZoom(), 15));
};
$('#hud-gps-btn').onclick = function () { $('#btn-locate').onclick(); };
$('#hud-near-btn').onclick = function () { if (S.near.length) selectPoint(S.near[0], true); else toast('ยังไม่รู้ตำแหน่งของคุณ'); };
$('#btn-add').onclick = function () { if (!S.user) return; beginAdd(null); };
$('#btn-settings').onclick = function () { if (S.view === 'settings') { showList(); setSheet('peek'); } else openSettings(); };
$('#btn-account').onclick = function () { if (S.view === 'account') { showList(); setSheet('peek'); } else openAccount(); };

applyThemeSetting();
if (SET.theme !== 'auto') onThemeChange();
if (DEMO) $('#mode-tag').hidden = false;
setSheet('peek'); renderChips(); renderList(); updateHud();
setTimeout(function () { map.invalidateSize(); refreshSheetGeometry(); }, 60);
if (!Store) showSetup(); else Store.init(onAuth);

/* keep state across a live update of the page */
if (window.claude && window.claude.hot && window.claude.hot.snapshot) { try { window.claude.hot.snapshot(function () { return {}; }); } catch (e) {} }
window.__sr = { S: S, me: me, map: map, simulateAt: simulateAt, SET: SET };
})();
