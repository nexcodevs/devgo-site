// Testes da função /api/lead (Pipedrive) com o fetch simulado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { validateLead, createPipedriveLead, noteFor, pipedriveHost, verifyTurnstile } from '../api/lead.mjs';

const VALID = { nome: 'Ana', email: 'ana@empresa.com', telefone: '(11) 99999-0000', empresa: 'Acme', funcionarios: '51 a 200', assunto: 'Alocar 2 devs', mensagem: 'Precisamos de dois devs sênior.', origem: 'https://devgo.digital/' };

/** fetch falso que registra as chamadas e responde por rota */
function fakeFetch(routes) {
  const calls = [];
  const http = async (url, init = {}) => {
    const { pathname } = new URL(url);
    const version = pathname.startsWith('/api/v2') ? 'v2' : 'v1';
    const path = pathname.replace(/^(\/api)?\/v[12]/, '');
    calls.push({ version, path, url, headers: init.headers ?? {}, body: init.body ? JSON.parse(init.body) : null });
    const route = routes[`${init.method ?? 'GET'} ${version} ${path}`];
    if (route instanceof Error) return { ok: false, status: 410, json: async () => ({ success: false, error: route.message }) };
    return { ok: true, status: 200, json: async () => ({ success: true, data: route ?? null }) };
  };
  return { http, calls };
}

test('valida os campos e barra o campo-isca', () => {
  assert.equal(validateLead(VALID).ok, true);
  assert.deepEqual(validateLead({ ...VALID, email: 'ana@' }), { ok: false, error: 'email' });
  assert.deepEqual(validateLead({ ...VALID, telefone: '123' }), { ok: false, error: 'telefone' });
  assert.deepEqual(validateLead({ ...VALID, website: 'http://spam' }), { ok: false, error: 'spam' });
  assert.deepEqual(validateLead({ ...VALID, elapsed: 400 }), { ok: false, error: 'spam' });
  assert.deepEqual(validateLead({ ...VALID, nome: '1' }), { ok: false, error: 'nome' });
});

test('aceita o subdomínio em qualquer formato', () => {
  assert.equal(pipedriveHost(undefined), 'https://api.pipedrive.com');
  for (const v of ['devgo', 'devgo.pipedrive.com', 'https://devgo.pipedrive.com/']) assert.equal(pipedriveHost(v), 'https://devgo.pipedrive.com');
});

test('cria organização, pessoa, lead e nota quando nada existe', async () => {
  const { http, calls } = fakeFetch({
    'GET v2 /organizations/search': { items: [] },
    'POST v2 /organizations': { id: 11 },
    'GET v2 /persons/search': { items: [] },
    'POST v2 /persons': { id: 22 },
    'POST v1 /leads': { id: 'lead-1' },
    'POST v1 /notes': { id: 33 },
  });
  const id = await createPipedriveLead(VALID, { token: 't0k', ownerId: '7', labelIds: 'a, b' }, http);
  assert.equal(id, 'lead-1');
  const lead = calls.find((c) => c.path === '/leads').body;
  assert.deepEqual(lead, { title: 'Acme · Alocar 2 devs', person_id: 22, organization_id: 11, owner_id: 7, label_ids: ['a', 'b'] });
  assert.equal(calls.find((c) => c.path === '/notes').body.lead_id, 'lead-1');
  assert.deepEqual(calls.find((c) => c.path === '/persons' && c.body).body.emails, [{ value: 'ana@empresa.com', primary: true, label: 'work' }]);
  assert.ok(calls.every((c) => c.headers['x-api-token'] === 't0k' && !c.url.includes('t0k')));
});

test('reaproveita pessoa e organização existentes', async () => {
  const { http, calls } = fakeFetch({
    'GET v2 /organizations/search': { items: [{ item: { id: 5 } }] },
    'GET v2 /persons/search': { items: [{ item: { id: 6 } }] },
    'POST v1 /leads': { id: 'lead-2' },
  });
  await createPipedriveLead(VALID, { token: 't' }, http);
  assert.equal(calls.some((c) => c.body && (c.path === '/organizations' || c.path === '/persons')), false);
  assert.deepEqual(calls.find((c) => c.path === '/leads').body.person_id, 6);
});

test('busca e nota com falha não derrubam o lead; campo extra recusado é descartado', async () => {
  const { http, calls } = fakeFetch({
    'GET v2 /organizations/search': new Error('gone'),
    'POST v2 /organizations': { id: 1 },
    'GET v2 /persons/search': new Error('gone'),
    'POST v2 /persons': { id: 2 },
    'POST v1 /notes': new Error('nope'),
  });
  let leadCalls = 0;
  const wrapped = async (url, init) => {
    if (url.includes('/leads')) { leadCalls++; const body = JSON.parse(init.body); if (body.custom_x) return { ok: false, status: 400, json: async () => ({ success: false, error: 'bad field' }) }; return { ok: true, status: 200, json: async () => ({ success: true, data: { id: 'lead-3' } }) }; }
    return http(url, init);
  };
  assert.equal(await createPipedriveLead(VALID, { token: 't', employeesField: 'custom_x' }, wrapped), 'lead-3');
  assert.equal(leadCalls, 2);
  assert.ok(calls.some((c) => c.path === '/notes'));
});

test('turnstile: confere o token no Cloudflare', async () => {
  const ok = async (url, init) => ({ json: async () => ({ success: String(init.body).includes('response=good') }) });
  assert.equal(await verifyTurnstile('s', 'good', '1.1.1.1', ok), true);
  assert.equal(await verifyTurnstile('s', 'bad', '', ok), false);
  assert.equal(await verifyTurnstile('s', '', '', ok), false);
});

test('nota escapa o texto do usuário', () => {
  assert.match(noteFor({ ...VALID, mensagem: '<script>x</script>' }), /&lt;script&gt;/);
});

test('handler: método, validação e token ausente', async () => {
  const res = () => { const r = { code: 0, body: null, headers: {} }; return Object.assign(r, { setHeader: (k, v) => { r.headers[k] = v; }, status: (c) => { r.code = c; return { json: (b) => { r.body = b; } }; } }); };
  let r = res(); await handler({ method: 'GET' }, r); assert.equal(r.code, 405);
  r = res(); await handler({ method: 'POST', body: { ...VALID, email: 'x' } }, r); assert.equal(r.code, 400);
  r = res(); await handler({ method: 'POST', body: { ...VALID, website: 'bot' } }, r); assert.equal(r.code, 200);
  r = res(); await handler({ method: 'POST', body: '{quebrado' }, r); assert.equal(r.code, 400);
  const saved = process.env.PIPEDRIVE_API_TOKEN; delete process.env.PIPEDRIVE_API_TOKEN;
  r = res(); await handler({ method: 'POST', body: VALID }, r); assert.equal(r.code, 503);
  if (saved) process.env.PIPEDRIVE_API_TOKEN = saved;
});
