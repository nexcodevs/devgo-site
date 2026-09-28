// @ts-check
/**
 * Globo pontilhado em canvas 2D com arcos saindo de São Paulo.
 * - Gira sozinho, e o usuário pode arrastar (inércia no soltar).
 * - Só anima enquanto está visível; com movimento reduzido, desenha um
 *   quadro estático e redesenha apenas durante o arraste.
 */
import { byId, reducedMotion, watchVisibility } from '../core/dom.js';
import { HOME, CITIES } from '../data/locations.js';
import { LAND_POINTS } from '../data/globe-land.js';

/** @typedef {[number, number, number]} Vec3 */

const ARC_SEGMENTS = 64;
const REST_LON = -40;          // longitude em que o globo "descansa"
const VIEW_LAT = 16;
const IDLE_BEFORE_DRIFT = 1.5; // s sem interação antes de voltar a girar sozinho
const MAX_DPR = 2;
const DEG = Math.PI / 180;

const COLORS = {
  atmosphere: 'rgba(60,60,243,.42)',
  atmosphereFade: 'rgba(60,60,243,0)',
  body: ['#1B1B5E', '#0D0D33', '#07071C'],
  rim: 'rgba(156,156,255,.35)',
  landNear: '#DEDEFF',
  landFar: '#9C9CFF',
  arc: 'rgba(156,156,255,.55)',
  arcActive: 'rgba(255,255,255,.95)',
  home: '#4ADE80',
  homeRing: '74,222,128',
  pillActive: '#3C3CF3',
  pill: 'rgba(10,10,20,.78)',
  pillBorderActive: '#9C9CFF',
};

/** @param {number} lat @param {number} lon @returns {Vec3} */
function toVec(lat, lon) {
  const a = lat * DEG, b = lon * DEG;
  return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
}

/** Rotaciona um ponto pela longitude L e latitude T da câmera. @param {Vec3} p @param {number} L @param {number} T @returns {Vec3} */
function rotate(p, L, T) {
  const cl = Math.cos(L), sl = Math.sin(L);
  const x = p[0] * cl - p[2] * sl, z = p[0] * sl + p[2] * cl, y = p[1];
  const ct = Math.cos(T), st = Math.sin(T);
  return [x, y * ct - z * st, y * st + z * ct];
}

/** @returns {Vec3[]} */
function decodeLand() {
  const points = [];
  for (let i = 0; i < LAND_POINTS.length; i += 6) {
    const lat = parseInt(LAND_POINTS.slice(i, i + 3), 36) / 10 - 90;
    const lon = parseInt(LAND_POINTS.slice(i + 3, i + 6), 36) / 10 - 180;
    points.push(toVec(lat, lon));
  }
  return points;
}

/** Arco elevado (interpolação esférica) entre dois pontos. @param {Vec3} from @param {Vec3} to @returns {Vec3[]} */
function arcBetween(from, to) {
  const angle = Math.acos(from[0] * to[0] + from[1] * to[1] + from[2] * to[2]);
  const sin = Math.sin(angle);
  const points = [];
  for (let j = 0; j <= ARC_SEGMENTS; j++) {
    const s = j / ARC_SEGMENTS;
    const k1 = Math.sin((1 - s) * angle) / sin, k2 = Math.sin(s * angle) / sin;
    const lift = 1 + (0.06 + angle * 0.16) * Math.sin(Math.PI * s);
    points.push(/** @type {Vec3} */ ([(from[0] * k1 + to[0] * k2) * lift, (from[1] * k1 + to[1] * k2) * lift, (from[2] * k1 + to[2] * k2) * lift]));
  }
  return points;
}

/**
 * @param {{ timeZone: string | null }} highlight cidade em destaque no painel de fusos
 */
