// Recebe o formulário de contato do site e cria o lead no Pipedrive.
// Roda como função serverless da Vercel (POST /api/lead).
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   PIPEDRIVE_API_TOKEN    obrigatório: token de API de um usuário do Pipedrive
//   PIPEDRIVE_DOMAIN       opcional: subdomínio da conta (ex.: "devgo" para devgo.pipedrive.com)
//   PIPEDRIVE_OWNER_ID     opcional: id do usuário dono dos leads
//   PIPEDRIVE_LABEL_IDS    opcional: ids de etiquetas de lead, separados por vírgula
//   PIPEDRIVE_FIELD_EMPLOYEES  opcional: chave do campo personalizado "nº de funcionários" do lead
//
// Fluxo: reaproveita pessoa (pelo e-mail) e organização (pelo nome) se já existirem,
// cria o lead ligado às duas e anexa uma nota com a mensagem e a origem.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  if (!data.nome) return { ok: false, error: 'nome' };
  if (!EMAIL_PATTERN.test(data.email)) return { ok: false, error: 'email' };
  if (data.telefone.replace(/\D/g, '').length < 10) return { ok: false, error: 'telefone' };
  for (const key of ['empresa', 'funcionarios', 'assunto']) if (!data[key]) return { ok: false, error: key };
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
 * Cria pessoa, organização, lead e nota no Pipedrive.
 * @param {Record<string, string>} d dados já validados
 * @param {{ token: string, domain?: string, ownerId?: string, labelIds?: string, employeesField?: string }} config
 * @param {typeof fetch} [http]
 */
export async function createPipedriveLead(d, config, http = fetch) {
  const base = config.domain ? `https://${config.domain}.pipedrive.com/api/v1` : 'https://api.pipedrive.com/v1';
  /** @param {string} path @param {object} [body] */
  const call = async (path, body) => {
    const url = `${base}${path}${path.includes('?') ? '&' : '?'}api_token=${encodeURIComponent(config.token)}`;
    const response = await http(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.success === false) throw new Error(`Pipedrive ${path.split('?')[0]}: ${response.status} ${json.error ?? ''}`.trim());
    return json.data;
  };
  const owner = config.ownerId ? { owner_id: Number(config.ownerId) } : {};

  const foundOrg = await call(`/organizations/search?term=${encodeURIComponent(d.empresa)}&exact_match=true&limit=1`);
  const orgId = foundOrg?.items?.[0]?.item?.id ?? (await call('/organizations', { name: d.empresa, ...owner })).id;

  const foundPerson = await call(`/persons/search?term=${encodeURIComponent(d.email)}&fields=email&exact_match=true&limit=1`);
  const personId = foundPerson?.items?.[0]?.item?.id
    ?? (await call('/persons', { name: d.nome, email: [{ value: d.email, primary: true }], phone: [{ value: d.telefone, primary: true }], org_id: orgId, ...owner })).id;

  const labels = (config.labelIds ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const lead = await call('/leads', {
    title: `${d.empresa} · ${d.assunto}`.slice(0, 250),
    person_id: personId,
    organization_id: orgId,
    ...owner,
    ...(labels.length ? { label_ids: labels } : {}),
    ...(config.employeesField ? { [config.employeesField]: d.funcionarios } : {}),
  });
  await call('/notes', { content: noteFor(d), lead_id: lead.id });
  return lead.id;
}

/**
 * Handler da Vercel.
 * @param {{ method?: string, body?: unknown }} req
 * @param {{ status: (code: number) => { json: (body: object) => void }, setHeader: (k: string, v: string) => void }} res
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
  const result = validateLead(/** @type {Record<string, unknown>} */ (body));
  if (!result.ok) {
    // o campo-isca responde como sucesso para não ensinar o robô
    return result.error === 'spam' ? res.status(200).json({ ok: true }) : res.status(400).json({ ok: false, error: result.error });
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
    return res.status(502).json({ ok: false, error: 'crm' });
  }
}
