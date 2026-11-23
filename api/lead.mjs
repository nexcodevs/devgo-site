// Recebe o formulário de contato do site e cria um negócio no funil do Pipedrive.
// Roda como função serverless da Vercel (POST /api/lead).
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   PIPEDRIVE_API_TOKEN    obrigatório: token de API de um usuário do Pipedrive
//   PIPEDRIVE_DOMAIN       opcional: subdomínio da conta (ex.: "devgo" para devgo.pipedrive.com)
//   PIPEDRIVE_OWNER_ID     opcional: id do usuário dono dos negócios
//   PIPEDRIVE_PIPELINE_ID  opcional: funil do negócio (padrão: 1, funil Devgo)
//   PIPEDRIVE_STAGE_ID     opcional: etapa do negócio (padrão: 7, etapa "Lead" do funil Devgo)
//   PIPEDRIVE_LABEL_IDS    opcional: ids numéricos de etiquetas de negócio, separados por vírgula
//   PIPEDRIVE_FIELD_EMPLOYEES  opcional: chave do campo personalizado "nº de funcionários" do negócio
//   TURNSTILE_SECRET_KEY   opcional: chave secreta do Cloudflare Turnstile (com ela, o captcha passa a ser exigido)
//
// Pessoas, organizações e negócios usam a API v2 do Pipedrive; notas continuam na v1.
//
// Fluxo: reaproveita pessoa (pelo e-mail) e organização (pelo nome) se já existirem,
// cria o negócio no funil ligado às duas e anexa uma nota com a mensagem e a origem.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CALL_TIMEOUT_MS = 6000; // cada chamada ao Pipedrive; a função inteira tem folga dentro do limite da Vercel
const MIN_FILL_MS = 1500; // robôs enviam o formulário instantaneamente
const DEFAULT_PIPELINE_ID = 1; // funil "Devgo"
const DEFAULT_STAGE_ID = 7; // etapa "Lead", a primeira do funil Devgo
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
  // rápido demais para uma pessoa. Sem o tempo (página antiga em cache), segue: o campo-isca ainda filtra robôs
  if (Number.isFinite(elapsed) && elapsed < MIN_FILL_MS) return { ok: false, error: 'spam' };
  if (data.nome.length < 2 || !/\p{L}/u.test(data.nome)) return { ok: false, error: 'nome' };
  if (!EMAIL_PATTERN.test(data.email)) return { ok: false, error: 'email' };
  if (data.telefone.replace(/\D/g, '').length < 10) return { ok: false, error: 'telefone' };
  if (data.telefone.replace(/\D/g, '').length > 15) return { ok: false, error: 'telefone' };
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
 * Cria (ou reaproveita) organização e pessoa e cria o negócio com uma nota.
 * @param {Record<string, string>} d dados já validados
 * @param {{ token: string, domain?: string, ownerId?: string, pipelineId?: string, stageId?: string, labelIds?: string, employeesField?: string }} config
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
    const signal = AbortSignal.timeout(CALL_TIMEOUT_MS);
    const response = await http(url, body ? { method: 'POST', headers, body: JSON.stringify(body), signal } : { headers, signal });
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

  const labels = (config.labelIds ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
  const deal = {
    title: `${d.empresa} · ${d.assunto}`.slice(0, 250),
    person_id: personId,
    org_id: orgId,
    pipeline_id: Number(config.pipelineId) || DEFAULT_PIPELINE_ID,
    stage_id: Number(config.stageId) || DEFAULT_STAGE_ID,
    ...owner,
  };
  const extras = {
    ...(labels.length ? { label_ids: labels } : {}),
    ...(config.employeesField ? { custom_fields: { [config.employeesField]: d.funcionarios } } : {}),
  };
  let created;
  try {
    created = await call('v2', '/deals', { ...deal, ...extras });
  } catch (error) {
    // etiqueta ou campo personalizado mal configurado não pode derrubar o negócio: tenta sem eles
    if (!Object.keys(extras).length) throw error;
    console.warn('[lead] etiquetas ou campo de funcionários recusados, criando sem eles', String(error));
    created = await call('v2', '/deals', deal);
  }
  try {
    await call('v1', '/notes', { content: noteFor(d), deal_id: created.id });
  } catch (error) {
    console.warn('[lead] nota não anexada', String(error)); // o negócio já existe; a nota é complemento
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
  // o captcha só é exigido com as duas chaves: a pública (no build) e a secreta (aqui)
  const captchaSecret = process.env.TURNSTILE_SECRET_KEY;
  if (captchaSecret && process.env.TURNSTILE_SITE_KEY) {
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
      pipelineId: process.env.PIPEDRIVE_PIPELINE_ID,
      stageId: process.env.PIPEDRIVE_STAGE_ID,
      labelIds: process.env.PIPEDRIVE_LABEL_IDS,
      employeesField: process.env.PIPEDRIVE_FIELD_EMPLOYEES,
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[lead] falha ao criar o negócio', error);
    return res.status(502).json({ ok: false, error: 'crm' }); // detalhes (etapa e status) ficam só no log
  }
}
