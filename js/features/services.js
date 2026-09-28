// @ts-check
/**
 * Soluções: acordeão horizontal com avanço automático.
 * Cada item tem uma barra de progresso (animação CSS `svcFill`); quando ela
 * termina, o próximo item abre. Pausa com hover/foco e fora da viewport;
 * fica estático no celular e com movimento reduzido.
 */
import { byId, closest, html, render, queryAll, reducedMotion, watchVisibility } from '../core/dom.js';
import { SERVICES, SQUAD_EXAMPLE, LEADERSHIP_EXAMPLE, MATCH_SCORES } from '../data/services.js';

const AUTOPLAY_MS = 6000;
const STATIC_QUERY = '(max-width:900px)';
const ROLE_TONES = [
  { bg: '#3C3CF3', fg: '#fff' },
  { bg: '#9C9CFF', fg: '#150B95' },
  { bg: '#DEDEFF', fg: '#150B95' },
];

/** @param {string} photo @param {string} title @param {string} caption @param {string} badge */
const person = (photo, title, caption, badge) => html`<div class="viz-person"><img src="assets/${photo}" alt=""><div><strong>${title}</strong><small>${caption}</small></div><span class="viz-badge">${badge}</span></div>`;

/** @param {string} left @param {string} right */
const vizTop = (left, right) => html`<div class="viz-top"><span>${left}</span><span>${right}</span></div>`;

/** @type {Record<import('../data/services.js').VizKind, () => import('../core/dom.js').SafeHtml>} */
const VIZ = {
  alloc: () => html`${vizTop('Alocação ativa', 'Regime full-time')}<div class="viz-card">${person('fv1.jpg', 'Dev Sênior · Back-end', 'no time do cliente', '100% dedicado')}<div class="viz-week">${['seg', 'ter', 'qua', 'qui', 'sex'].map((day) => html`<div>${day}</div>`)}</div></div><div class="viz-note">› Mesma rotina, ferramentas e rituais do seu time</div>`,
  squad: () => html`${vizTop('Squad · seu produto', '6 pessoas')}<div class="viz-card"><div class="viz-roles">${SQUAD_EXAMPLE.map(([role, initials, tone]) => html`<div class="viz-role"><i style="--role-bg:${ROLE_TONES[tone].bg};--role-fg:${ROLE_TONES[tone].fg}">${initials}</i>${role}</div>`)}</div></div><div class="viz-note">› Montado para rodar junto desde a primeira sprint</div>`,
  lead: () => html`${vizTop('Camada de gestão', '100% dedicada')}<div class="viz-card">${LEADERSHIP_EXAMPLE.map(([role, focus]) => html`<div class="viz-row"><span>${role}</span><span>${focus}</span></div>`)}</div><div class="viz-note">› Liderança dentro do seu time, não consultoria de fora</div>`,
  match: () => html`${vizTop('Match com IA · hunting direto', '1 de 8.000+')}<div class="viz-card">${person('fv2.jpg', 'Candidata · Sênior', 'back-end · contratação direta', 'match 90%')}${MATCH_SCORES.map(([label, score]) => html`<div class="viz-score"><div><span>${label}</span><b>${score}%</b></div><div class="viz-bar"><b style="--value:${score}%"></b></div></div>`)}</div><div class="viz-note">› Aprovada para entrevista com o seu time (notas ilustrativas)</div>`,
};

/** @param {number} i */
const ordinal = (i) => String(i + 1).padStart(2, '0');

export function initServices() {
  const root = byId('services');

  render(root, html`${SERVICES.map((svc, i) => html`
    <div class="svc-item">
      <button type="button" class="svc-head" aria-expanded="false" aria-controls="svc-body-${i}"><span class="svc-num">${ordinal(i)}</span><span class="svc-title">${svc.title}</span><span class="svc-plus" aria-hidden="true">+</span></button>
      <div class="svc-body" id="svc-body-${i}" role="region" aria-label="${svc.title}">
        <div class="svc-copy"><span class="svc-kicker">${ordinal(i)} · ${svc.subtitle}</span><h3>${svc.title}</h3><p>${svc.description}</p><ul class="svc-list">${svc.bullets.map((b) => html`<li>${b}</li>`)}</ul><div class="svc-ideal"><b>Ideal para:</b> ${svc.idealFor}</div><a class="btn btn-blue" href="#contato">Quero este modelo <span class="arrow" aria-hidden="true">→</span></a></div>
        <div class="viz">${VIZ[svc.viz]()}</div>
      </div>
      <i class="svc-progress" aria-hidden="true"><i></i></i>
    </div>`)}`);

  const items = queryAll('.svc-item', root);
  let active = 0;
  let hovered = false;
  let visible = false;

  const show = (/** @type {number} */ index) => {
    active = index;
    items.forEach((item, i) => {
      item.classList.toggle('is-active', i === active);
      item.classList.toggle('is-done', i < active);
      item.querySelector('.svc-head')?.setAttribute('aria-expanded', String(i === active));
    });
    // recomeça a barra do item ativo do zero
    const bar = /** @type {HTMLElement | null} */ (items[active].querySelector('.svc-progress i'));
    if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
  };
  const syncPaused = () => root.classList.toggle('is-paused', hovered || !visible);
  const staticQuery = window.matchMedia(STATIC_QUERY);
  const syncStatic = () => root.classList.toggle('is-static', reducedMotion || staticQuery.matches);

  root.addEventListener('click', (event) => {
    const head = closest(event.target, '.svc-head');
    if (head) show(items.indexOf(/** @type {HTMLElement} */ (head.parentElement)));
  });
  root.addEventListener('animationend', (event) => {
    if (event.animationName === 'svcFill') show((active + 1) % items.length);
  });
  root.addEventListener('mouseenter', () => { hovered = true; syncPaused(); });
  root.addEventListener('mouseleave', () => { hovered = false; syncPaused(); });
  root.addEventListener('focusin', () => { hovered = true; syncPaused(); });
  root.addEventListener('focusout', () => { hovered = false; syncPaused(); });
  staticQuery.addEventListener('change', syncStatic);
  watchVisibility(root, (isVisible) => { visible = isVisible; syncPaused(); }, { threshold: 0.35 });

  root.style.setProperty('--svc-duration', `${AUTOPLAY_MS}ms`);
  syncStatic();
  syncPaused();
  show(0);
}
