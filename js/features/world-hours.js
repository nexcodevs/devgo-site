// @ts-check
/**
 * Painel "horas de expediente em comum com São Paulo": para cada cidade,
 * mostra a hora local e quantas horas do expediente (9h–18h) coincidem.
 */
import { byId, closest, html, render, trusted } from '../core/dom.js';
import { HOME, CITIES } from '../data/locations.js';

const WORKDAY_START = 9;
const WORKDAY_END = 18;
const REFRESH_MS = 60_000;

/**
 * Deslocamento de um fuso em relação ao UTC, em horas (arredondado a 15 min).
 * @param {string} timeZone
 * @param {Date} date
 * @returns {number | null} null quando o navegador não conhece o fuso
 */
export function utcOffsetHours(timeZone, date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(date);
    /** @type {Record<string, number>} */
    const p = {};
    for (const part of parts) p[part.type] = Number(part.value);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute);
    return Math.round((asUtc - date.getTime()) / 900_000) / 4;
  } catch {
    return null;
  }
}

/**
 * Horas de expediente em comum entre a base e uma cidade.
 * @param {number} homeOffset
 * @param {number} cityOffset
 */
export function sharedWorkHours(homeOffset, cityOffset) {
  const shift = homeOffset - cityOffset; // expediente da cidade, em horário da base
  return Math.max(0, Math.min(WORKDAY_END + shift, WORKDAY_END) - Math.max(WORKDAY_START + shift, WORKDAY_START));
}

/**
 * @param {{ timeZone: string | null }} highlight cidade em destaque, lida pelo globo
 */
export function initWorldHours(highlight) {
  const list = byId('glob-cities');

  const draw = () => {
    const now = new Date();
    const home = utcOffsetHours(HOME.timeZone, now);
    render(list, html`${CITIES.map((city) => {
      const offset = utcOffsetHours(city.timeZone, now);
      const shared = home === null || offset === null ? '—' : `${sharedWorkHours(home, offset)}h`;
      const localTime = new Intl.DateTimeFormat('pt-BR', { timeZone: city.timeZone, hour: '2-digit', minute: '2-digit' }).format(now);
      return html`<span class="glob-city" data-zone="${city.timeZone}" tabindex="0">${trusted(city.flag)}<span>${city.name} <small>${localTime}</small></span><b>${shared}</b></span>`;
    })}`);
  };

  /** @param {Event} event */
  const pick = (event) => { highlight.timeZone = closest(event.target, '.glob-city')?.dataset.zone ?? null; };
  const clear = () => { highlight.timeZone = null; };
  list.addEventListener('mouseover', pick);
  list.addEventListener('focusin', pick);
  list.addEventListener('mouseleave', clear);
  list.addEventListener('focusout', clear);

  draw();
  window.setInterval(draw, REFRESH_MS);
}
