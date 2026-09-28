// @ts-check
/**
 * "Monte o seu squad": o usuário escolhe perfis e quantidades; a bandeja fixa
 * resume o squad e o CTA leva ao formulário com o assunto preenchido.
 */
import { byId, closest, html, render, queryAll, replayClass, trusted, reducedMotion } from '../core/dom.js';
import { PROFILE_GROUPS } from '../data/profiles.js';
import { prefillSubject } from './contact-form.js';

const MAX_PER_ROLE = 20;

/** @type {Map<string, import('../data/profiles.js').ProfileGroup>} */
const groupByRole = new Map(PROFILE_GROUPS.flatMap((group) => group.roles.map((role) => [role, group])));

/** Iniciais para a bolinha do squad: "UX/UI Designer" → "UU", "QA" → "QA". @param {string} role */
export function initials(role) {
  const words = role.replace(/[^A-Za-zÀ-ú/ -]/g, '').split(/[\s/-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : role.slice(0, 2)).toUpperCase();
}

/** @param {number} total */
const countLabel = (total) => (total === 0 ? 'vazio' : `${total} ${total > 1 ? 'profissionais' : 'profissional'}`);

export function initSquad() {
  const groups = byId('squad-groups');
  const tray = byId('squad-tray');
  /** Quantidade por perfil, na ordem em que foram escolhidos. @type {Map<string, number>} */
  const squad = new Map();

  render(groups, html`${PROFILE_GROUPS.map((group) => html`<div class="squad-group" style="--c:${group.color}"><div class="group-head"><div class="group-ill">${trusted(group.illustration)}</div><div class="group-text"><div class="group-title"><span class="group-icon"><img src="/assets/${group.icon}" alt=""></span><h3>${group.title}</h3></div><p>${group.description}</p></div></div><div class="group-roles">${group.roles.map((role) => html`<div class="squad-role" data-role="${role}"><span class="squad-role-name">${role}</span><button type="button" class="squad-add" aria-label="Adicionar ${role}">+</button><span class="squad-step"><button type="button" data-step="-1" aria-label="Menos ${role}">−</button><b>0</b><button type="button" data-step="1" aria-label="Mais ${role}">+</button></span></div>`)}</div></div>`)}`);

  const rows = queryAll('.squad-role', groups);
  const chosen = () => [...squad].filter(([, qty]) => qty > 0);

  const draw = () => {
    for (const row of rows) {
      const qty = squad.get(row.dataset.role ?? '') ?? 0;
      row.classList.toggle('is-active', qty > 0);
      const counter = row.querySelector('.squad-step b');
      if (counter) counter.textContent = String(qty);
    }
    const items = chosen();
    const total = items.reduce((sum, [, qty]) => sum + qty, 0);
    const dots = items.flatMap(([role, qty]) => {
      const group = /** @type {import('../data/profiles.js').ProfileGroup} */ (groupByRole.get(role));
      return Array.from({ length: qty }, () => html`<i style="--c:${group.color};--fg:${group.ink}" title="${role}">${initials(role)}</i>`);
    });
    render(tray, html`<div class="tray-head"><strong>Seu squad</strong><span>${countLabel(total)}</span></div>${total
      ? html`<div class="tray-dots">${dots}</div>`
      : html`<p class="tray-empty">Escolha os perfis acima. Se preferir, fale direto com a gente.</p>`}<a class="btn btn-blue tray-cta" href="#contato">${total ? 'Montar este squad' : 'Falar com um especialista'} <span class="arrow" aria-hidden="true">→</span></a>`);
  };

  /** @param {string} role @param {number} qty */
  const setQuantity = (role, qty) => {
    squad.set(role, Math.max(0, Math.min(MAX_PER_ROLE, qty)));
    draw();
  };

  groups.addEventListener('click', (event) => {
    const row = closest(event.target, '.squad-role');
    const role = row?.dataset.role;
    if (!row || !role) return;
    if (closest(event.target, '.squad-add')) {
      setQuantity(role, 1);
      /** @type {HTMLElement | null} */ (row.querySelector('[data-step="1"]'))?.focus();
      return;
    }
    const step = closest(event.target, '[data-step]');
    if (!step) return;
    setQuantity(role, (squad.get(role) ?? 0) + Number(step.dataset.step));
    const counter = row.querySelector('.squad-step b');
    if (counter && !reducedMotion) replayClass(counter, 'is-bumped');
  });

  tray.addEventListener('click', (event) => {
    if (!closest(event.target, '.tray-cta')) return;
    const items = chosen();
    if (items.length) prefillSubject(`Squad: ${items.map(([role, qty]) => `${qty}× ${role}`).join(', ')}`);
  });

  draw();
}
