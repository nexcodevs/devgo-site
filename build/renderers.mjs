// Blocos pré-renderizados no build a partir de js/data, para que o conteúdo
// esteja no HTML (buscadores, leitores de tela e visitantes sem JS).

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** "2026-09-28" → "28 set 2026" */
const formatDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

/** Artigos do mais recente para o mais antigo. */
const articlesOf = (pages) => pages.filter((p) => p.type === 'article').sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

const title = (a) => esc(a.title.replace(/ · Insights Devgo$/, ''));
/** Capa do artigo; `small` usa a versão de 600px. */
const cover = (a, small = false) => `<img src="/assets/${small ? a.image.replace(/\.jpg$/, '-sm.jpg') : a.image}" alt="${esc(a.imageAlt)}" width="${small ? 600 : 1200}" height="${small ? 375 : 750}" loading="lazy">`;

const card = (a, featured = false) => `<a class="insight-card" href="${a.path}" data-topic="${esc(a.category)}"${featured ? ' data-featured' : ''}>
          <span class="insight-thumb">${cover(a, true)}</span>
          <span class="insight-meta">${esc(a.category)} · ${esc(a.readingTime)} de leitura</span>
          <h3>${title(a)}</h3>
          <p>${esc(a.summary)}</p>
          <span class="insight-more">Ler artigo <span class="arrow" aria-hidden="true">→</span></span>
        </a>`;

export const RENDERERS = {
  /** Cabeçalho de artigo a partir dos metadados da página. */
  'article-head': ({ meta }) => `<header class="page-hero article-hero theme-dark">
  <div class="wrap">
    <nav class="crumbs" aria-label="Você está em"><a href="/insights">Insights</a><span aria-hidden="true">/</span><span>${esc(meta.category)}</span></nav>
    <h1>${esc(meta.title.replace(/ · Insights Devgo$/, ''))}</h1>
    <p>${esc(meta.summary)}</p>
    <p class="article-byline">Time Devgo · <time datetime="${meta.date}">${formatDate(meta.date)}</time> · ${esc(meta.readingTime)} de leitura</p>
  </div>
</header>
<div class="article-cover"><div class="wrap"><img src="/assets/${meta.image}" alt="${esc(meta.imageAlt)}" width="1200" height="750"></div></div>`,

  /** Página /insights: filtro por tema, três destaques e a biblioteca completa (o JS filtra e pagina). */
  'insights-list': ({ pages }) => {
    const all = articlesOf(pages);
    const [lead, ...picks] = all.slice(0, 3);
    const topics = [...new Set(all.map((a) => a.category))].sort((x, y) => x.localeCompare(y, 'pt-BR'));
    const count = (t) => all.filter((a) => a.category === t).length;
    return `<div class="insight-filters" id="insight-filters" role="group" aria-label="Filtrar artigos por tema" hidden>
        <button class="stk-filter" type="button" data-topic="" aria-pressed="true">Todos <span class="insight-filter-n">${all.length}</span></button>
        ${topics.map((t) => `<button class="stk-filter" type="button" data-topic="${esc(t)}" aria-pressed="false">${esc(t)} <span class="insight-filter-n">${count(t)}</span></button>`).join('\n        ')}
      </div>
      <div class="insight-top" id="insight-top">
        <a class="insight-hero" href="${lead.path}">
          <span class="insight-hero-img">${cover(lead)}</span>
          <span class="insight-hero-text"><span class="insight-meta">Mais recente · ${esc(lead.category)}</span><h3>${title(lead)}</h3><p>${esc(lead.summary)}</p><span class="insight-more">Ler artigo · ${esc(lead.readingTime)} <span class="arrow" aria-hidden="true">→</span></span></span>
        </a>
        <div class="insight-picks">
          ${picks.map((a) => `<a class="insight-pick" href="${a.path}"><span class="insight-thumb">${cover(a, true)}</span><span class="insight-meta">${esc(a.category)} · ${esc(a.readingTime)}</span><h3>${title(a)}</h3></a>`).join('\n          ')}
        </div>
      </div>
      <div class="insight-library">
        <h2 class="insight-library-title" id="insight-library-title">Todos os artigos</h2>
        <div class="insight-grid" id="insight-all">
          ${all.map((a, i) => card(a, i < 3)).join('\n          ')}
        </div>
        <div class="insight-more-row"><button class="btn btn-dark" type="button" id="insight-more" hidden>Mostrar mais artigos</button></div>
      </div>`;
  },

  /** Home: chamada fixa à esquerda e índice numerado dos artigos, com capa, à direita. */
  'insights-latest': ({ pages }) => {
    const all = articlesOf(pages);
    const topics = [...new Set(all.map((a) => a.category))].join(', ').replace(/, ([^,]*)$/, ' e $1').toLowerCase();
    return `<div class="insight-split">
      <div class="insight-intro">
        <span class="eyebrow">insights</span>
        <h2>Guias para quem monta times de tecnologia.</h2>
        <p class="lede">Conteúdo prático do time da Devgo sobre ${esc(topics)}.</p>
        <a class="btn btn-blue" href="/insights">Ver todos os insights <span class="arrow" aria-hidden="true">→</span></a>
      </div>
      <ol class="insight-list">
        ${all.slice(0, 4).map((a, i) => `<li><a class="insight-item" href="${a.path}"><span class="insight-num">${String(i + 1).padStart(2, '0')}</span><span class="insight-item-text"><span class="insight-meta">${esc(a.category)} · ${esc(a.readingTime)}</span><h3>${title(a)}</h3><p>${esc(a.summary)}</p></span><span class="insight-item-img">${cover(a, true)}</span></a></li>`).join('\n        ')}
      </ol>
    </div>`;
  },

  /** Outros artigos, no fim de cada artigo. */
  related: ({ meta, pages }) => {
    const others = articlesOf(pages).filter((a) => a.path !== meta.path)
      .sort((a, b) => Number(b.category === meta.category) - Number(a.category === meta.category))
      .slice(0, 3);
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
