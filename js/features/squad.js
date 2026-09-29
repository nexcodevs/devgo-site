// @ts-check
/**
 * "Monte o seu squad" em dois passos: o usuário escolhe a plataforma e depois
 * os cargos por categoria (uma aba por vez). As quantidades ficam no resumo
 * "Seu squad", cujo CTA leva ao formulário com o assunto preenchido.
 */
import { assetUrl, byId, closest, html, render, replayClass, reducedMotion } from '../core/dom.js';
import { PLATFORMS, PROFILE_GROUPS, PLATFORM_ICON } from '../data/profiles.js';
import { prefillSubject } from './contact-form.js';

const MAX_PER_ROLE = 20;

/** Iniciais de um cargo: "UX/UI Designer" → "UU", "QA" → "QA". @param {string} role */
export function initials(role) {
  const words = role.replace(/[^A-Za-zÀ-ú/ -]/g, '').split(/[\s/-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : role.slice(0, 2)).toUpperCase();
}

/** @param {number} total */
const countLabel = (total) => (total === 0 ? 'vazio' : `${total} ${total > 1 ? 'profissionais' : 'profissional'}`);

/**
 * Abas do passo 2: especialistas da plataforma (quando houver) e as categorias.
 * @param {string} platformName
 * @returns {{ id: string, title: string, description: string, icon: string, roles: string[] }[]}
 */
export function tabsFor(platformName) {
  const platform = PLATFORMS.find((p) => p.name === platformName);
  const categories = PROFILE_GROUPS.map((g, i) => ({ id: `cat-${i}`, ...g }));
  if (!platform?.roles.length) return categories;
  return [{
    id: 'platform',
    title: platform.name,
    description: `Perfis com experiência de projeto em ${platform.name}.`,
    icon: PLATFORM_ICON,
    roles: platform.roles,
  }, ...categories];
}

export function initSquad() {
  const builder = byId('squad-builder');
  const tray = byId('squad-tray');
  /** Quantidade por cargo, na ordem em que foram escolhidos. @type {Map<string, number>} */
  const squad = new Map();
  let platform = PLATFORMS[0].name;
  let activeTab = '';

  const chosen = () => [...squad].filter(([, qty]) => qty > 0);
  const total = () => chosen().reduce((sum, [, qty]) => sum + qty, 0);

  const drawBuilder = () => {
    const tabs = tabsFor(platform);
    if (!tabs.some((t) => t.id === activeTab)) activeTab = tabs[0].id;
    const current = /** @type {typeof tabs[number]} */ (tabs.find((t) => t.id === activeTab));
    render(builder, html`
      <div class="sq-step">
        <h3 class="sq-step-title" id="sq-step-1"><b>1</b>Tecnologia ou plataforma</h3>
        <div class="sq-platforms" role="radiogroup" aria-labelledby="sq-step-1">${PLATFORMS.map((p) => html`<button type="button" class="sq-platform" role="radio" aria-checked="${String(p.name === platform)}" data-platform="${p.name}"><strong>${p.name}</strong><small>${p.kind}</small></button>`)}</div>
      </div>
      <div class="sq-step">
        <h3 class="sq-step-title" id="sq-step-2"><b>2</b>Cargos por categoria</h3>
        <div class="sq-cats">
        <div class="sq-tabs" role="tablist" aria-labelledby="sq-step-2">${tabs.map((t) => {
          const count = t.roles.reduce((sum, r) => sum + (squad.get(r) ?? 0), 0);
          return html`<button type="button" class="sq-tab" role="tab" id="sq-tab-${t.id}" aria-controls="sq-panel" aria-selected="${String(t.id === activeTab)}" tabindex="${t.id === activeTab ? '0' : '-1'}" data-tab="${t.id}"><span class="group-icon"><i style="--icon:url(${assetUrl(t.icon)})" aria-hidden="true"></i></span>${t.title}${count ? html`<em>${count}</em>` : ''}</button>`;
        })}</div>
        <div class="sq-panel" role="tabpanel" id="sq-panel" aria-labelledby="sq-tab-${current.id}">
          <p>${current.description}</p>
          <div class="sq-roles">${current.roles.map((role) => html`<button type="button" class="squad-role" data-role="${role}" aria-pressed="${String((squad.get(role) ?? 0) > 0)}"><span>${role}</span><i aria-hidden="true">+</i></button>`)}</div>
        </div>
        </div>
      </div>`);
  };

  const drawTray = () => {
    const items = chosen();
    const count = total();
    const showPlatform = PLATFORMS.find((p) => p.name === platform)?.roles.length;
    render(tray, html`<div class="tray-head"><strong>Seu squad</strong><span>${countLabel(count)}</span></div>${showPlatform ? html`<p class="tray-platform">Plataforma: <b>${platform}</b></p>` : ''}${count
      ? html`<ul class="tray-list">${items.map(([role, qty]) => html`<li class="tray-role${shown.has(role) ? '' : ' is-new'}" data-role="${role}"><span>${role}</span><span class="squad-step"><button type="button" data-step="-1" aria-label="Menos ${role}">−</button><b>${qty}</b><button type="button" data-step="1" aria-label="Mais ${role}">+</button></span></li>`)}</ul>`
      : html`<p class="tray-empty">Escolha a plataforma e os cargos. Se preferir, fale direto com a gente.</p>`}<a class="btn btn-primary tray-cta" href="#contato">${count ? 'Montar este squad' : 'Falar com um especialista'} <span class="arrow" aria-hidden="true">→</span></a>`);
    shown = new Set(items.map(([role]) => role));
  };

  const draw = () => { drawBuilder(); drawTray(); };
  /** Cargos já exibidos no resumo: só os novos animam a entrada. @type {Set<string>} */
  let shown = new Set();

  /** @param {string} role @param {number} qty */
  const setQuantity = (role, qty) => {
    const next = Math.max(0, Math.min(MAX_PER_ROLE, qty));
    if (next) squad.set(role, next); else squad.delete(role);
    draw();
  };

  /** Devolve o foco ao elemento equivalente depois de redesenhar. @param {string} selector */
  const refocus = (selector) => {
    const el = /** @type {HTMLElement | null} */ (document.querySelector(selector));
    el?.focus({ preventScroll: true });
    // aba escolhida sempre visível na faixa rolável (celular)
    const tab = /** @type {HTMLElement | null} */ (builder.querySelector('.sq-tab[aria-selected="true"]'));
    const strip = tab?.parentElement;
    if (tab && strip && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = tab.offsetLeft - strip.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2;
  };

  builder.addEventListener('click', (event) => {
    const chip = closest(event.target, '.sq-platform');
    if (chip?.dataset.platform) {
      platform = chip.dataset.platform;
      activeTab = '';
      draw();
      refocus(`.sq-platform[data-platform="${CSS.escape(platform)}"]`);
      return;
    }
    const tab = closest(event.target, '.sq-tab');
    if (tab?.dataset.tab) {
      activeTab = tab.dataset.tab;
      drawBuilder();
      refocus(`#sq-tab-${activeTab}`);
      return;
    }
    const role = closest(event.target, '.squad-role')?.dataset.role;
    if (role) {
      setQuantity(role, squad.has(role) ? 0 : 1);
      refocus(`.squad-role[data-role="${CSS.escape(role)}"]`);
    }
  });

  // setas navegam entre as abas (padrão de tablist)
  builder.addEventListener('keydown', (event) => {
    const tab = closest(event.target, '.sq-tab');
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const dir = keys[/** @type {keyof typeof keys} */ (event.key)];
    if (!tab || !dir) return;
    const ids = tabsFor(platform).map((t) => t.id);
    const i = ids.indexOf(activeTab) + dir;
    activeTab = ids[(i + ids.length) % ids.length];
    drawBuilder();
    refocus(`#sq-tab-${activeTab}`);
    event.preventDefault();
  });

  tray.addEventListener('click', (event) => {
    const step = closest(event.target, '[data-step]');
    const row = closest(event.target, '.tray-role');
    if (step && row?.dataset.role) {
      const role = row.dataset.role;
      setQuantity(role, (squad.get(role) ?? 0) + Number(step.dataset.step));
      const counter = document.querySelector(`.tray-role[data-role="${CSS.escape(role)}"] .squad-step b`);
      if (counter && !reducedMotion) replayClass(counter, 'is-bumped');
      refocus(`.tray-role[data-role="${CSS.escape(role)}"] [data-step="${step.dataset.step}"]`);
      return;
    }
    if (!closest(event.target, '.tray-cta')) return;
    const items = chosen();
    const label = PLATFORMS.find((p) => p.name === platform)?.roles.length ? `Squad ${platform}` : 'Squad';
    if (items.length) prefillSubject(`${label}: ${items.map(([role, qty]) => `${qty}× ${role}`).join(', ')}`);
  });

  draw();
}
