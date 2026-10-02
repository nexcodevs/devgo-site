// @ts-check
/**
 * Medição: Vercel Web Analytics (sem cookies, dados agregados) e a origem da
 * visita, que segue com o lead para o Pipedrive.
 *
 * - `track(nome, dados)` registra um evento de conversão. Sem o script da
 *   Vercel (testes, bloqueadores), os eventos ficam na fila e nada quebra.
 * - A primeira página da visita guarda UTMs, referência e página de entrada
 *   na sessionStorage; `leadOrigin()` monta o texto que vai na nota do lead.
 */

const STORAGE_KEY = 'devgo:origem';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const MAX_ORIGIN = 480; // a API aceita até 500 caracteres

/** @typedef {Record<string, string | number | boolean>} EventData */

/** Fila do Vercel Analytics: o script oficial consome `window.vaq` ao carregar. */
function va() {
  const w = /** @type {any} */ (window);
  w.va = w.va || function queue(/** @type {unknown[]} */ ...params) { (w.vaq = w.vaq || []).push(params); };
  return /** @type {(...params: unknown[]) => void} */ (w.va);
}

/**
 * Registra um evento de conversão. Nunca envie dados pessoais aqui.
 * @param {string} name @param {EventData} [data]
 */
export function track(name, data) {
  try { va()('event', data ? { name, data } : { name }); } catch { /* medição nunca derruba a página */ }
}

/** @param {() => string | null} fn */
const safe = (fn) => { try { return fn(); } catch { return null; } };

/**
 * Origem da primeira página da visita, a partir da URL e da referência.
 * @param {string} href @param {string} referrer
 * @returns {Record<string, string>}
 */
export function firstTouch(href, referrer) {
  const url = new URL(href);
  /** @type {Record<string, string>} */
  const touch = { entrada: url.pathname };
  for (const key of UTM_KEYS) {
    const value = url.searchParams.get(key);
    if (value) touch[key] = value.slice(0, 80);
  }
  const ref = safe(() => new URL(referrer).hostname);
  if (ref && ref !== url.hostname) touch.referencia = ref.replace(/^www\./, '');
  if (url.searchParams.has('gclid')) touch.utm_source ??= 'google-ads';
  if (url.searchParams.has('fbclid')) touch.referencia ??= 'facebook';
  if (url.searchParams.has('li_fat_id')) touch.referencia ??= 'linkedin';
  return touch;
}

/**
 * Texto da origem para a nota do lead.
 * @param {Record<string, string> | null} touch @param {string} page página do envio
 */
export function describeOrigin(touch, page) {
  const parts = [];
  if (touch) {
    const campaign = ['utm_source', 'utm_medium', 'utm_campaign'].map((k) => touch[k]).filter(Boolean).join(' / ');
    if (campaign) parts.push(`campanha: ${campaign}`);
    if (touch.utm_term) parts.push(`termo: ${touch.utm_term}`);
    if (touch.utm_content) parts.push(`conteúdo: ${touch.utm_content}`);
    parts.push(touch.referencia ? `veio de: ${touch.referencia}` : campaign ? '' : 'veio de: acesso direto');
    parts.push(`entrou por: ${touch.entrada}`);
  }
  parts.push(`enviou de: ${page}`);
  return parts.filter(Boolean).join(' · ').slice(0, MAX_ORIGIN);
}

/** Origem guardada na sessão (ou null sem armazenamento). @returns {Record<string, string> | null} */
function storedTouch() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Texto da origem da visita atual, para o formulário. */
export function leadOrigin() {
  return describeOrigin(storedTouch() ?? firstTouch(location.href, document.referrer), location.href.split('#')[0]);
}

/** Onde fica o botão, para comparar os CTAs entre si. @param {Element} el */
function placeOf(el) {
  const section = el.closest('section[id], footer, .cta-band, .article-cta, header');
  if (!section) return 'pagina';
  if (section.id) return section.id;
  return section.tagName === 'FOOTER' ? 'rodape' : section.className.split(' ')[0];
}

export function initAnalytics() {
  if (!storedTouch()) {
    const touch = firstTouch(location.href, document.referrer);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(touch)); } catch { /* sem armazenamento: o envio usa a página atual */ }
  }
  // cliques que levam ao formulário ("Montar meu time" e variações)
  document.addEventListener('click', (event) => {
    const link = /** @type {Element | null} */ (event.target instanceof Element ? event.target.closest('a[href$="#contato"]') : null);
    if (!link) return;
    track('CTA contato', { botao: (link.textContent ?? '').replace(/[→]/g, '').trim().slice(0, 40), local: placeOf(link), pagina: location.pathname });
  });
}
