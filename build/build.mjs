// Build do site: monta as páginas de site/pages com os trechos de
// site/partials, pré-renderiza blocos a partir de js/data e gera dist/.
// Sem dependências: `node build/build.mjs`.
//
// Marcadores aceitos nas páginas:
//   <!--page {json} -->       primeira linha: slug, title, description, nav, navSpy
//                             artigos: type "article", category, date (AAAA-MM-DD), readingTime, summary,
//                             image (em assets/, com versão -sm.jpg de 600px), imageAlt e imageFocus
//                             (object-position do rosto, ex. "50% 30%")
//   <!-- include:nome -->     insere site/partials/nome.html
//   <!-- render:nome -->      insere o HTML gerado por RENDERERS[nome]
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RENDERERS } from './renderers.mjs';
import { FEATURES } from '../js/registry.js';

/** Endereço público. Troque para https://devgo.digital quando o domínio apontar para a Vercel. */
export const SITE_URL = 'https://devgo-site-2026.vercel.app';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'dist');
const STATIC = ['css', 'js', 'assets', 'fonts', 'favicon.svg'];

const read = (path) => readFile(join(ROOT, path), 'utf8');

/** Resolve `<!-- include:x -->` recursivamente (partials podem incluir partials). */
async function expandIncludes(source, depth = 0) {
  if (depth > 5) throw new Error('include aninhado demais');
  let html = source;
  const names = [...new Set([...html.matchAll(/<!-- include:([\w-]+) -->/g)].map((m) => m[1]))];
  for (const name of names) {
    const partial = await expandIncludes(await read(`site/partials/${name}.html`), depth + 1);
    html = html.replaceAll(`<!-- include:${name} -->`, partial.trim());
  }
  return html;
}

/** @param {string} html @param {{ meta: object, pages: object[] }} context página atual e todas as páginas */
function expandRenders(html, context) {
  return html.replace(/<!-- render:([\w-]+) -->/g, (_, name) => {
    const render = RENDERERS[name];
    if (!render) throw new Error(`render:${name} não existe em build/renderers.mjs`);
    return render(context);
  });
}

/** Features cujo seletor aparece no HTML final da página. */
function featuresIn(html) {
  return FEATURES.filter(({ selector }) => {
    if (selector.startsWith('#')) return html.includes(`id="${selector.slice(1)}"`);
    const attr = selector.match(/^\[([\w-]+)\]$/)?.[1];
    if (attr) return new RegExp(`\\s${attr}[\\s>=]`).test(html);
    throw new Error(`Seletor não suportado no registry: ${selector}`);
  });
}

/** Módulos JS que a página vai importar: os das features e todas as dependências estáticas. */
async function moduleClosure(entries) {
  const seen = new Set();
  const visit = async (path) => {
    if (seen.has(path)) return;
    seen.add(path);
    const source = await read(path);
    for (const [, spec] of source.matchAll(/^\s*import\s[^'"]*['"](\.{1,2}\/[^'"]+)['"]/gm)) {
      await visit(posix.normalize(posix.join(posix.dirname(path), spec)));
    }
  };
  for (const entry of entries) await visit(entry);
  return [...seen].sort();
}

const escapeAttr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Lê a página e os metadados da primeira linha. */
async function readPage(file) {
  const source = await read(`site/pages/${file}`);
  const match = source.match(/^<!--page (\{.*\}) -->\n/);
  if (!match) throw new Error(`${file}: falta a linha <!--page {...} -->`);
  const meta = JSON.parse(match[1]);
  const expected = file.replace(/\.html$/, '');
  if (meta.slug !== expected) throw new Error(`${file}: slug "${meta.slug}" deveria ser "${expected}"`);
  meta.path = meta.slug === 'index' ? '/' : `/${meta.slug}`;
  return { meta, content: source.slice(match[0].length) };
}

/** Dados estruturados de artigo para buscadores. */
function articleJsonLd(meta) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: meta.title.replace(/ · Insights Devgo$/, ''),
    description: meta.description,
    datePublished: meta.date,
    image: `${SITE_URL}/assets/${meta.image}`,
    inLanguage: 'pt-BR',
    author: { '@type': 'Organization', name: 'Devgo' },
    publisher: { '@type': 'Organization', name: 'Devgo', logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/logo.svg` } },
    mainEntityOfPage: SITE_URL + meta.path,
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

async function buildPage({ meta, content }, pages) {
  const main = expandRenders(await expandIncludes(content), { meta, pages });
  let header = await read('site/partials/header.html');
  if (meta.nav) header = header.replaceAll(`data-nav="${meta.nav}"`, `data-nav="${meta.nav}" aria-current="page"`);
  const footer = await read('site/partials/footer.html');
  const mainTag = meta.navSpy ? '<main id="top" data-nav-spy>' : '<main id="top">';
  const body = `${header.trim()}\n\n${mainTag}\n${main.trim()}\n</main>\n\n${footer.trim()}`;

  const entries = ['js/main.js', 'js/registry.js', ...featuresIn(body).map((f) => posix.join('js', f.module))];
  const modules = (await moduleClosure(entries)).filter((m) => m !== 'js/main.js');
  const preloads = modules.map((m) => `<link rel="modulepreload" href="/${m}">`).join('\n');

  const head = (await read('site/partials/head.html'))
    .replaceAll('{{title}}', escapeAttr(meta.title))
    .replaceAll('{{description}}', escapeAttr(meta.description))
    .replaceAll('{{og_type}}', meta.type === 'article' ? 'article' : 'website')
    .replaceAll('{{url}}', SITE_URL + meta.path)
    .replaceAll('{{og_image}}', `${SITE_URL}/assets/${meta.image ?? 'og.jpg'}`)
    .replaceAll('{{site}}', SITE_URL)
    .replace('{{head_extra}}', meta.type === 'article' ? articleJsonLd(meta) : '')
    .replace('{{preloads}}', preloads);

  const html = `<!doctype html>\n<html lang="pt-BR">\n<head>\n${head.trim()}\n</head>\n<body>\n\n${body}\n\n</body>\n</html>\n`;
  const leftover = html.match(/<!-- (include|render):[\w-]+ -->|\{\{\w+\}\}/);
  if (leftover) throw new Error(`${meta.slug}: marcador não resolvido ${leftover[0]}`);
  const out = join(OUT, `${meta.slug}.html`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, html);
  return meta.path;
}

export async function build() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  for (const item of STATIC) await cp(join(ROOT, item), join(OUT, item), { recursive: true });

  const files = (await readdir(join(ROOT, 'site/pages'), { recursive: true }))
    .map((f) => f.split('\\').join('/'))
    .filter((f) => f.endsWith('.html'))
    .sort();
  const pages = await Promise.all(files.map(readPage));
  const metas = pages.map((p) => p.meta);
  const paths = [];
  for (const page of pages) paths.push(await buildPage(page, metas));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(join(OUT, 'sitemap.xml'), sitemap);
  await writeFile(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  return paths;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const paths = await build();
  console.log(`dist/ gerado: ${paths.join(', ')}`);
}

