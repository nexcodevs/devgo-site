// @ts-check
/**
 * Tag do Google (conta Devgo, AW-17010261251).
 *
 * A tag global carrega em todas as páginas. A conversão de lead e o evento
 * GA4 `generate_lead` só devem ser chamados depois de POST /api/lead com
 * `response.ok && result.ok` — uma vez por envio.
 *
 * Tudo que depende de um ID ainda não confirmado fica em GOOGLE_TAGS.
 * Placeholder (vazio, SUBSTITUIR, PLACEHOLDER ou sequência de X) não dispara
 * conversão nem `generate_lead` e não configura o GA4. A tag AW segue
 * carregando. A medição não quebra o formulário.
 */

/** @typedef {{ adsId: string, adsSendTo: string, ga4MeasurementId: string }} GoogleTags */

/**
 * Única configuração da medição Google.
 *
 * - `adsSendTo`: conversão "Devgo | Lead | Formulário #contato" (ação 7917999579).
 * - `ga4MeasurementId`: placeholder `G-XXXXXXXX` até confirmar o Measurement ID
 *   vigente. A ficha cita G-9PW4DF4SWW, ainda sem confirmação — não trocar
 *   só com base nela. Enquanto for placeholder, o GA4 não é configurado e
 *   `generate_lead` não é enviado.
 *
 * @type {GoogleTags}
 */
export const GOOGLE_TAGS = {
  adsId: 'AW-17010261251',
  adsSendTo: 'AW-17010261251/9K0qCNurzL8dEIP6j68_',
  ga4MeasurementId: 'G-XXXXXXXX',
};

const PLACEHOLDER = /SUBSTITUIR|PLACEHOLDER|X{4,}/i;
const SCRIPT_BASE = 'https://www.googletagmanager.com/gtag/js';

/** @param {string} value */
function isGoogleAdsId(value) {
  return /^AW-\d+$/.test(value);
}

/** @param {string} value */
function isAdsConversionSendTo(value) {
  return /^AW-\d+\/[A-Za-z0-9_-]+$/.test(value) && !PLACEHOLDER.test(value);
}

/** @param {string} value */
function isGa4MeasurementId(value) {
  return /^G-[A-Z0-9]+$/.test(value) && !PLACEHOLDER.test(value);
}

/**
 * O que esta configuração realmente dispara. IDs vazios ou placeholder ficam de fora.
 * @param {GoogleTags} [config]
 */
export function measurementPlan(config = GOOGLE_TAGS) {
  const configAds = isGoogleAdsId(config.adsId);
  const generateLead = isGa4MeasurementId(config.ga4MeasurementId);
  return {
    loadScript: configAds || generateLead,
    configAds,
    conversion: isAdsConversionSendTo(config.adsSendTo),
    generateLead,
    scriptId: configAds ? config.adsId : config.ga4MeasurementId,
  };
}

/** @param {any} w */
function ensureGtag(w) {
  w.dataLayer = w.dataLayer || [];
  w.gtag = w.gtag || function gtag() { w.dataLayer.push(arguments); };
  return w.gtag;
}

/** Carrega a tag global. Sem efeito quando não há ID utilizável. */
export function initGtag() {
  try {
    const plan = measurementPlan();
    if (!plan.loadScript) return;
    const w = /** @type {any} */ (window);
    const gtag = ensureGtag(w);
    if (w.__devgoGtag) return;
    w.__devgoGtag = true;
    gtag('js', new Date());
    // A conversão de lead não depende de remarketing. Sem este sinal o Google
    // pode usar a visita para personalizar anúncios, o que a política do site não faz.
    if (plan.configAds) gtag('config', GOOGLE_TAGS.adsId, { allow_ad_personalization_signals: false });
    if (plan.generateLead) gtag('config', GOOGLE_TAGS.ga4MeasurementId);
    if (document.querySelector('script[data-devgo-gtag]')) return;
    const script = document.createElement('script');
    script.async = true;
    script.dataset.devgoGtag = 'true';
    script.src = `${SCRIPT_BASE}?id=${encodeURIComponent(plan.scriptId)}`;
    document.head.append(script);
  } catch { /* medição nunca derruba a página */ }
}

/**
 * Conversão do formulário. Só chamar no sucesso confirmado pelo servidor.
 * Cada ID em placeholder é ignorado. Não lança erro.
 */
export function reportLeadConversion() {
  try {
    const plan = measurementPlan();
    if (!plan.conversion && !plan.generateLead) return;
    const gtag = ensureGtag(/** @type {any} */ (window));
    if (plan.generateLead) {
      gtag('event', 'generate_lead', { currency: 'BRL', lead_source: 'site_contato' });
    }
    if (plan.conversion) gtag('event', 'conversion', { send_to: GOOGLE_TAGS.adsSendTo });
  } catch { /* medição nunca derruba o formulário */ }
}
