// Blocos pré-renderizados no build a partir de js/data, para que o conteúdo
// esteja no HTML (buscadores, leitores de tela e visitantes sem JS).
import { CATEGORIES, STACKS } from '../js/data/stacks.js';
import { PROFILE_GROUPS } from '../js/data/profiles.js';
import { SERVICES } from '../js/data/services.js';

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Vínculo de cada modelo: só o hunting leva o profissional para a folha do cliente. */
const BOND = {
  alloc: 'Contrato com a Devgo',
  squad: 'Contrato com a Devgo',
  lead: 'Contrato com a Devgo',
  match: 'Contratação efetiva, na sua folha',
};

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** "2026-09-28" → "28 set 2026" */
const formatDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

/** Artigos do mais recente para o mais antigo. */
const articlesOf = (pages) => pages.filter((p) => p.type === 'article').sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

const card = (a) => `<a class="insight-card" href="${a.path}">
          <span class="insight-meta">${esc(a.category)} · ${esc(a.readingTime)} de leitura</span>
          <h3>${esc(a.title.replace(/ · Insights Devgo$/, ''))}</h3>
          <p>${esc(a.summary)}</p>
          <span class="insight-more">Ler artigo <span class="arrow" aria-hidden="true">→</span></span>
        </a>`;

export const RENDERERS = {
  /** Home: prévia de perfis e stacks em blocos, com links para a página de especialidades. */
  'specialties-preview': () => {
    const roles = PROFILE_GROUPS.reduce((n, g) => n + g.roles.length, 0);
    const tile = ({ href, color, icon, title, items, count }) => `<a class="spec-tile" href="${href}" style="--c:${color}">
            <span class="spec-tile-mark">${icon ? `<img src="/assets/${icon}" alt="">` : ''}</span>
            <strong>${esc(title)}</strong>
            <span class="spec-tile-items">${items.map(esc).join(' · ')}</span>
            <em>${count}</em>
          </a>`;
    return `<div class="spec2">
      <div class="spec-row">
        <div class="spec-label"><h3>Perfis</h3><p>${PROFILE_GROUPS.length} áreas e ${roles} perfis, do produto à operação, para montar um squad completo.</p><a class="link-more" href="/especialidades#perfis">Monte seu squad <span class="arrow" aria-hidden="true">→</span></a></div>
        <div class="spec-tiles is-4">
          ${PROFILE_GROUPS.map((g) => tile({ href: '/especialidades#perfis', color: g.color, icon: g.icon, title: g.title, items: g.roles, count: `${g.roles.length} perfis` })).join('\n          ')}
        </div>
      </div>
      <div class="spec-row">
        <div class="spec-label"><h3>Stacks e plataformas</h3><p>${STACKS.length} stacks em ${CATEGORIES.length} categorias, de ERP e CRM a dados e IA.</p><a class="link-more" href="/especialidades#stacks">Ver todas as stacks <span class="arrow" aria-hidden="true">→</span></a></div>
        <div class="spec-tiles is-3">
          ${CATEGORIES.map((c) => { const list = STACKS.filter((s) => s.category === c.name); return tile({ href: '/especialidades#stacks', color: c.color, title: c.name, items: list.map((s) => s.short ?? s.name), count: `${list.length} stacks` }); }).join('\n          ')}
        </div>
      </div>
    </div>`;
  },

  /** Como funciona: os quatro modelos lado a lado. */
  'models-table': () => `<div class="table-wrap"><table class="models">
      <thead><tr><th scope="col">Modelo</th><th scope="col">Para quem</th><th scope="col">Vínculo</th><th scope="col">Cobrança</th></tr></thead>
      <tbody>
        ${SERVICES.map((s) => `<tr><th scope="row"><strong>${esc(s.title)}</strong><span>${esc(s.subtitle)}</span></th><td>${esc(s.idealFor)}</td><td>${esc(BOND[s.viz])}</td><td>${esc(s.bullets[s.bullets.length - 1])}</td></tr>`).join('\n        ')}
      </tbody>
    </table></div>`,

  /** Cabeçalho de artigo a partir dos metadados da página. */
  'article-head': ({ meta }) => `<header class="page-hero article-hero theme-dark">
  <div class="wrap">
    <nav class="crumbs" aria-label="Você está em"><a href="/insights">Insights</a><span aria-hidden="true">/</span><span>${esc(meta.category)}</span></nav>
    <h1>${esc(meta.title.replace(/ · Insights Devgo$/, ''))}</h1>
    <p>${esc(meta.summary)}</p>
    <p class="article-byline">Time Devgo · <time datetime="${meta.date}">${formatDate(meta.date)}</time> · ${esc(meta.readingTime)} de leitura</p>
  </div>
</header>`,

  /** Página /insights: o mais recente em destaque e os demais em índice. */
  'insights-list': ({ pages }) => {
    const [lead, ...rest] = articlesOf(pages);
    const title = (a) => esc(a.title.replace(/ · Insights Devgo$/, ''));
    return `<div class="insight-index">
        <a class="insight-hero" href="${lead.path}">
          <div><span class="insight-meta">Mais recente · ${esc(lead.category)}</span><h3>${title(lead)}</h3></div>
          <div><p>${esc(lead.summary)}</p><span class="insight-more">Ler artigo · ${esc(lead.readingTime)} <span class="arrow" aria-hidden="true">→</span></span></div>
        </a>
        <ol class="insight-lines">
          ${rest.map((a) => `<li><a class="insight-line" href="${a.path}"><span class="insight-meta">${esc(a.category)}</span><div><h3>${title(a)}</h3><p>${esc(a.summary)}</p></div><span class="insight-time">${esc(a.readingTime)}</span><span class="insight-row-arrow" aria-hidden="true">→</span></a></li>`).join('\n          ')}
        </ol>
      </div>`;
  },

  /** Home: o mais recente em destaque e os dois seguintes em lista. */
  'insights-latest': ({ pages }) => {
    const [lead, ...rest] = articlesOf(pages).slice(0, 3);
    const title = (a) => esc(a.title.replace(/ · Insights Devgo$/, ''));
    return `<div class="insight-feature">
        <a class="insight-lead" href="${lead.path}">
          <span class="insight-meta">${esc(lead.category)} · ${esc(lead.readingTime)} de leitura</span>
          <div><h3>${title(lead)}</h3><p>${esc(lead.summary)}</p></div>
          <span class="insight-more">Ler artigo <span class="arrow" aria-hidden="true">→</span></span>
        </a>
        <div class="insight-side">
          ${rest.map((a) => `<a class="insight-row" href="${a.path}"><span class="insight-meta">${esc(a.category)} · ${esc(a.readingTime)}</span><h3>${title(a)}</h3><span class="insight-row-arrow" aria-hidden="true">→</span></a>`).join('\n          ')}
        </div>
      </div>`;
  },

  /** Outros artigos, no fim de cada artigo. */
  related: ({ meta, pages }) => {
    const others = articlesOf(pages).filter((a) => a.path !== meta.path).slice(0, 3);
    return `<section class="theme-soft sec" aria-labelledby="related-title">
  <div class="wrap">
    <h2 class="related-title" id="related-title">Continue lendo</h2>
    <div class="insight-grid">
        ${others.map(card).join('\n        ')}
    </div>
  </div>
</section>`;
  },
};
