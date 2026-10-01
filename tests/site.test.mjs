// Testes de ponta a ponta do site: renderização, acessibilidade básica e
// cada interação, em todas as páginas. Rodar a partir da raiz: npm --prefix tests test
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from './static-server.mjs';
import { build } from '../build/build.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, phone: { width: 390, height: 844 } };
let PAGES = [];

let server, browser;
before(async () => {
  PAGES = await build();
  server = await serve(`${ROOT}dist`, `${ROOT}vercel.json`);
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await server?.close();
});

/**
 * Abre uma página e coleta erros de console, exceções e requisições com falha.
 * @param {{ path?: string, viewport?: {width:number,height:number}, reducedMotion?: 'reduce' | 'no-preference' }} [options]
 */
async function open({ path = '/', viewport = VIEWPORTS.desktop, reducedMotion = 'no-preference' } = {}) {
  const page = await browser.newPage({ viewport });
  await page.emulateMedia({ reducedMotion });
  const problems = [];
  const scripts = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()}: ${r.url()}`); });
  page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname); });
  await page.goto(new URL(path, server.url).href);
  await page.waitForLoadState('networkidle');
  return { page, problems, scripts };
}

/** Rola a página inteira devagar, como uma pessoa lendo. */
async function scrollThrough(page) {
  // mede a altura a cada passo: a página pode crescer enquanto carrega (imagens, blocos renderizados em JS)
  for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 300) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
}

const subject = (page) => page.inputValue('#ct-assunto');

describe('renderização', () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`todas as páginas carregam sem erros e sem rolagem lateral (${name})`, async () => {
      for (const path of PAGES) {
        const { page, problems } = await open({ path, viewport });
        await scrollThrough(page);
        assert.deepEqual(problems, [], path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(overflow <= 0, `${path}: rolagem lateral de ${overflow}px`);
        assert.equal(await page.locator('.is-pending').count(), 0, `${path}: algum bloco não foi revelado`);
        await page.close();
      }
    });
  }

  test('cada página tem as seções esperadas', async () => {
    const expected = {
      '/': { '.svc-item': 4, '.logo-cell': 14, '.marquee-clone img[alt=""]': 7, '.sq-platform': 7, '.sq-tab': 5, '.squad-role': 5, '.orbit-pill': 28, '.stk-filter': 7, '.tile-matrix i': 90, '.quote': 2, '#insights .insight-item img': 4, '#insights .insight-intro h2': 1, '#insights .insight-intro .btn': 1, '.glob-city': 5, '.glob-list li': 4, '#faq': 0, '#como-funciona': 0, '#contact-form': 1 },
      '/politica-de-privacidade': { '.legal h2': 12, '.legal a[href^="mailto:"]': 3 },
      '/insights': { '.insight-hero img': 1, '.insight-pick img': 2, '.insight-card img': 20, '.insight-filters button': 6 },
    };
    for (const path of PAGES.filter((p) => p.startsWith('/insights/'))) expected[path] = { '.prose h2': 3, '.article-cover img': 1, '.insight-card .insight-thumb img': 3, '.article-cta .btn': 1 };
    assert.deepEqual(Object.keys(expected).sort(), [...PAGES].sort());
    for (const [path, counts] of Object.entries(expected)) {
      const { page } = await open({ path });
      for (const [selector, n] of Object.entries(counts)) {
        const found = await page.locator(selector).count();
        if (selector === '.prose h2') assert.ok(found >= n, `${path} ${selector}: ${found}`);
        else assert.equal(found, n, `${path} ${selector}`);
      }
      await page.close();
    }
  });

  test('endereço inexistente mostra a página 404, fora do índice e do sitemap', async () => {
    const response = await fetch(new URL('/pagina-que-nao-existe', server.url));
    assert.equal(response.status, 404);
    const body = await response.text();
    assert.match(body, /não está no time/);
    assert.match(body, /<meta name="robots" content="noindex">/);
    const sitemap = await (await fetch(new URL('/sitemap.xml', server.url))).text();
    assert.doesNotMatch(sitemap, /\/404</);
    assert.match(sitemap, /politica-de-privacidade/);
  });

  test('abrir uma página por link começa do topo', async () => {
    const { page } = await open();
    const link = page.locator('#insights .insight-item').first();
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await page.waitForLoadState('load');
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => Math.round(window.scrollY)), 0);
    await page.close();
  });

  test('conteúdo pré-renderizado aparece sem JavaScript', async () => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(server.url);
    assert.equal(await page.locator('#insights .insight-item h3').count(), 4);
    assert.match(await page.locator('#solucoes').textContent(), /\S/);
    await page.goto(new URL('/insights', server.url).href);
    assert.equal(await page.locator('.insight-card:visible').count(), 20);
    assert.equal(await page.locator('#insight-filters:visible').count(), 0);
    await context.close();
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

describe('carregamento e navegação entre páginas', () => {
  test('cada página pré-carrega exatamente os módulos que usa', async () => {
    for (const path of PAGES) {
      const { page, scripts } = await open({ path });
      const preloaded = (await page.$$eval('link[rel="modulepreload"]', (links) => links.map((l) => l.getAttribute('href')))).sort();
      const used = [...new Set(scripts)].filter((s) => s !== '/js/main.js').sort();
      assert.deepEqual(preloaded, used, path);
      await page.close();
    }
  });

  test('todos os links internos respondem', async () => {
    const hrefs = new Set();
    for (const path of PAGES) {
      const { page } = await open({ path });
      for (const href of await page.$$eval('a[href^="/"]', (links) => links.map((a) => a.getAttribute('href')))) hrefs.add(href);
      await page.close();
    }
    for (const href of hrefs) {
      const [pathname, hash] = href.split('#');
      const response = await fetch(new URL(pathname || '/', server.url));
      assert.equal(response.status, 200, href);
      if (hash) assert.match(await response.text(), new RegExp(`id="${hash}"`), `${href}: âncora inexistente`);
    }
  });

  test('o menu marca a página atual', async () => {
    const { page } = await open({ path: '/insights' });
    assert.deepEqual(await page.$$eval('.nav-links [aria-current="page"]', (els) => els.map((e) => e.textContent)), ['Insights']);
    await page.close();
  });

  test('artigos têm dados estruturados válidos e link de volta para Insights', async () => {
    for (const path of PAGES.filter((p) => p.startsWith('/insights/'))) {
      const { page } = await open({ path });
      const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
      assert.equal(data['@type'], 'Article', path);
      assert.equal(data.mainEntityOfPage.endsWith(path), true, path);
      assert.equal(await page.getAttribute('.nav-links [aria-current="page"]', 'href'), '/insights', path);
      await page.close();
    }
  });

  test('sitemap lista todas as páginas', async () => {
    const xml = await (await fetch(new URL('/sitemap.xml', server.url))).text();
    for (const path of PAGES) assert.match(xml, new RegExp(`<loc>[^<]*${path === '/' ? '/' : path}</loc>`));
  });
});

describe('acessibilidade básica', () => {
  test('um único h1, imagens com alt e controles com nome em todas as páginas', async () => {
    for (const path of PAGES) {
      const { page } = await open({ path });
      assert.equal(await page.locator('h1').count(), 1, path);
      assert.equal(await page.locator('img:not([alt])').count(), 0, path);
      const unnamed = await page.evaluate(() => [...document.querySelectorAll('button, a[href]')]
        .filter((el) => !(el.getAttribute('aria-label') || el.textContent.trim()))
        .map((el) => el.outerHTML.slice(0, 80)));
      assert.deepEqual(unnamed, [], path);
      assert.equal(await page.locator('a[target="_blank"]:not([rel*="noopener"])').count(), 0, path);
      await page.close();
    }
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
    await page.click('#mobile-menu a[href="/#solucoes"]');
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
  test('plataformas, cargos com quantidade, resumo por plataforma e contato', async () => {
    const { page } = await open();
    const role = (name) => page.locator(`.squad-role[data-role="${name}"]`);

    await page.click('.sq-platform[data-platform="SAP"]');
    assert.equal(await page.getAttribute('.sq-tab[aria-selected="true"]', 'id'), 'sq-tab-platform');
    await role('Dev ABAP').click();
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Mais Dev ABAP');
    await role('Dev ABAP').locator('[data-step="1"]').click();
    await page.click('.sq-tab:has-text("Qualidade e Operação")');
    await role('QA').click();
    assert.equal(await page.textContent('.sq-platform[data-platform="SAP"] em'), '3');
    assert.equal(await page.textContent('.sq-tab[data-tab="platform"] em'), '2');

    await page.click('.sq-platform[data-platform="VTEX"]');
    await role('Dev VTEX IO').click();
    assert.equal(await page.textContent('.tray-head span'), '4 profissionais');
    assert.equal(await page.locator('.tray-group').count(), 2);

    await page.click('.tray-cta');
    assert.equal(await subject(page), 'Squad SAP: 2× Dev ABAP, 1× QA · Squad VTEX: 1× Dev VTEX IO');

    await page.click('[data-go-platform="SAP"]');
    await page.click('.sq-tab:has-text("Qualidade e Operação")');
    await role('QA').locator('[data-step="-1"]').click();
    assert.equal(await role('QA').evaluate((el) => el.classList.contains('is-active')), false);
    await page.click('.tray-remove[data-remove-platform="VTEX"]');
    assert.equal(await page.locator('.tray-group').count(), 1);

    await page.click('.sq-tab[data-tab="platform"]');
    for (let i = 0; i < 25; i++) await role('Dev ABAP').locator('[data-step="1"]').click();
    assert.equal(await role('Dev ABAP').locator('.squad-step b').textContent(), '20');
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

  test('no envio, marca todos os campos com erro e foca o primeiro', async () => {
    const { page } = await open();
    await page.click('#contact-form button[type="submit"]');
    assert.equal(await page.textContent('#form-status'), 'Confira os 7 campos destacados.');
    assert.equal(await page.locator('#contact-form [aria-invalid="true"]').count(), 7);
    assert.equal(await page.textContent('#ct-nome-err'), 'Informe seu nome.');
    assert.equal(await page.getAttribute('#ct-nome', 'aria-describedby'), 'ct-nome-err');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'ct-nome');
    await page.fill('#ct-nome', 'Ana');
    assert.equal(await page.getAttribute('#ct-nome', 'aria-invalid'), null, 'corrigir o campo remove o destaque');
    assert.equal(await page.textContent('#ct-nome-err'), '');
    await page.close();
  });

  test('valida ao sair do campo, com regras por tipo', async () => {
    const { page } = await open();
    const blurWith = async (selector, value) => { await page.fill(selector, value); await page.locator(selector).blur(); return page.textContent(`${selector}-err`); };
    assert.equal(await blurWith('#ct-nome', '123'), 'Use apenas letras no nome.');
    assert.equal(await blurWith('#ct-nome', 'Ana Maria'), '');
    assert.equal(await blurWith('#ct-email', 'ana@empresa'), 'Informe um e-mail válido, como voce@empresa.com.');
    assert.equal(await blurWith('#ct-email', 'ana@empresa.com.br'), '');
    assert.equal(await blurWith('#ct-tel', '9999'), 'Informe o telefone com DDD, como (11) 90000-0000.');
    await page.fill('#ct-tel', '');
    await page.locator('#ct-tel').pressSequentially('11987654321');
    assert.equal(await page.inputValue('#ct-tel'), '(11) 98765-4321', 'máscara de telefone');
    assert.equal(await blurWith('#ct-msg', 'curta'), 'Conte um pouco mais: pelo menos 10 caracteres.');
    await page.locator('#ct-emp').focus();
    await page.locator('#ct-emp').blur();
    assert.equal(await page.textContent('#ct-emp-err'), '', 'só atravessar o campo não acusa erro');
    await page.close();
  });

  test('aviso de LGPD aponta para a política de privacidade', async () => {
    const { page } = await open();
    assert.equal(await page.getAttribute('#form-note a', 'href'), '/politica-de-privacidade');
    assert.equal(await page.locator('#form-captcha:visible').count(), 0, 'sem chave, o captcha fica oculto');
    await page.close();
  });

  test('com dados válidos, envia para /api/lead e confirma', async () => {
    const { page } = await open();
    /** @type {any} */
    let sent = null;
    await page.route('**/api/lead', async (route) => { sent = route.request().postDataJSON(); await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
    for (const [selector, value] of Object.entries(VALID)) await page.fill(selector, value);
    await page.selectOption('#ct-func', { index: 1 });
    await page.click('#contact-form button[type="submit"]');
    const status = page.locator('#form-status');
    await status.filter({ hasText: 'Mensagem enviada' }).waitFor();
    assert.equal(await status.evaluate((el) => el.classList.contains('is-success')), true);
    assert.deepEqual([sent.nome, sent.email, sent.empresa, sent.assunto, sent.funcionarios], ['Ana', 'ana@empresa.com', 'Acme', 'Alocar 2 devs', '1 a 50']);
    assert.equal(sent.website, '');
    assert.equal(typeof sent.elapsed, 'number');
    assert.equal(await page.inputValue('#ct-nome'), '', 'formulário limpo depois do envio');
    await page.close();
  });

  test('se o servidor falhar, mantém os dados e oferece outro canal', async () => {
    const { page } = await open();
    await page.route('**/api/lead', (route) => route.fulfill({ status: 502, contentType: 'application/json', body: '{"ok":false}' }));
    for (const [selector, value] of Object.entries(VALID)) await page.fill(selector, value);
    await page.selectOption('#ct-func', { index: 1 });
    await page.click('#contact-form button[type="submit"]');
    const status = page.locator('#form-status');
    await status.filter({ hasText: 'Não conseguimos enviar' }).waitFor();
    assert.equal(await page.inputValue('#ct-nome'), 'Ana');
    assert.equal(await status.locator('a').getAttribute('rel'), 'noopener noreferrer');
    assert.equal(await page.isEnabled('#contact-form button[type="submit"]'), true);
    await page.close();
  });

  test('erro de campo vindo do servidor marca o campo', async () => {
    const { page } = await open();
    await page.route('**/api/lead', (route) => route.fulfill({ status: 400, contentType: 'application/json', body: '{"ok":false,"error":"email"}' }));
    for (const [selector, value] of Object.entries(VALID)) await page.fill(selector, value);
    await page.selectOption('#ct-func', { index: 1 });
    await page.click('#contact-form button[type="submit"]');
    await page.locator('#form-status').filter({ hasText: 'Confira o campo destacado' }).waitFor();
    assert.equal(await page.getAttribute('#ct-email', 'aria-invalid'), 'true');
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

describe('biblioteca de insights', () => {
  test('filtra por tema e mostra mais artigos', async () => {
    const { page } = await open({ path: '/insights' });
    const visible = () => page.locator('#insight-all .insight-card:visible').count();
    assert.equal(await visible(), 9);
    await page.click('#insight-more');
    assert.equal(await visible(), 17);
    assert.equal(await page.locator('#insight-more:visible').count(), 0);
    await page.click('#insight-filters button[data-topic="Stacks e plataformas"]');
    assert.equal(await visible(), 4);
    assert.equal(await page.locator('#insight-top:visible').count(), 0);
    assert.equal(await page.textContent('#insight-library-title'), 'Stacks e plataformas');
    await page.click('#insight-filters button[data-topic=""]');
    assert.equal(await visible(), 9);
    assert.equal(await page.locator('#insight-top:visible').count(), 1);
    await page.close();
  });
});

describe('navegação', () => {
  test('na home, marca no menu a seção visível', async () => {
    const { page } = await open();
    await page.locator('#solucoes').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(400);
    assert.equal(await page.getAttribute('.nav-links a[href="/#solucoes"]', 'aria-current'), 'true');
    assert.equal(await page.locator('.nav-links a[aria-current]').count(), 1);
    await page.close();
  });
});

describe('hero', () => {
  test('troca a frase final do título, e o título acessível continua fixo', async () => {
    const { page } = await open();
    const first = await page.textContent('.hero-rotator-word');
    await page.waitForTimeout(3300);
    assert.notEqual(await page.textContent('.hero-rotator-word'), first);
    assert.equal(await page.textContent('.hero h1 .sr-only'), 'para o seu time.');
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
      const { shuffle, feedWindow } = await import('/js/features/numbers.js');
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
        feedShifts: feedWindow(1, 3)[1].role === feedWindow(0, 3)[0].role && feedWindow(0, 3)[2].role !== feedWindow(0, 3)[0].role,
      };
    });
    assert.deepEqual(result, {
      sameZone: 9, london: 6, farAway: 0,
      spOffset: -3, nyOffset: -5, unknownZone: null,
      initials: ['UU', 'QA', 'BE', 'AD'],
      shuffleKeepsItems: true, shuffleIsPure: true, feedShifts: true,
    });
    await page.close();
  });
});
