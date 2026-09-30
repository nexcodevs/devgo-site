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

/** @typedef {Map<string, Map<string, number>>} Squads plataforma → cargo → quantidade */

/** Total de profissionais de uma plataforma (ou de todas). @param {Squads} squads @param {string} [platform] */
export function squadTotal(squads, platform) {
  const lists = platform ? [squads.get(platform) ?? new Map()] : [...squads.values()];
  return lists.reduce((sum, roles) => sum + [...roles.values()].reduce((a, b) => a + b, 0), 0);
}

/** Assunto do formulário: "Squad SAP: 2× Dev ABAP, 1× QA · Squad VTEX: 1× Dev VTEX IO". @param {Squads} squads */
export function squadSubject(squads) {
  return PLATFORMS
    .filter((p) => squadTotal(squads, p.name) > 0)
    .map((p) => `Squad ${p.name}: ${[...(squads.get(p.name) ?? [])].map(([role, qty]) => `${qty}× ${role}`).join(', ')}`)
    .join(' · ');
}

export function initSquad() {
  const builder = byId('squad-builder');
  const tray = byId('squad-tray');
  /** Cargos por plataforma, na ordem em que foram escolhidos. @type {Squads} */
  const squads = new Map();
  let platform = PLATFORMS[0].name;
  let activeTab = '';
  /** Linhas já exibidas no resumo: só as novas animam a entrada. @type {Set<string>} */
  let shown = new Set();

  /** @param {string} role */
  const qtyOf = (role) => squads.get(platform)?.get(role) ?? 0;

  const drawBuilder = () => {
    const tabs = tabsFor(platform);
    if (!tabs.some((t) => t.id === activeTab)) activeTab = tabs[0].id;
    const current = /** @type {typeof tabs[number]} */ (tabs.find((t) => t.id === activeTab));
    render(builder, html`
      <div class="sq-step">
        <h3 class="sq-step-title" id="sq-step-1"><b>1</b>Tecnologia ou plataforma</h3>
        <div class="sq-platforms" role="radiogroup" aria-labelledby="sq-step-1">${PLATFORMS.map((p) => {
          const count = squadTotal(squads, p.name);
          return html`<button type="button" class="sq-platform" role="radio" aria-checked="${String(p.name === platform)}" data-platform="${p.name}"><strong>${p.name}</strong><small>${p.kind}</small>${count ? html`<em aria-label="${countLabel(count)}">${count}</em>` : ''}</button>`;
        })}</div>
      </div>
      <div class="sq-step">
        <h3 class="sq-step-title" id="sq-step-2"><b>2</b>Cargos por categoria</h3>
        <div class="sq-cats">
        <div class="sq-tabs" role="tablist" aria-labelledby="sq-step-2">${tabs.map((t) => {
          const count = t.roles.reduce((sum, r) => sum + qtyOf(r), 0);
          return html`<button type="button" class="sq-tab" role="tab" id="sq-tab-${t.id}" aria-controls="sq-panel" aria-selected="${String(t.id === activeTab)}" tabindex="${t.id === activeTab ? '0' : '-1'}" data-tab="${t.id}"><span class="group-icon"><i style="--icon:url(${assetUrl(t.icon)})" aria-hidden="true"></i></span>${t.title}${count ? html`<em>${count}</em>` : ''}</button>`;
        })}</div>
        <div class="sq-panel" role="tabpanel" id="sq-panel" aria-labelledby="sq-tab-${current.id}">
          <p>${current.description}</p>
          <div class="sq-roles">${current.roles.map((role) => {
            const qty = qtyOf(role);
            return qty
              ? html`<div class="squad-role is-active" data-role="${role}"><span>${role}</span><span class="squad-step"><button type="button" data-step="-1" aria-label="Menos ${role}">−</button><b>${qty}</b><button type="button" data-step="1" aria-label="Mais ${role}">+</button></span></div>`
              : html`<button type="button" class="squad-role" data-role="${role}" data-step="1" aria-label="Adicionar ${role}"><span>${role}</span><i aria-hidden="true">+</i></button>`;
          })}</div>
        </div>
        </div>
      </div>`);
  };

  const drawTray = () => {
    const count = squadTotal(squads);
    const groups = PLATFORMS.filter((p) => squadTotal(squads, p.name) > 0);
    render(tray, html`<div class="tray-head"><strong>Seu squad</strong><span>${countLabel(count)}</span></div>${count
      ? html`<div class="tray-groups">${groups.map((p) => html`<section class="tray-group${p.name === platform ? ' is-current' : ''}"><button type="button" class="tray-group-head" data-go-platform="${p.name}"><strong>${p.name}</strong><span>${countLabel(squadTotal(squads, p.name))}</span></button><ul class="tray-list">${[...(squads.get(p.name) ?? [])].map(([role, qty]) => {
          const key = `${p.name}::${role}`;
          return html`<li class="tray-role${shown.has(key) ? '' : ' is-new'}"><b>${qty}×</b><span>${role}</span><button type="button" class="tray-remove" data-remove-platform="${p.name}" data-remove-role="${role}" aria-label="Remover ${role} de ${p.name}">×</button></li>`;
        })}</ul></section>`)}</div>`
      : html`<p class="tray-empty">Escolha a plataforma e os cargos. Se preferir, fale direto com a gente.</p>`}<a class="btn btn-primary tray-cta" href="#contato">${count ? 'Montar este squad' : 'Falar com um especialista'} <span class="arrow" aria-hidden="true">→</span></a>`);
    shown = new Set(groups.flatMap((p) => [...(squads.get(p.name) ?? new Map()).keys()].map((role) => `${p.name}::${role}`)));
  };

  const draw = () => { drawBuilder(); drawTray(); };

  /** @param {string} name @param {string} role @param {number} qty */
  const setQuantity = (name, role, qty) => {
    const next = Math.max(0, Math.min(MAX_PER_ROLE, qty));
    const roles = squads.get(name) ?? new Map();
    if (next) roles.set(role, next); else roles.delete(role);
    if (roles.size) squads.set(name, roles); else squads.delete(name);
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

  /** @param {string} name */
  const choosePlatform = (name) => {
    platform = name;
    activeTab = '';
    draw();
    refocus(`.sq-platform[data-platform="${CSS.escape(platform)}"]`);
  };

  builder.addEventListener('click', (event) => {
    const chip = closest(event.target, '.sq-platform');
    if (chip?.dataset.platform) { choosePlatform(chip.dataset.platform); return; }
    const tab = closest(event.target, '.sq-tab');
    if (tab?.dataset.tab) {
      activeTab = tab.dataset.tab;
      drawBuilder();
      refocus(`#sq-tab-${activeTab}`);
      return;
    }
    const step = closest(event.target, '[data-step]');
    const role = closest(event.target, '.squad-role')?.dataset.role;
    if (!step || !role) return;
    const delta = Number(step.dataset.step);
    setQuantity(platform, role, qtyOf(role) + delta);
    const selector = `.squad-role[data-role="${CSS.escape(role)}"]`;
    const counter = builder.querySelector(`${selector} .squad-step b`);
    if (counter && !reducedMotion) replayClass(counter, 'is-bumped');
    // mantém o foco no controle equivalente (o "+" vira o passo quando o cargo entra)
    refocus(qtyOf(role) ? `${selector} [data-step="${delta > 0 ? 1 : -1}"]` : selector);
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
    const go = closest(event.target, '[data-go-platform]');
    if (go?.dataset.goPlatform) { choosePlatform(go.dataset.goPlatform); return; }
    const remove = closest(event.target, '.tray-remove');
    if (remove?.dataset.removePlatform && remove.dataset.removeRole) {
      setQuantity(remove.dataset.removePlatform, remove.dataset.removeRole, 0);
      /** @type {HTMLElement | null} */ (tray.querySelector('.tray-remove, .tray-cta'))?.focus({ preventScroll: true });
      return;
    }
    if (!closest(event.target, '.tray-cta')) return;
    const subject = squadSubject(squads);
    if (subject) prefillSubject(subject);
  });

  draw();
}
