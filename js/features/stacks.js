// @ts-check
/**
 * Stacks: filtros por categoria + órbita (desktop) / lista (celular).
 * Passar o mouse, focar ou clicar numa pílula mostra os detalhes; o botão do
 * card leva ao formulário com o assunto preenchido.
 */
import { byId, closest, html, render, queryAll } from '../core/dom.js';
import { CATEGORIES, STACKS } from '../data/stacks.js';
import { requestProfessional } from './contact-form.js';

const ALL = 'Todas';
const RINGS = [0.27, 0.37, 0.46]; // raios relativos dos três anéis
const CORE_SYMBOL = 'M455 238H993V751L1019 777H1477V1230C1477 1510 1300 1693 1019 1693H455V1267H860C950 1267 993 1215 993 1125V803L967 777H455Z';

/** @type {Map<string, import('../data/stacks.js').Category>} */
const categoryByName = new Map(CATEGORIES.map((c) => [c.name, c]));
/** @param {string} name */
const colorOf = (name) => categoryByName.get(name)?.color ?? '#3C3CF3';
/** @param {import('../data/stacks.js').Stack} stack */
const label = (stack) => stack.short ?? stack.name;

/** Posição (em %) de cada pílula: distribuídas no círculo, alternando entre os anéis. */
const PILL_POSITIONS = STACKS.map((_, i) => {
  const n = STACKS.length;
  const angle = (-90 + (i + 0.5) * 360 / n) * Math.PI / 180;
  // a última pílula pula um anel para não encostar na primeira
  const radius = RINGS[(i + (i === n - 1 ? 1 : 0)) % RINGS.length];
  return { x: 50 + Math.cos(angle) * radius * 100, y: 50 + Math.sin(angle) * radius * 100 };
});

/** Divisórias entre categorias: ângulo onde cada categoria começa. */
function separatorAngles() {
  let offset = 0;
  return CATEGORIES.map((category) => {
    const angle = -90 + offset * 360 / STACKS.length;
    offset += STACKS.filter((s) => s.category === category.name).length;
    return angle;
  });
}

export function initStacks() {
  const filters = byId('stk-filters');
  const panel = byId('stk-panel');
  let filter = ALL;
  let selected = 0;

  /** @param {import('../data/stacks.js').Stack} stack */
  const matches = (stack) => filter === ALL || stack.category === filter;

  render(filters, html`${[ALL, ...CATEGORIES.map((c) => c.name)].map((name) => name === ALL
    ? html`<button type="button" class="stk-filter" data-filter="${name}">${name}</button>`
    : html`<button type="button" class="stk-filter has-color" data-filter="${name}" style="--c:${colorOf(name)}">${name}</button>`)}`);

  render(panel, html`<div class="orbit"><div class="orbit-map">${RINGS.map((r) => html`<span class="orbit-ring" style="--r:${r}"></span>`)}${separatorAngles().map((a) => html`<span class="orbit-sep" style="--a:${a}deg"></span>`)}<div class="orbit-core"><svg viewBox="440 223 1052 1485" aria-hidden="true"><path d="${CORE_SYMBOL}"/></svg><span>${STACKS.length} stacks</span></div></div><div class="orbit-detail" id="orbit-detail" aria-live="polite"></div></div><div class="orbit-list"></div>`);

  const orbitMap = /** @type {HTMLElement} */ (panel.querySelector('.orbit-map'));
  const detail = byId('orbit-detail');
  const list = /** @type {HTMLElement} */ (panel.querySelector('.orbit-list'));

  const drawDetail = () => {
    const stack = STACKS[selected];
    const category = categoryByName.get(stack.category);
    detail.style.setProperty('--c', colorOf(stack.category));
    render(detail, html`<span class="orbit-cat"><i></i>${stack.category}${stack.hot ? html` · <b>Alta demanda</b>` : ''}</span><h3>${stack.name}</h3><div class="orbit-tags">${stack.tags.map((tag) => html`<span>${tag}</span>`)}</div><div class="orbit-roles"><small>Perfis que alocamos</small>${(category?.roles ?? []).join(' · ')}</div><button type="button" class="btn btn-blue orbit-cta" data-stack="${stack.name}">Preciso de alguém em ${label(stack)} <span class="arrow" aria-hidden="true">→</span></button>`);
  };

  /** @param {number} index */
  const select = (index) => {
    selected = index;
    queryAll('.orbit-pill', orbitMap).forEach((pill) => pill.classList.toggle('is-active', Number(pill.dataset.index) === index));
    drawDetail();
  };

  const draw = () => {
    queryAll('.stk-filter', filters).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    // se a stack selecionada saiu do filtro, seleciona a primeira que ficou
    if (!matches(STACKS[selected])) selected = Math.max(0, STACKS.findIndex(matches));

    // pílulas são recriadas a cada filtro para a animação de entrada recomeçar
    queryAll('.orbit-pill', orbitMap).forEach((pill) => pill.remove());
    orbitMap.insertAdjacentHTML('beforeend', html`${STACKS.map((stack, i) => html`<button type="button" class="orbit-pill${matches(stack) ? '' : ' is-dimmed'}${i === selected ? ' is-active' : ''}" data-index="${i}"${matches(stack) ? '' : html` tabindex="-1"`} style="--x:${PILL_POSITIONS[i].x.toFixed(2)}%;--y:${PILL_POSITIONS[i].y.toFixed(2)}%;--c:${colorOf(stack.category)};--delay:${(i * 0.03).toFixed(2)}s" aria-label="${stack.name}">${label(stack)}${stack.hot ? html`<i></i>` : ''}</button>`)}`.value);

    render(list, html`${CATEGORIES.filter((c) => filter === ALL || c.name === filter).map((category) => html`<div class="orbit-group" style="--c:${category.color}"><b>${category.name}</b><div>${STACKS.filter((s) => s.category === category.name).map((stack) => html`<button type="button" class="orbit-chip" data-stack="${stack.name}">${stack.name}${stack.hot ? html`<i></i>` : ''}</button>`)}</div></div>`)}`);

    drawDetail();
  };

  filters.addEventListener('click', (event) => {
    const button = closest(event.target, '.stk-filter');
    if (!button?.dataset.filter) return;
    filter = button.dataset.filter;
    draw();
  });

  /** @param {Event} event */
  const pickFromEvent = (event) => {
    const pill = closest(event.target, '.orbit-pill');
    if (pill && !pill.classList.contains('is-dimmed')) select(Number(pill.dataset.index));
    return pill;
  };
  panel.addEventListener('mouseover', pickFromEvent);
  panel.addEventListener('focusin', pickFromEvent);
  panel.addEventListener('click', (event) => {
    if (pickFromEvent(event)) return;
    const request = closest(event.target, '[data-stack]');
    if (request?.dataset.stack) requestProfessional(`Alocar profissional de ${request.dataset.stack}`);
  });

  draw();
}
