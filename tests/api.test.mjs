// Testes da função /api/lead (Pipedrive) com o fetch simulado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { validateLead, createPipedriveLead, noteFor } from '../api/lead.mjs';

const VALID = { nome: 'Ana', email: 'ana@empresa.com', telefone: '(11) 99999-0000', empresa: 'Acme', funcionarios: '51 a 200', assunto: 'Alocar 2 devs', mensagem: 'Precisamos de dois devs sênior.', origem: 'https://devgo.digital/' };

/** fetch falso que registra as chamadas e responde por rota */
function fakeFetch(routes) {
  const calls = [];
  const http = async (url, init = {}) => {
    const { pathname } = new URL(url);
    calls.push({ path: pathname.replace(/^\/v1|^\/api\/v1/, ''), url, body: init.body ? JSON.parse(init.body) : null });
    const key = `${init.method ?? 'GET'} ${pathname.replace(/^\/v1|^\/api\/v1/, '')}`;
    const data = routes[key] ?? null;
    return { ok: true, status: 200, json: async () => ({ success: true, data }) };
  };
  return { http, calls };
}

test('valida os campos e barra o campo-isca', () => {
  assert.equal(validateLead(VALID).ok, true);
  assert.deepEqual(validateLead({ ...VALID, email: 'ana@' }), { ok: false, error: 'email' });
  assert.deepEqual(validateLead({ ...VALID, telefone: '123' }), { ok: false, error: 'telefone' });
  assert.deepEqual(validateLead({ ...VALID, website: 'http://spam' }), { ok: false, error: 'spam' });
});

test('cria organização, pessoa, lead e nota quando nada existe', async () => {
  const { http, calls } = fakeFetch({
    'GET /organizations/search': { items: [] },
    'POST /organizations': { id: 11 },
    'GET /persons/search': { items: [] },
    'POST /persons': { id: 22 },
    'POST /leads': { id: 'lead-1' },
    'POST /notes': { id: 33 },
  });
  const id = await createPipedriveLead(VALID, { token: 't0k', ownerId: '7', labelIds: 'a, b' }, http);
  assert.equal(id, 'lead-1');
  const lead = calls.find((c) => c.path === '/leads').body;
  assert.deepEqual(lead, { title: 'Acme · Alocar 2 devs', person_id: 22, organization_id: 11, owner_id: 7, label_ids: ['a', 'b'] });
  assert.equal(calls.find((c) => c.path === '/notes').body.lead_id, 'lead-1');
  assert.ok(calls.every((c) => c.url.includes('api_token=t0k')));
});

test('reaproveita pessoa e organização existentes', async () => {
  const { http, calls } = fakeFetch({
    'GET /organizations/search': { items: [{ item: { id: 5 } }] },
    'GET /persons/search': { items: [{ item: { id: 6 } }] },
    'POST /leads': { id: 'lead-2' },
  });
  await createPipedriveLead(VALID, { token: 't' }, http);
  assert.equal(calls.some((c) => c.path === '/organizations' || c.path === '/persons'), false);
  assert.deepEqual(calls.find((c) => c.path === '/leads').body.person_id, 6);
});

test('nota escapa o texto do usuário', () => {
  assert.match(noteFor({ ...VALID, mensagem: '<script>x</script>' }), /&lt;script&gt;/);
});

test('handler: método, validação e token ausente', async () => {
  const res = () => { const r = { code: 0, body: null, headers: {} }; return Object.assign(r, { setHeader: (k, v) => { r.headers[k] = v; }, status: (c) => { r.code = c; return { json: (b) => { r.body = b; } }; } }); };
  let r = res(); await handler({ method: 'GET' }, r); assert.equal(r.code, 405);
  r = res(); await handler({ method: 'POST', body: { ...VALID, email: 'x' } }, r); assert.equal(r.code, 400);
  r = res(); await handler({ method: 'POST', body: { ...VALID, website: 'bot' } }, r); assert.equal(r.code, 200);
  const saved = process.env.PIPEDRIVE_API_TOKEN; delete process.env.PIPEDRIVE_API_TOKEN;
  r = res(); await handler({ method: 'POST', body: VALID }, r); assert.equal(r.code, 503);
  if (saved) process.env.PIPEDRIVE_API_TOKEN = saved;
});
