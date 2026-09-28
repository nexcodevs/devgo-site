// @ts-check
/**
 * Comportamentos de página que não pertencem a uma seção específica:
 * menu móvel, faixa de logos, seção atual na navegação, revelação por
 * rolagem, entrada dos ícones e vídeo do hero.
 */
import { assetUrl, byId, closest, html, render, queryAll, reducedMotion, onceVisible } from '../core/dom.js';

/* ---------- Menu móvel ---------- */

export function initMobileMenu() {
  const button = byId('menu-btn');
  const menu = byId('mobile-menu');

  /** @param {boolean} open */
  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  button.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
  menu.addEventListener('click', (event) => { if (closest(event.target, 'a')) setOpen(false); });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !menu.classList.contains('is-open')) return;
    setOpen(false);
    button.focus();
  });
}

/* ---------- Logos de clientes ---------- */

/** [arquivo em assets/L_<slug>.png, proporção largura/altura, nome] */
const CLIENT_LOGOS = /** @type {const} */ ([
  ['samsung', 509 / 80, 'Samsung'],
  ['pwc', 105 / 80, 'PwC'],
  ['tim', 300 / 80, 'TIM'],
  ['ifood', 150 / 80, 'iFood'],
  ['electrolux', 351 / 80, 'Electrolux'],
  ['smiles', 194 / 80, 'Smiles'],
]);
/** Área-alvo em px² para que logos largos e compactos tenham o mesmo peso visual. */
const LOGO_AREA = 3000;
const LOGO_MAX_HEIGHT = 44;

export function initClientLogos() {
  /** @param {boolean} decorative cópia usada só para o loop da faixa */
  const cells = (decorative) => CLIENT_LOGOS.map(([slug, ratio, name]) => {
    const height = Math.min(LOGO_MAX_HEIGHT, Math.sqrt(LOGO_AREA / ratio));
    return html`<div class="logo-cell"><img src="${assetUrl(`L_${slug}.png`)}" alt="${decorative ? '' : name}" width="${Math.round(height * ratio)}" height="${Math.round(height)}"></div>`;
  });
  render(byId('logo-track'), html`${cells(false)}<div class="marquee-clone" aria-hidden="true">${cells(true)}</div>`);
}

/* ---------- Seção atual na navegação ---------- */

export function initNavSpy() {
  /** @type {Map<string, HTMLElement>} */
  // só os links para seções desta página (/#solucoes, /#clientes…)
  const links = new Map(queryAll('.nav-links a[href*="#"]').map((a) => [a.getAttribute('href')?.split('#')[1] ?? '', a]));
  /** @type {HTMLElement | undefined} */
  let current;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      current?.removeAttribute('aria-current');
      current = links.get(entry.target.id);
      current?.setAttribute('aria-current', 'true');
    }
  }, { rootMargin: '-45% 0px -50% 0px' }); // faixa estreita no meio da tela
  queryAll('main > section').forEach((section) => observer.observe(section));
}

/* ---------- Revelação por rolagem ---------- */

const REVEAL_TARGETS = ['.sec-head', '.why-grid > *', '.insight-grid > *', '.insight-intro', '.insight-list > li', '.insight-hero', '.insight-picks > *', '.glob-list > li', '.bento > *', '.quotes > *', '.next-steps > li', '.contact-form', '.stk-foot'];
const REVEAL_SAFETY_MS = 2500;

