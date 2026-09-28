// @ts-check
/**
 * "Devgo em números": contadores, matriz de pontos, barras dos anos e o
 * seletor "quantos profissionais você precisa?".
 */
import { byId, closest, queryAll, reducedMotion, onceVisible } from '../core/dom.js';
import { prefillSubject } from './contact-form.js';

const MATRIX_CELLS = 90;
const MATRIX_STAGGER_MS = 14;
const COUNTER_DURATION_MS = 1200;

/**
 * Embaralhamento de Fisher–Yates (sem o viés de `sort(() => Math.random() - .5)`).
 * @template T
 * @param {T[]} items
 * @returns {T[]}
 */
export function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Anima o número de 0 até o valor final, com desaceleração. @param {HTMLElement} el */
function countUp(el) {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix ?? '';
  const start = performance.now();
  const tick = (/** @type {number} */ now) => {
    const progress = Math.min(1, (now - start) / COUNTER_DURATION_MS);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = `${Math.round(target * eased)}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initBento() {
  const section = /** @type {HTMLElement} */ (document.querySelector('.numbers'));
  const matrix = byId('tile-matrix');
  matrix.append(...Array.from({ length: MATRIX_CELLS }, () => document.createElement('i')));

  // a matriz acende em ordem aleatória; o atraso fica no CSS, sem 90 timers
  shuffle([...matrix.children]).forEach((cell, order) => {
    /** @type {HTMLElement} */ (cell).style.transitionDelay = reducedMotion ? '0ms' : `${order * MATRIX_STAGGER_MS}ms`;
  });
  queryAll('.tile-bars i', section).forEach((bar, i) => bar.style.setProperty('--n', String(i)));

  const light = () => {
    section.classList.remove('is-pending');
    for (const cell of matrix.children) cell.classList.add('is-on');
  };
  if (reducedMotion) { light(); return; }
  section.classList.add('is-pending');
  onceVisible(/** @type {Element} */ (section.querySelector('.bento')), light, { threshold: 0.3 });

  const counters = queryAll('[data-count]', section);
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      countUp(/** @type {HTMLElement} */ (entry.target));
    }
  }, { threshold: 0.5 });
  counters.forEach((el) => observer.observe(el));
}

function initQuantityPicker() {
  const picker = byId('qty');
  picker.addEventListener('click', (event) => {
    const option = closest(event.target, '.qty-options button');
    if (option) {
      queryAll('.qty-options button', picker).forEach((b) => b.setAttribute('aria-pressed', String(b === option)));
      return;
    }
    if (!closest(event.target, '.qty-go')) return;
    const amount = picker.querySelector('[aria-pressed="true"]')?.textContent ?? '';
    if (amount) prefillSubject(`Alocar ${amount === '1' ? '1 profissional' : `${amount} profissionais`}`);
  });
}

export function initNumbers() {
  initBento();
  initQuantityPicker();
}
