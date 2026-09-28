// Servidor estático mínimo para os testes (sem dependências).
// Aplica os mesmos cabeçalhos do vercel.json (inclusive a CSP), para que uma
// violação de política quebre os testes aqui antes de quebrar em produção.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Sobe o servidor numa porta livre e devolve a URL base e uma função para fechar.
 * @param {string} root diretório servido
 */
export async function serve(root) {
  const base = resolve(root);
  const config = JSON.parse(await readFile(join(base, 'vercel.json'), 'utf8'));
  /** @type {Array<{ pattern: RegExp, headers: Array<{ key: string, value: string }> }>} */
  const rules = config.headers.map((rule) => ({ pattern: new RegExp(`^${rule.source}$`), headers: rule.headers }));
  /** @param {string} path */
  const headersFor = (path) => Object.fromEntries(rules.filter((r) => r.pattern.test(path)).flatMap((r) => r.headers.map((h) => [h.key, h.value])));
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    const file = normalize(join(base, path === '/' ? 'index.html' : path));
    if (!file.startsWith(base)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { ...headersFor(path), 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
  return { url: `http://127.0.0.1:${port}/`, close: () => new Promise((done) => server.close(done)) };
}
