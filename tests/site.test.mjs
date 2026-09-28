// Testes de ponta a ponta do site: renderização, acessibilidade básica e
// cada interação. Rodar a partir da raiz: npm --prefix tests test
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from './static-server.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, phone: { width: 390, height: 844 } };

let server, browser;
before(async () => {
  server = await serve(ROOT);
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await server?.close();
});

/**
 * Abre a página e coleta erros de console, exceções e requisições com falha.
 * @param {{ viewport?: {width:number,height:number}, reducedMotion?: 'reduce' | 'no-preference' }} [options]
 */
async function open({ viewport = VIEWPORTS.desktop, reducedMotion = 'no-preference' } = {}) {
  const page = await browser.newPage({ viewport });
  await page.emulateMedia({ reducedMotion });
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()}: ${r.url()}`); });
  await page.goto(server.url);
  await page.waitForLoadState('networkidle');
  return { page, problems };
}

/** Rola a página inteira devagar, como uma pessoa lendo. */
async function scrollThrough(page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 300) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(800);
}

const subject = (page) => page.inputValue('#ct-assunto');

describe('renderização', () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`carrega sem erros e sem rolagem lateral (${name})`, async () => {
      const { page, problems } = await open({ viewport });
      await scrollThrough(page);
      assert.deepEqual(problems, []);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `rolagem lateral de ${overflow}px`);
      assert.equal(await page.locator('.is-pending').count(), 0, 'algum bloco não foi revelado');
      await page.close();
    });
  }

  test('todas as seções dinâmicas são renderizadas', async () => {
    const { page } = await open();
    const count = (selector) => page.locator(selector).count();
    assert.equal(await count('.svc-item'), 4);
    assert.equal(await count('.logo-cell'), 12); // 6 logos + cópia do loop
    assert.equal(await count('.marquee-clone img[alt=""]'), 6);
    assert.equal(await count('.glob-city'), 5);
    assert.equal(await count('.orbit-pill'), 28);
    assert.equal(await count('.stk-filter'), 7);
    assert.equal(await count('.squad-group'), 4);
    assert.equal(await count('.squad-role'), 16);
    assert.equal(await count('.tile-matrix i'), 90);
    await page.close();
  });

  test('globo desenha no canvas', async () => {
    const { page } = await open();
    await page.locator('#globe').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const painted = await page.evaluate(() => {
      const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('globe'));
      const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      let lit = 0;
      for (let i = 3; i < data.length; i += 4 * 97) if (data[i] > 0) lit++;
      return lit;
    });
    assert.ok(painted > 100, `canvas quase vazio (${painted} amostras pintadas)`);
    await page.close();
  });
});

describe('carregamento', () => {
  test('todo módulo JS está no modulepreload (e nada além deles)', async () => {
    const { readdir } = await import('node:fs/promises');
    const files = (await readdir(new URL('../js', import.meta.url), { recursive: true }))
      .filter((f) => f.endsWith('.js') && f !== 'main.js')
      .map((f) => `js/${f.split('\\').join('/')}`)
      .sort();
    const { page } = await open();
    const preloaded = (await page.$$eval('link[rel="modulepreload"]', (links) => links.map((l) => l.getAttribute('href')))).sort();
    assert.deepEqual(preloaded, files);
    await page.close();
  });
});

describe('acessibilidade básica', () => {
  test('um único h1, imagens com alt e controles com nome', async () => {
    const { page } = await open();
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('img:not([alt])').count(), 0);
    const unnamed = await page.evaluate(() => [...document.querySelectorAll('button, a[href]')]
      .filter((el) => !(el.getAttribute('aria-label') || el.textContent.trim()))
      .map((el) => el.outerHTML.slice(0, 80)));
    assert.deepEqual(unnamed, []);
    const blankTargets = await page.locator('a[target="_blank"]:not([rel*="noopener"])').count();
    assert.equal(blankTargets, 0);
    await page.close();
  });

  test('stacks fora do filtro saem da ordem de tabulação', async () => {
    const { page } = await open();
    await page.click('.stk-filter[data-filter="CRM"]');
    assert.equal(await page.locator('.orbit-pill.is-dimmed:not([tabindex="-1"])').count(), 0);
    assert.equal(await page.locator('.orbit-pill:not(.is-dimmed)').count(), 3);
    await page.close();
  });
});

describe('menu móvel', () => {
  test('abre, fecha com Esc e ao escolher um link', async () => {
    const { page } = await open({ viewport: VIEWPORTS.phone });
    const button = page.locator('#menu-btn');
    await button.click();
    assert.equal(await button.getAttribute('aria-expanded'), 'true');
    assert.equal(await button.getAttribute('aria-label'), 'Fechar menu');
    await page.keyboard.press('Escape');
    assert.equal(await button.getAttribute('aria-expanded'), 'false');
    await button.click();
    await page.click('#mobile-menu a[href="#stacks"]');
    assert.equal(await button.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('#mobile-menu').evaluate((el) => el.classList.contains('is-open')), false);
    await page.close();
  });
});

describe('soluções', () => {
  test('clique abre o item e atualiza aria-expanded', async () => {
    const { page } = await open();
    await page.locator('#services').scrollIntoViewIfNeeded();
    await page.click('.svc-item:nth-child(3) .svc-head');
    const state = await page.$$eval('.svc-item', (items) => items.map((i) => [i.classList.contains('is-active'), i.classList.contains('is-done'), i.querySelector('.svc-head').getAttribute('aria-expanded')]));
    assert.deepEqual(state, [[false, true, 'false'], [false, true, 'false'], [true, false, 'true'], [false, false, 'false']]);
    await page.close();
  });

  test('avança sozinho quando visível e pausa com o mouse em cima', async () => {
    const { page } = await open();
    await page.evaluate(() => document.getElementById('services').style.setProperty('--svc-duration', '300ms'));
    await page.locator('#services').scrollIntoViewIfNeeded();
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1000);
    const advanced = await page.$eval('.svc-item.is-active', (el) => [...el.parentElement.children].indexOf(el));
    assert.ok(advanced > 0, 'não avançou');
    // o item ativo muda de largura o tempo todo; o mouse entra pelo centro do acordeão
    const box = await page.locator('#services').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const paused = await page.$eval('.svc-item.is-active', (el) => [...el.parentElement.children].indexOf(el));
    await page.waitForTimeout(900);
    assert.equal(await page.$eval('.svc-item.is-active', (el) => [...el.parentElement.children].indexOf(el)), paused);
    await page.close();
  });

  test('fica estático no celular', async () => {
    const { page } = await open({ viewport: VIEWPORTS.phone });
    assert.equal(await page.$eval('#services', (el) => el.classList.contains('is-static')), true);
    await page.close();
  });
});

describe('stacks', () => {
  test('filtro seleciona a primeira stack da categoria e o CTA preenche o contato', async () => {
    const { page } = await open();
    await page.locator('#stacks').scrollIntoViewIfNeeded();
    await page.click('.stk-filter[data-filter="CRM"]');
    assert.equal(await page.getAttribute('.stk-filter[data-filter="CRM"]', 'aria-pressed'), 'true');
    assert.equal(await page.textContent('#orbit-detail h3'), 'Salesforce');
    await page.hover('.orbit-pill[aria-label="HubSpot"]');
    assert.equal(await page.textContent('#orbit-detail h3'), 'HubSpot');
    await page.click('#orbit-detail .orbit-cta');
    assert.equal(await subject(page), 'Alocar profissional de HubSpot');
    await page.waitForTimeout(900);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'ct-nome');
    await page.close();
  });

  test('lista do celular pede o profissional', async () => {
    const { page } = await open({ viewport: VIEWPORTS.phone, reducedMotion: 'reduce' });
    await page.click('.orbit-chip[data-stack="VTEX"]');
    assert.equal(await subject(page), 'Alocar profissional de VTEX');
    await page.close();
  });
});

describe('monte seu squad', () => {
  test('adiciona, ajusta, limita e resume no contato', async () => {
    const { page } = await open();
    const row = (role) => page.locator(`.squad-role[data-role="${role}"]`);
    await row('Back-end').locator('.squad-add').click();
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Mais Back-end');
    await row('Back-end').locator('[data-step="1"]').click();
    await row('QA').locator('.squad-add').click();
    assert.equal(await page.textContent('.tray-head span'), '3 profissionais');
    assert.equal(await page.locator('.tray-dots i').count(), 3);

    await page.click('.tray-cta');
    assert.equal(await subject(page), 'Squad: 2× Back-end, 1× QA');

    await row('QA').locator('[data-step="-1"]').click();
    assert.equal(await row('QA').evaluate((el) => el.classList.contains('is-active')), false);
    for (let i = 0; i < 25; i++) await row('Back-end').locator('[data-step="1"]').click();
    assert.equal(await row('Back-end').locator('.squad-step b').textContent(), '20');
    await page.close();
  });

  test('squad vazio leva ao especialista sem mexer no assunto', async () => {
    const { page } = await open();
    assert.equal(await page.textContent('.tray-head span'), 'vazio');
    await page.click('.tray-cta');
    assert.equal(await subject(page), '');
    await page.close();
  });
});

describe('seletor de quantidade', () => {
  test('preenche o assunto conforme a opção', async () => {
    const { page } = await open();
    await page.click('.qty-options button:has-text("6 a 10")');
    await page.click('.qty-go');
    assert.equal(await subject(page), 'Alocar 6 a 10 profissionais');
    await page.click('.qty-options button:text-is("1")');
    await page.click('.qty-go');
    assert.equal(await subject(page), 'Alocar 1 profissional');
    assert.equal(await page.locator('.qty-options [aria-pressed="true"]').count(), 1);
    await page.close();
  });
});

describe('formulário de contato', () => {
  const VALID = { '#ct-nome': 'Ana', '#ct-email': 'ana@empresa.com', '#ct-tel': '(11) 99999-0000', '#ct-emp': 'Acme', '#ct-assunto': 'Alocar 2 devs', '#ct-msg': 'Precisamos de dois devs sênior.' };

  test('mostra o primeiro erro, marca e foca o campo', async () => {
    const { page } = await open();
    await page.click('#contact-form button[type="submit"]');
    assert.equal(await page.textContent('#form-status'), 'Informe seu nome.');
    assert.equal(await page.getAttribute('#ct-nome', 'aria-invalid'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'ct-nome');
    await page.fill('#ct-nome', 'A');
    assert.equal(await page.getAttribute('#ct-nome', 'aria-invalid'), null, 'corrigir o campo remove o destaque');
    await page.close();
  });

  test('valida cada regra na ordem', async () => {
    const { page } = await open();
    const expectError = async (message) => {
      await page.click('#contact-form button[type="submit"]');
      assert.equal(await page.textContent('#form-status'), message);
    };
    await page.fill('#ct-nome', 'Ana');
    await page.fill('#ct-email', 'ana@');
    await expectError('Informe um e-mail válido, como voce@empresa.com.');
    await page.fill('#ct-email', VALID['#ct-email']);
    await page.fill('#ct-tel', '9999');
    await expectError('Informe um telefone com DDD.');
    await page.fill('#ct-tel', VALID['#ct-tel']);
    await page.fill('#ct-emp', '   ');
    await expectError('Informe a empresa.');
    await page.fill('#ct-emp', 'Acme');
    await expectError('Selecione o número de funcionários.');
    await page.selectOption('#ct-func', { index: 2 });
    await expectError('Informe o assunto.');
    await page.fill('#ct-assunto', 'Teste');
    await page.fill('#ct-msg', 'curta');
    await expectError('Escreva uma mensagem com pelo menos 10 caracteres.');
    await page.close();
  });

  test('com dados válidos, avisa que o envio ainda não está ativo', async () => {
    const { page } = await open();
    for (const [selector, value] of Object.entries(VALID)) await page.fill(selector, value);
    await page.selectOption('#ct-func', { index: 1 });
    await page.click('#contact-form button[type="submit"]');
    const status = page.locator('#form-status');
    assert.match(await status.textContent(), /envio on-line entra no ar em breve/);
    assert.equal(await status.evaluate((el) => el.classList.contains('is-success')), true);
    assert.equal(await page.locator('#contact-form [aria-invalid]').count(), 0);
    assert.equal(await status.locator('a').getAttribute('rel'), 'noopener noreferrer');
    await page.close();
  });

  test('texto do usuário nunca vira HTML', async () => {
    const { page } = await open();
    await page.evaluate(async () => {
      const { html, escapeHtml } = await import('/js/core/dom.js');
      window.__probe = [String(html`<b>${'<img src=x onerror=alert(1)>'}</b>`), escapeHtml(`"'&`)];
    });
    const [markup, escaped] = await page.evaluate(() => window.__probe);
    assert.equal(markup, '<b>&lt;img src=x onerror=alert(1)&gt;</b>');
    assert.equal(escaped, '&quot;&#39;&amp;');
    await page.close();
  });
});

