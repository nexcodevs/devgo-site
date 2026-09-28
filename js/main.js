// @ts-check
/**
 * Ponto de entrada. Cada feature inicia isolada: se uma falhar (elemento
 * ausente, API indisponível), as demais continuam funcionando e o erro fica
 * no console com o nome da feature.
 *
 * A ordem importa em dois casos:
 * - ícones depois do squad (os ícones dos grupos são renderizados por ele);
 * - revelação por último (mede posições com todo o conteúdo já na página).
 */
import { initMobileMenu, initClientLogos, initNavSpy, initReveal, initIconEntrances, initHeroVideo } from './features/page.js';
import { initServices } from './features/services.js';
import { initWorldHours } from './features/world-hours.js';
import { initGlobe } from './features/globe.js';
import { initNumbers } from './features/numbers.js';
import { initStacks } from './features/stacks.js';
import { initSquad } from './features/squad.js';
import { initContactForm } from './features/contact-form.js';

/** Cidade em destaque: escrita pelo painel de fusos, lida pelo globo. */
const highlight = { timeZone: /** @type {string | null} */ (null) };

/** @type {Array<[string, () => void]>} */
const FEATURES = [
  ['menu', initMobileMenu],
  ['hero-video', initHeroVideo],
  ['logos', initClientLogos],
  ['services', initServices],
  ['world-hours', () => initWorldHours(highlight)],
  ['globe', () => initGlobe(highlight)],
  ['numbers', initNumbers],
  ['stacks', initStacks],
  ['squad', initSquad],
  ['contact-form', initContactForm],
  ['icons', initIconEntrances],
  ['nav-spy', initNavSpy],
  ['reveal', initReveal],
];

for (const [name, init] of FEATURES) {
  try {
    init();
  } catch (error) {
    console.error(`[devgo] falha ao iniciar "${name}"`, error);
  }
}
