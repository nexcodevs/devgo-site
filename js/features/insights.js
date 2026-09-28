// @ts-check
/**
 * Página /insights: filtro por tema e "mostrar mais" na biblioteca de artigos.
 * Sem JS, todos os artigos aparecem e o filtro fica escondido.
 */
import { byId, queryAll } from '../core/dom.js';

export const PAGE_SIZE = 9;

/**
 * Quais cartões aparecem para um tema e um limite. Em "Todos", os destaques
 * (já exibidos acima) saem da grade; num tema, a grade mostra todos dele.
 * @param {{ topic: string, featured: boolean }[]} cards
 * @param {string} topic tema escolhido ("" = todos)
 * @param {number} limit
 * @returns {{ visible: boolean[], hasMore: boolean }}
 */
export function pageOf(cards, topic, limit) {
  let shown = 0;
  let matches = 0;
  const visible = cards.map((card) => {
    const match = topic ? card.topic === topic : !card.featured;
    if (!match) return false;
    matches++;
    return ++shown <= limit;
  });
  return { visible, hasMore: matches > limit };
}

export function initInsightFilters() {
  const filters = byId('insight-filters');
  const top = byId('insight-top');
  const title = byId('insight-library-title');
  const more = byId('insight-more', HTMLButtonElement);
  const cards = queryAll('.insight-card', byId('insight-all'));
  const data = cards.map((el) => ({ topic: el.dataset.topic ?? '', featured: el.hasAttribute('data-featured') }));
  let topic = '';
  let limit = PAGE_SIZE;

  const apply = () => {
    const { visible, hasMore } = pageOf(data, topic, limit);
    cards.forEach((el, i) => { el.hidden = !visible[i]; });
    more.hidden = !hasMore;
    top.hidden = Boolean(topic);
    title.textContent = topic || 'Todos os artigos';
  };

  filters.addEventListener('click', (event) => {
    const button = /** @type {HTMLElement} */ (event.target).closest('button[data-topic]');
    if (!(button instanceof HTMLButtonElement)) return;
    topic = button.dataset.topic ?? '';
    limit = PAGE_SIZE;
    queryAll('button[data-topic]', filters).forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    apply();
  });
  more.addEventListener('click', () => {
    const first = cards.findIndex((el) => el.hidden && (topic ? el.dataset.topic === topic : !el.hasAttribute('data-featured')));
    limit += PAGE_SIZE;
    apply();
    cards[first]?.focus();
  });

  filters.hidden = false;
  apply();
}