export function initGlobe(highlight) {
  const canvas = byId('globe', HTMLCanvasElement);
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // canvas indisponível: o texto alternativo continua descrevendo o globo

  const land = decodeLand();
  const home = toVec(...HOME.coords);
  const routes = CITIES.map((city, k) => {
    const target = toVec(...city.coords);
    return { timeZone: city.timeZone, name: city.name, target, arc: arcBetween(home, target), delay: k * 0.18 };
  });

  const view = { lon: REST_LON, lat: VIEW_LAT };
  let width = 0, dpr = 1;
  let velocity = 0, idle = 0, intro = 0;
  let startedAt = performance.now(), lastFrame = 0;
  let rafId = 0, running = false;
  /** @type {{ x: number, lon: number, lastX: number, lastT: number } | null} */
  let drag = null;

  const measure = () => {
    width = canvas.getBoundingClientRect().width;
    dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(width * dpr);
  };

  /** @param {number} x @param {number} y @param {string} text @param {boolean} active */
  const drawLabel = (x, y, text, active) => {
    const small = width < 420;
    ctx.font = `500 ${small ? 10 : 12}px "PP Neue Montreal", system-ui, sans-serif`;
    const w = ctx.measureText(text).width + 16, h = small ? 20 : 24;
    let rx = x + 10;
    const ry = y - h - 6;
    if (rx + w > width - 4) rx = x - 10 - w;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(rx, ry, w, h, h / 2); else ctx.rect(rx, ry, w, h);
    ctx.fillStyle = active ? COLORS.pillActive : COLORS.pill;
    ctx.fill();
    ctx.strokeStyle = active ? COLORS.pillBorderActive : COLORS.rim;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, rx + 8, ry + h / 2 + 0.5);
  };

  /** @param {number} now */
  const draw = (now) => {
    if (!width) measure();
    const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000);
    lastFrame = now;
    const t = (now - startedAt) / 1000;
    intro = Math.min(1, intro + dt * 0.5);

    if (!drag) {
      idle += dt;
      view.lon += velocity * dt;
      velocity *= Math.pow(0.08, dt);
      if (idle > IDLE_BEFORE_DRIFT) view.lon += (REST_LON + Math.sin(t * 0.12) * 18 - view.lon) * Math.min(1, dt * 0.6);
    }

    const L = view.lon * DEG, T = view.lat * DEG;
    const R = width * 0.4, cx = width / 2, cy = width / 2;
    /** @param {Vec3} q */
    const project = (q) => [cx + q[0] * R, cy - q[1] * R];

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, width);

    // atmosfera, corpo e borda
    const atmosphere = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.22);
    atmosphere.addColorStop(0, COLORS.atmosphere);
    atmosphere.addColorStop(1, COLORS.atmosphereFade);
    ctx.fillStyle = atmosphere;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2); ctx.fill();
    const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    COLORS.body.forEach((color, i) => body.addColorStop([0, 0.6, 1][i], color));
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COLORS.rim; ctx.lineWidth = 1; ctx.stroke();

    // continentes: só o hemisfério visível (z > 0)
    for (const point of land) {
      const q = rotate(point, L, T);
      if (q[2] <= 0) continue;
      const size = 1.1 + q[2] * 1.3;
      ctx.globalAlpha = 0.25 + q[2] * 0.75;
      ctx.fillStyle = q[2] > 0.55 ? COLORS.landNear : COLORS.landFar;
      ctx.fillRect(cx + q[0] * R - size / 2, cy - q[1] * R - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    const sheen = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, 0, cx - R * 0.4, cy - R * 0.45, R * 0.9);
    sheen.addColorStop(0, 'rgba(255,255,255,.09)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    /** @type {Array<[number, number, string, boolean]>} */
    const labels = [];
    ctx.lineCap = 'round';
    for (const route of routes) {
      const active = highlight.timeZone === route.timeZone;
      const progress = Math.max(0, Math.min(1, intro * 1.9 - route.delay));
      const drawn = Math.round(progress * ARC_SEGMENTS);
      // [x, y, visível?] — o arco some quando passa por trás do globo
      const pts = route.arc.map((p) => {
        const q = rotate(p, L, T);
        const [x, y] = project(q);
        const dx = x - cx, dy = y - cy;
        return /** @type {[number, number, boolean]} */ ([x, y, q[2] > 0 || dx * dx + dy * dy > R * R]);
      });
      const segment = (/** @type {number} */ j) => pts[j][2] && pts[j - 1][2];

      for (let j = 1; j <= drawn; j++) {
        if (!segment(j)) continue;
        ctx.beginPath(); ctx.moveTo(pts[j - 1][0], pts[j - 1][1]); ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.strokeStyle = active ? COLORS.arcActive : COLORS.arc;
        ctx.lineWidth = active ? 2.2 : 1.4;
        ctx.stroke();
      }

      if (progress < 1) continue;
      // cometa percorrendo o arco
      const head = ((t * 0.45 + route.delay) % 1) * ARC_SEGMENTS, tail = 14;
      for (let j = Math.max(1, Math.floor(head - tail)); j <= Math.min(ARC_SEGMENTS, Math.floor(head)); j++) {
        if (!segment(j)) continue;
        const alpha = 1 - (head - j) / tail;
        ctx.beginPath(); ctx.moveTo(pts[j - 1][0], pts[j - 1][1]); ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.95).toFixed(3)})`;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }

      const q = rotate(route.target, L, T);
      if (q[2] <= 0) continue;
      const [x, y] = project(q);
      const pulse = ((t * 0.8 + route.delay * 3) % 1.6) / 1.6;
      ctx.beginPath(); ctx.arc(x, y, 3 + pulse * 12, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(156,156,255,${(0.7 * (1 - pulse)).toFixed(3)})`; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, active ? 5 : 3.6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      labels.push([x, y, route.name, active]);
    }

    const h = rotate(home, L, T);
    if (h[2] > 0) {
      const [hx, hy] = project(h);
      const pulse = (t % 1.8) / 1.8;
      ctx.beginPath(); ctx.arc(hx, hy, 6 + pulse * 22, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${COLORS.homeRing},${(0.75 * (1 - pulse)).toFixed(3)})`; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.home; ctx.fill(); ctx.strokeStyle = '#0A0A0A'; ctx.lineWidth = 2; ctx.stroke();
      labels.push([hx, hy + 34, HOME.name, true]);
    }

    // rótulos de cima para baixo, empurrando para baixo os que colidem
    labels.sort((a, b) => a[1] - b[1]);
    /** @type {Array<[number, number]>} */
    const placed = [];
    for (const [x, y0, text, active] of labels) {
      let y = y0;
      for (const [px, py] of placed) if (Math.abs(px - x) < 90 && Math.abs(py - y) < 26) y = py + 26;
      placed.push([x, y]);
      drawLabel(x, y, text, active);
    }
  };

  const loop = (/** @type {number} */ now) => {
    draw(now);
    rafId = running ? requestAnimationFrame(loop) : 0;
  };
  const start = () => {
    if (running) return;
    running = true;
    lastFrame = 0;
    if (!rafId) rafId = requestAnimationFrame(loop);
  };
  const stop = () => { running = false; };
  const redraw = () => { if (!rafId) rafId = requestAnimationFrame(loop); };

  canvas.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, lon: view.lon, lastX: event.clientX, lastT: performance.now() };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const degPerPx = 180 / (width * 0.9);
    const now = performance.now();
    view.lon = drag.lon + (event.clientX - drag.x) * degPerPx;
    velocity = (event.clientX - drag.lastX) * degPerPx / Math.max(0.016, (now - drag.lastT) / 1000);
    drag.lastX = event.clientX;
    drag.lastT = now;
    idle = 0;
    if (!running) redraw();
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    idle = 0;
    canvas.classList.remove('is-dragging');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', () => { width = 0; if (!running) redraw(); });

  if (reducedMotion) {
    // quadro estático já com os arcos completos
    intro = 1;
    startedAt = performance.now() - 4000;
    redraw();
    return;
  }
  watchVisibility(canvas, (visible) => (visible ? start() : stop()), { threshold: 0.05 });
  redraw();
}