/** Esconde apenas o que está abaixo da dobra na carga; o que já está na tela nunca some. */
export function initReveal() {
  if (reducedMotion) return;
  /** @type {HTMLElement[]} */
  const pending = [];
  /** @param {Element} el */
  const show = (el) => {
    if (!el.classList.contains('is-pending')) return;
    const release = (/** @type {Event} */ event) => {
      if (event.target !== el) return; // ignora transições dos filhos
      el.classList.remove('reveal');
      el.removeEventListener('transitionend', release);
    };
    el.addEventListener('transitionend', release);
    el.classList.remove('is-pending');
  };
  for (const selector of REVEAL_TARGETS) {
    queryAll(selector).forEach((el, i) => {
      if (el.getBoundingClientRect().top <= window.innerHeight * 0.92) return;
      el.classList.add('reveal', 'is-pending');
      el.style.setProperty('--i', String(i % 4));
      pending.push(el);
    });
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      show(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  pending.forEach((el) => observer.observe(el));

  // rolagem muito rápida (ou quadros pulados) pode passar por um bloco sem o observer
  // registrar a interseção: revela tudo o que já ficou acima da dobra
  let scheduled = false;
  const sweep = () => {
    scheduled = false;
    const limit = window.innerHeight * 0.92;
    let left = 0;
    for (const el of pending) {
      if (!el.classList.contains('is-pending')) continue;
      if (el.getBoundingClientRect().top <= limit) { observer.unobserve(el); show(el); } else left++;
    }
    if (!left) window.removeEventListener('scroll', onScroll);
  };
  const onScroll = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(sweep); } };
  window.addEventListener('scroll', onScroll, { passive: true });

  // rede de segurança (ex.: pulo via âncora antes do observer disparar)
  window.setTimeout(() => {
    for (const el of pending) if (el.getBoundingClientRect().top < window.innerHeight) show(el);
  }, REVEAL_SAFETY_MS);
}

/* ---------- Ícones animados ---------- */

const ICON_STAGGER_S = 0.14;

/** Grupos marcados com [data-icons] animam seus ícones quando entram na tela. */
export function initIconEntrances() {
  for (const group of queryAll('[data-icons]')) {
    // o "desenho" do traço usa comprimento normalizado (stroke-dasharray: 1)
    group.querySelectorAll('.glob-icon *').forEach((shape) => shape.setAttribute('pathLength', '1'));
    queryAll('.why-card img, .group-icon img, .glob-icon', group)
      .forEach((icon, i) => icon.style.setProperty('--d', `${(i * ICON_STAGGER_S).toFixed(2)}s`));
    group.classList.add('icons-idle');
    onceVisible(group, () => group.classList.replace('icons-idle', 'icons-play'), { threshold: 0.25 });
  }
}

/* ---------- Frase final do hero ---------- */

const ROTATE_MS = 3200;
const DECODE_START_MS = 60;
const DECODE_STEP_MS = 45;
const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789/<>_';

/**
 * Letras de `to` com o instante (ms) em que cada uma assenta. As que já
 * coincidem com `from` na mesma posição não mudam; as outras "decodificam".
 * @param {string} from @param {string} to
 * @returns {{ char: string, settleAt: number }[]}
 */
export function decodePlan(from, to) {
  let changed = 0;
  return [...to].map((char, i) => ({ char, settleAt: from[i] === char ? 0 : DECODE_START_MS + (changed++) * DECODE_STEP_MS }));
}

/** Troca o final do título do hero com um efeito de decodificação letra a letra. */
export function initHeroRotator() {
  const rotator = byId('hero-rotator');
  const word = /** @type {HTMLElement} */ (rotator.querySelector('.hero-rotator-word'));
  /** @type {string[]} */
  const phrases = JSON.parse(rotator.dataset.phrases ?? '[]');
  if (reducedMotion || phrases.length < 2) return;
  let index = 0;

  /** @param {string} to */
  const decode = (to) => {
    const plan = decodePlan(word.textContent ?? '', to);
    const cells = plan.map(({ char }) => {
      const cell = document.createElement('span');
      cell.textContent = char;
      return cell;
    });
    word.replaceChildren(...cells);
    const start = performance.now();
    const tick = (/** @type {number} */ now) => {
      const elapsed = now - start;
      let pending = false;
      plan.forEach(({ char, settleAt }, i) => {
        const cell = cells[i];
        if (elapsed >= settleAt || char === ' ') {
          if (cell.classList.contains('is-scramble') || cell.textContent !== char) { cell.textContent = char; cell.className = 'is-settled'; }
        } else {
          pending = true;
          cell.className = 'is-scramble';
          cell.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      });
      if (pending) requestAnimationFrame(tick);
      else { word.textContent = to; }
    };
    requestAnimationFrame(tick);
  };

  window.setInterval(() => {
    if (document.hidden) return;
    index = (index + 1) % phrases.length;
    decode(phrases[index]);
  }, ROTATE_MS);
}

/* ---------- Vídeo do hero ---------- */

export function initHeroVideo() {
  if (!reducedMotion) return;
  const video = byId('hero-video', HTMLVideoElement);
  video.removeAttribute('autoplay');
  video.pause();
}
