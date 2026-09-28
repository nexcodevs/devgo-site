// @ts-check
/** Base da Devgo e cidades atendidas, usadas no painel de fusos e no globo. */

/**
 * @typedef {object} Location
 * @property {string} name
 * @property {string} timeZone identificador IANA
 * @property {[number, number]} coords latitude e longitude em graus
 * @property {string} flag SVG estático da bandeira
 */

const flag = (/** @type {string} */ body) => `<svg class="flag" viewBox="0 0 20 14" aria-hidden="true">${body}</svg>`;

/** @type {Location} */
export const HOME = {
  name: 'São Paulo',
  timeZone: 'America/Sao_Paulo',
  coords: [-23.55, -46.63],
  flag: flag('<rect width="20" height="14" fill="#009B3A"/><path d="M10 1.6 18.2 7 10 12.4 1.8 7z" fill="#FEDF00"/><circle cx="10" cy="7" r="3.1" fill="#002776"/>'),
};

/** @type {Location[]} */
export const CITIES = [
  {
    name: 'Cidade do México',
    timeZone: 'America/Mexico_City',
    coords: [19.43, -99.13],
    flag: flag('<rect width="20" height="14" fill="#fff"/><rect width="6.67" height="14" fill="#006847"/><rect x="13.33" width="6.67" height="14" fill="#CE1126"/><circle cx="10" cy="7" r="1.6" fill="#8C6A3F"/>'),
  },
  {
    name: 'Nova York',
    timeZone: 'America/New_York',
    coords: [40.71, -74.01],
    flag: flag('<rect width="20" height="14" fill="#fff"/><g fill="#B22234"><rect y="0" width="20" height="1.08"/><rect y="2.15" width="20" height="1.08"/><rect y="4.3" width="20" height="1.08"/><rect y="6.46" width="20" height="1.08"/><rect y="8.62" width="20" height="1.08"/><rect y="10.77" width="20" height="1.08"/><rect y="12.92" width="20" height="1.08"/></g><rect width="8.5" height="7.54" fill="#3C3B6E"/>'),
  },
  {
    name: 'Londres',
    timeZone: 'Europe/London',
    coords: [51.51, -0.13],
    flag: flag('<rect width="20" height="14" fill="#012169"/><path d="M0 0 20 14M20 0 0 14" stroke="#fff" stroke-width="2.8"/><path d="M0 0 20 14M20 0 0 14" stroke="#C8102E" stroke-width="1.2"/><path d="M10 0v14M0 7h20" stroke="#fff" stroke-width="4"/><path d="M10 0v14M0 7h20" stroke="#C8102E" stroke-width="2.2"/>'),
  },
  {
    name: 'Lisboa',
    timeZone: 'Europe/Lisbon',
    coords: [38.72, -9.14],
    flag: flag('<rect width="20" height="14" fill="#FF0000"/><rect width="8" height="14" fill="#006600"/><circle cx="8" cy="7" r="2.6" fill="#FFCC00"/>'),
  },
  {
    name: 'Madri',
    timeZone: 'Europe/Madrid',
    coords: [40.42, -3.70],
    flag: flag('<rect width="20" height="14" fill="#AA151B"/><rect y="3.5" width="20" height="7" fill="#F1BF00"/>'),
  },
];
