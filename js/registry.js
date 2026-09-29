// @ts-check
/**
 * Features do site e onde cada uma vive. O main.js só carrega o módulo de
 * uma feature quando o seletor dela existe na página, e o build usa esta
 * mesma lista para pré-carregar exatamente os módulos de cada página.
 *
 * Seletores aceitos: `#id` ou `[atributo]` (o build os procura no HTML).
 * A ordem é a de inicialização: ícones depois do squad (que renderiza os
 * ícones dos grupos) e revelação por último (mede a página já montada).
 */

/** @typedef {{ name: string, selector: string, module: string, init: string }} Feature */

/** @type {Feature[]} */
export const FEATURES = [
  { name: 'menu', selector: '#menu-btn', module: './features/page.js', init: 'initMobileMenu' },
  { name: 'hero-rotator', selector: '#hero-rotator', module: './features/page.js', init: 'initHeroRotator' },
  { name: 'hero-video', selector: '#hero-video', module: './features/page.js', init: 'initHeroVideo' },
  { name: 'logos', selector: '#logo-track', module: './features/page.js', init: 'initClientLogos' },
  { name: 'services', selector: '#services', module: './features/services.js', init: 'initServices' },
  { name: 'numbers', selector: '#tile-matrix', module: './features/numbers.js', init: 'initNumbers' },
  { name: 'stacks', selector: '#stk-panel', module: './features/stacks.js', init: 'initStacks' },
  { name: 'squad', selector: '#squad-builder', module: './features/squad.js', init: 'initSquad' },
  { name: 'insights', selector: '#insight-filters', module: './features/insights.js', init: 'initInsightFilters' },
  { name: 'world-hours', selector: '#glob-cities', module: './features/world-hours.js', init: 'initWorldHours' },
  { name: 'globe', selector: '#globe', module: './features/globe.js', init: 'initGlobe' },
  { name: 'contact-form', selector: '#contact-form', module: './features/contact-form.js', init: 'initContactForm' },
  { name: 'icons', selector: '[data-icons]', module: './features/page.js', init: 'initIconEntrances' },
  { name: 'nav-spy', selector: '[data-nav-spy]', module: './features/page.js', init: 'initNavSpy' },
  { name: 'reveal', selector: '#top', module: './features/page.js', init: 'initReveal' },
];
