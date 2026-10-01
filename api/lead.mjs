// Recebe o formulário de contato do site e cria o lead no Pipedrive.
// Roda como função serverless da Vercel (POST /api/lead).
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   PIPEDRIVE_API_TOKEN    obrigatório: token de API de um usuário do Pipedrive
//   PIPEDRIVE_DOMAIN       opcional: subdomínio da conta (ex.: "devgo" para devgo.pipedrive.com)
//   PIPEDRIVE_OWNER_ID     opcional: id do usuário dono dos leads
//   PIPEDRIVE_LABEL_IDS    opcional: ids de etiquetas de lead, separados por vírgula
//   PIPEDRIVE_FIELD_EMPLOYEES  opcional: chave do campo personalizado "nº de funcionários" do lead
//   TURNSTILE_SECRET_KEY   opcional: chave secreta do Cloudflare Turnstile (com ela, o captcha passa a ser exigido)
//
// Pessoas e organizações usam a API v2 do Pipedrive (as rotas v1 foram descontinuadas);
// leads e notas continuam na v1, que é onde existem.
//
// Fluxo: reaproveita pessoa (pelo e-mail) e organização (pelo nome) se já existirem,
// cria o lead ligado às duas e anexa uma nota com a mensagem e a origem.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_FILL_MS = 2500; // robôs enviam o formulário instantaneamente
const LIMITS = { nome: 120, email: 160, telefone: 40, empresa: 160, funcionarios: 40, assunto: 200, mensagem: 4000, origem: 500 };

/**
 * Valida e normaliza os dados do formulário.
 * @param {Record<string, unknown>} body
 * @returns {{ ok: true, data: Record<string, string> } | { ok: false, error: string }}
 */
export function validateLead(body) {
  /** @type {Record<string, string>} */
  const data = {};
  for (const [key, max] of Object.entries(LIMITS)) data[key] = String(body?.[key] ?? '').trim().slice(0, max);
  if (String(body?.website ?? '').trim()) return { ok: false, error: 'spam' }; // campo-isca, invisível para pessoas
  const elapsed = Number(body?.elapsed);
  if (Number.isFinite(elapsed) && elapsed < MIN_FILL_MS) return { ok: false, error: 'spam' }; // preenchido rápido demais
  if (data.nome.length < 2 || !/\p{L}/u.test(data.nome)) return { ok: false, error: 'nome' };
  if (!EMAIL_PATTERN.test(data.email)) return { ok: false, error: 'email' };
  if (data.telefone.replace(/\D/g, '').length < 10) return { ok: false, error: 'telefone' };
  if (data.telefone.replace(/\D/g, '').length > 13) return { ok: false, error: 'telefone' };
  for (const key of ['empresa', 'funcionarios', 'assunto']) if (data[key].length < 2) return { ok: false, error: key };
  if (data.mensagem.length < 10) return { ok: false, error: 'mensagem' };
  return { ok: true, data };
}

/** @param {string} text */
const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** Conteúdo da nota anexada ao lead. @param {Record<string, string>} d */
export function noteFor(d) {
  const rows = [['Assunto', d.assunto], ['Empresa', d.empresa], ['Nº de funcionários', d.funcionarios], ['Telefone', d.telefone], ['E-mail', d.email], ['Origem', d.origem || 'site devgo']];
  return `<p><b>Mensagem do site</b></p><p>${escapeHtml(d.mensagem).replace(/\n/g, '<br>')}</p><p>${rows.map(([k, v]) => `<b>${k}:</b> ${escapeHtml(v)}`).join('<br>')}</p>`;
}

/**
 * Normaliza o subdomínio: aceita "devgo", "devgo.pipedrive.com" ou a URL completa.
 * @param {string | undefined} domain
 */
