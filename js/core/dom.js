// @ts-check
/**
 * Utilitários de DOM compartilhados por todas as features.
 * Nenhum módulo acessa o DOM "no escuro": elementos obrigatórios passam por
 * `byId`, que falha com uma mensagem clara em vez de um TypeError genérico.
 */

/**
 * Retorna o elemento pelo id ou lança um erro descritivo.
 * @template {HTMLElement} T
 * @param {string} id
 * @param {new (...args: any[]) => T} [type] classe esperada (ex.: HTMLFormElement)
 * @returns {T}
 */
export function byId(id, type) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  if (type && !(el instanceof type)) throw new Error(`#${id} não é ${type.name}`);
  return /** @type {T} */ (el);
}

/**
 * @param {string} selector
 * @param {ParentNode} [root]
 * @returns {HTMLElement[]}
 */
export function queryAll(selector, root = document) {
  return /** @type {HTMLElement[]} */ (Array.from(root.querySelectorAll(selector)));
}

/**
 * `closest` a partir do alvo de um evento, tolerando alvos que não são elementos.
 * @param {EventTarget | null} target
 * @param {string} selector
 * @returns {HTMLElement | null}
 */
export function closest(target, selector) {
  return target instanceof Element ? /** @type {HTMLElement | null} */ (target.closest(selector)) : null;
}

/* ---------- HTML seguro ---------- */

/** Trecho de HTML já confiável: não é escapado de novo ao ser interpolado. */
export class SafeHtml {
  /** @param {string} value */
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

/** @type {Record<string, string>} */
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** @param {unknown} value */
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

/**
 * Marca uma string como HTML confiável (use só para conteúdo estático do próprio site).
 * @param {string} value
 */
export const trusted = (value) => new SafeHtml(value);

/** @param {unknown} value @returns {string} */
function renderValue(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  if (value === null || value === undefined || value === false) return '';
  return escapeHtml(value);
}

/**
 * Template tag que escapa toda interpolação, exceto `SafeHtml` e listas deles.
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {SafeHtml}
 */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => { out += renderValue(value) + strings[i + 1]; });
  return new SafeHtml(out);
}

/**
 * @param {Element} el
 * @param {SafeHtml} content
 */
export function render(el, content) {
  el.innerHTML = content.value;
}

/* ---------- Caminhos ---------- */

/**
 * URL de um arquivo em assets/, resolvida a partir deste módulo (e não da
 * página), para funcionar em qualquer profundidade de URL e em qualquer host.
 * @param {string} file
 */
export const assetUrl = (file) => new URL(`../../assets/${file}`, import.meta.url).href;

/* ---------- Plataforma ---------- */

/** Preferência do sistema por menos movimento, lida uma vez na carga. */
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Chama `onEnter` uma única vez, quando `el` entra na viewport.
 * @param {Element} el
 * @param {() => void} onEnter
 * @param {IntersectionObserverInit} [options]
 */
export function onceVisible(el, onEnter, options) {
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    onEnter();
  }, options);
  observer.observe(el);
}

/**
 * Informa sempre que `el` entra ou sai da viewport.
 * @param {Element} el
 * @param {(visible: boolean) => void} onChange
 * @param {IntersectionObserverInit} [options]
 */
export function watchVisibility(el, onChange, options) {
  new IntersectionObserver((entries) => {
    onChange(entries[entries.length - 1].isIntersecting);
  }, options).observe(el);
}

/**
 * Reinicia uma animação CSS no elemento (remove e reaplica a classe).
 * @param {Element} el
 * @param {string} className
 */
export function replayClass(el, className) {
  el.classList.remove(className);
  void (/** @type {HTMLElement} */ (el)).offsetWidth; // força reflow para a animação recomeçar
  el.classList.add(className);
}