describe('navegação', () => {
  test('marca a seção visível no menu', async () => {
    const { page } = await open();
    await page.locator('#stacks').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(400);
    assert.equal(await page.getAttribute('.nav-links a[href="#stacks"]', 'aria-current'), 'true');
    assert.equal(await page.locator('.nav-links a[aria-current]').count(), 1);
    await page.close();
  });
});

describe('movimento reduzido', () => {
  test('nada fica escondido, vídeo pausado, acordeão estático', async () => {
    const { page, problems } = await open({ reducedMotion: 'reduce' });
    assert.deepEqual(problems, []);
    assert.equal(await page.locator('.reveal, .is-pending').count(), 0);
    assert.equal(await page.$eval('#hero-video', (v) => v.paused), true);
    assert.equal(await page.$eval('#services', (el) => el.classList.contains('is-static')), true);
    assert.equal(await page.locator('.tile-matrix i.is-on').count(), 90);
    await page.close();
  });
});

describe('funções puras', () => {
  test('horas em comum, fusos, iniciais e embaralhamento', async () => {
    const { page } = await open();
    const result = await page.evaluate(async () => {
      const { sharedWorkHours, utcOffsetHours } = await import('/js/features/world-hours.js');
      const { initials } = await import('/js/features/squad.js');
      const { shuffle } = await import('/js/features/numbers.js');
      const jan = new Date(Date.UTC(2026, 0, 15, 12));
      const items = Array.from({ length: 50 }, (_, i) => i);
      return {
        sameZone: sharedWorkHours(-3, -3),
        london: sharedWorkHours(-3, 0),
        farAway: sharedWorkHours(-3, 9),
        spOffset: utcOffsetHours('America/Sao_Paulo', jan),
        nyOffset: utcOffsetHours('America/New_York', jan),
        unknownZone: utcOffsetHours('Mars/Base', jan),
        initials: ['UX/UI Designer', 'QA', 'Back-end', 'Automação de testes'].map(initials),
        shuffleKeepsItems: shuffle(items).sort((a, b) => a - b).join() === items.join(),
        shuffleIsPure: items[0] === 0 && items[49] === 49,
      };
    });
    assert.deepEqual(result, {
      sameZone: 9, london: 6, farAway: 0,
      spOffset: -3, nyOffset: -5, unknownZone: null,
      initials: ['UU', 'QA', 'BE', 'AD'],
      shuffleKeepsItems: true, shuffleIsPure: true,
    });
    await page.close();
  });
});