export function pipedriveHost(domain) {
  const sub = (domain ?? '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.pipedrive\.com$/, '');
  return sub ? `https://${sub}.pipedrive.com` : 'https://api.pipedrive.com';
}

/** Erro do Pipedrive com a etapa que falhou, para o log e o diagnóstico. */
export class PipedriveError extends Error {
  /** @param {string} stage @param {number} status @param {string} detail */
  constructor(stage, status, detail) {
    super(`Pipedrive ${stage}: ${status} ${detail}`.trim());
    this.stage = stage;
    this.status = status;
  }
}

/**
 * Cria (ou reaproveita) organização e pessoa e cria o lead com uma nota.
 * @param {Record<string, string>} d dados já validados
 * @param {{ token: string, domain?: string, ownerId?: string, labelIds?: string, employeesField?: string }} config
 * @param {typeof fetch} [http]
 */
export async function createPipedriveLead(d, config, http = fetch) {
  const host = pipedriveHost(config.domain);
  /** @param {'v1' | 'v2'} version @param {string} path @param {object} [body] */
  const call = async (version, path, body) => {
    // api.pipedrive.com publica a v1 em /v1; o subdomínio da conta, em /api/v1. A v2 é /api/v2 nos dois.
    const prefix = version === 'v2' ? '/api/v2' : host === 'https://api.pipedrive.com' ? '/v1' : '/api/v1';
    const url = `${host}${prefix}${path}`;
    const headers = { 'x-api-token': config.token, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) };
    const response = await http(url, body ? { method: 'POST', headers, body: JSON.stringify(body) } : { headers });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.success === false) throw new PipedriveError(`${version}${path.split('?')[0]}`, response.status, String(json.error ?? json.error_info ?? ''));
    return json.data;
  };
  /** Busca é otimização: se falhar, segue criando o registro. @param {string} path */
  const find = async (path) => {
    try { return (await call('v2', path))?.items?.[0]?.item?.id ?? null; } catch (error) { console.warn('[lead] busca ignorada', String(error)); return null; }
  };
  const owner = config.ownerId ? { owner_id: Number(config.ownerId) } : {};

  const orgId = (d.empresa.length >= 2 ? await find(`/organizations/search?term=${encodeURIComponent(d.empresa)}&exact_match=true&limit=1`) : null)
    ?? (await call('v2', '/organizations', { name: d.empresa, ...owner })).id;

  const personId = await find(`/persons/search?term=${encodeURIComponent(d.email)}&fields=email&exact_match=true&limit=1`)
    ?? (await call('v2', '/persons', {
      name: d.nome,
      emails: [{ value: d.email, primary: true, label: 'work' }],
      phones: [{ value: d.telefone, primary: true, label: 'work' }],
      org_id: orgId,
      ...owner,
    })).id;

  const labels = (config.labelIds ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const lead = {
    title: `${d.empresa} · ${d.assunto}`.slice(0, 250),
    person_id: personId,
    organization_id: orgId,
    ...owner,
    ...(labels.length ? { label_ids: labels } : {}),
  };
  let created;
  try {
    created = await call('v1', '/leads', config.employeesField ? { ...lead, [config.employeesField]: d.funcionarios } : lead);
  } catch (error) {
    // campo personalizado mal configurado não pode derrubar o lead: tenta sem ele
    if (!config.employeesField) throw error;
    console.warn('[lead] campo de funcionários recusado, criando sem ele', String(error));
    created = await call('v1', '/leads', lead);
  }
  try {
    await call('v1', '/notes', { content: noteFor(d), lead_id: created.id });
  } catch (error) {
    console.warn('[lead] nota não anexada', String(error)); // o lead já existe; a nota é complemento
  }
  return created.id;
}

/**
 * Confere o token do Cloudflare Turnstile.
 * @param {string} secret @param {string} token @param {string} [ip] @param {typeof fetch} [http]
 */
export async function verifyTurnstile(secret, token, ip, http = fetch) {
  if (!token) return false;
  const form = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) });
  const response = await http('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const json = await response.json().catch(() => ({}));
  return json.success === true;
}

/**
 * Handler da Vercel.
 * @param {{ method?: string, body?: unknown, headers?: Record<string, string | string[] | undefined> }} req
 * @param {{ status: (code: number) => { json: (body: object) => void }, setHeader: (k: string, v: string) => void }} res
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
  } catch {
    return res.status(400).json({ ok: false, error: 'json' });
  }
  const result = validateLead(/** @type {Record<string, unknown>} */ (body));
  if (!result.ok) {
    // o campo-isca responde como sucesso para não ensinar o robô
    return result.error === 'spam' ? res.status(200).json({ ok: true }) : res.status(400).json({ ok: false, error: result.error });
  }
  const captchaSecret = process.env.TURNSTILE_SECRET_KEY;
  if (captchaSecret) {
    const forwarded = req.headers?.['x-forwarded-for'];
    const ip = String(Array.isArray(forwarded) ? forwarded[0] : forwarded ?? '').split(',')[0].trim();
    const human = await verifyTurnstile(captchaSecret, String(/** @type {Record<string, unknown>} */ (body).turnstile ?? ''), ip).catch(() => false);
    if (!human) return res.status(400).json({ ok: false, error: 'captcha' });
  }
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) {
    console.error('[lead] PIPEDRIVE_API_TOKEN não configurado');
    return res.status(503).json({ ok: false, error: 'config' });
  }
  try {
    await createPipedriveLead(result.data, {
      token,
      domain: process.env.PIPEDRIVE_DOMAIN,
      ownerId: process.env.PIPEDRIVE_OWNER_ID,
      labelIds: process.env.PIPEDRIVE_LABEL_IDS,
      employeesField: process.env.PIPEDRIVE_FIELD_EMPLOYEES,
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[lead] falha ao criar lead', error);
    const stage = error instanceof PipedriveError ? `${error.stage} ${error.status}` : 'rede';
    return res.status(502).json({ ok: false, error: 'crm', stage });
  }
}
