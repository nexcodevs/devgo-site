// Gera uma cópia de revisão do site para publicar como Artifact no Claude:
// mesmos arquivos do dist/, com links relativos (o Artifact não tem cleanUrls
// nem raiz própria) e a home sem o esqueleto <html>/<head>/<body>, que o
// Artifact acrescenta ao publicar.
//   node build/export-artifact.mjs <pasta-de-saída>
import { cp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { build } from './build.mjs';

const REVIEW_TITLE = 'Site Devgo';

/** Converte um caminho absoluto do site no caminho relativo equivalente, a partir da página. */
function relative(href, pageDir) {
  const [pathname, hash] = href.split('#');
  let target = pathname === '/' || pathname === '' ? '/index.html' : pathname;
  if (!posix.extname(target)) target = `${target}.html`;
  const rel = posix.relative(pageDir, target.slice(1)) || 'index.html';
  return hash === undefined ? rel : `${rel}#${hash}`;
}

/** Reescreve href/src absolutos ("/x") de uma página; mantém links externos e âncoras locais. */
function relativize(html, pagePath) {
  const pageDir = posix.dirname(pagePath);
  return html.replace(/\b(href|src)="(\/(?!\/)[^"]*)"/g, (_, attr, url) => {
    // na própria home, links para a home viram âncoras locais (sem recarregar o Artifact)
    if (pagePath === 'index.html' && (url === '/' || url.startsWith('/#'))) return `${attr}="${url === '/' ? '#top' : url.slice(1)}"`;
    return `${attr}="${relative(url, pageDir)}"`;
  });
}

/** A home vira o conteúdo que o Artifact envolve: <title>, elementos do head e corpo. */
function unwrap(html) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<title>[^<]*<\/title>/, `<title>${REVIEW_TITLE}</title>`)
    .replace(/<meta charset="utf-8">\n?/, '')
    .replace(/<meta name="viewport"[^>]*>\n?/, '');
  const title = head.match(/<title>[^<]*<\/title>/)[0];
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  return `${title}\n${head.replace(title, '').trim()}\n${body.trim()}\n`;
}

async function listHtml(dir, base = '') {
  const out = [];
  for (const entry of await readdir(join(dir, base), { withFileTypes: true })) {
    const rel = posix.join(base, entry.name);
    if (entry.isDirectory()) out.push(...(await listHtml(dir, rel)));
    else if (entry.name.endsWith('.html')) out.push(rel);
  }
  return out;
}

const outDir = process.argv[2];
if (!outDir) throw new Error('Informe a pasta de saída: node build/export-artifact.mjs <pasta>');

await build();
await rm(outDir, { recursive: true, force: true });
await cp(new URL('../dist', import.meta.url).pathname, outDir, { recursive: true });
for (const page of await listHtml(outDir)) {
  const file = join(outDir, page);
  let html = relativize(await readFile(file, 'utf8'), page);
  if (page === 'index.html') html = unwrap(html);
  await writeFile(file, html);
}
console.log(`cópia de revisão em ${outDir}`);
