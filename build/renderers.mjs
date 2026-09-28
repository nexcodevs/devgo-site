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
  /** Home: prévia de perfis e stacks, com links para a página de especialidades. */
  'specialties-preview': () => `<div class="spec">
      <div class="spec-card">
        <div class="spec-head"><h3>Perfis</h3><a class="link-more" href="/especialidades#perfis">Monte seu squad <span class="arrow" aria-hidden="true">→</span></a></div>
        ${PROFILE_GROUPS.map((g) => `<div class="spec-group"><b>${esc(g.title)}</b><div class="spec-chips">${g.roles.map((r) => `<span>${esc(r)}</span>`).join('')}</div></div>`).join('\n        ')}
      </div>
      <div class="spec-card">
        <div class="spec-head"><h3>Stacks e plataformas</h3><a class="link-more" href="/especialidades#stacks">Ver stacks <span class="arrow" aria-hidden="true">→</span></a></div>
        ${CATEGORIES.map((c) => `<div class="spec-group" style="--c:${c.color}"><b>${esc(c.name)}</b><div class="spec-chips">${STACKS.filter((s) => s.category === c.name).map((s) => `<span>${esc(s.name)}</span>`).join('')}</div></div>`).join('\n        ')}
      </div>
    </div>`,

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

  /** Lista completa da página /insights. */
  'insights-list': ({ pages }) => `<div class="insight-grid is-list">
        ${articlesOf(pages).map(card).join('\n        ')}
      </div>`,

  /** Três mais recentes, para a home. */
  'insights-latest': ({ pages }) => `<div class="insight-grid">
        ${articlesOf(pages).slice(0, 3).map(card).join('\n        ')}
      </div>`,

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
