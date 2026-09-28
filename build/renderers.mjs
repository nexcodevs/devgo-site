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
};
