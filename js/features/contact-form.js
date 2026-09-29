// @ts-check
/**
 * Formulário de contato: validação no cliente e atalhos que outras seções
 * usam para preencher o assunto.
 *
 * Com os dados válidos, envia para /api/lead (função da Vercel que cria o lead
 * no Pipedrive). Só mostra sucesso quando o servidor confirma; em caso de falha,
 * mantém os dados na tela e aponta um canal alternativo.
 */
import { byId, html, render, reducedMotion } from '../core/dom.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PHONE_DIGITS = 10;
const MIN_MESSAGE_LENGTH = 10;
const FOCUS_DELAY_MS = 600; // espera a rolagem suave terminar
const FALLBACK_CHANNEL = 'https://www.linkedin.com/company/devgodigital/';
const ENDPOINT = '/api/lead';
const FIELDS = { nome: 'ct-nome', email: 'ct-email', telefone: 'ct-tel', empresa: 'ct-emp', funcionarios: 'ct-func', assunto: 'ct-assunto', mensagem: 'ct-msg' };

/**
 * Regras na ordem em que aparecem na tela; a primeira que falhar é mostrada.
 * @type {Array<{ id: string, message: string, isValid: (value: string) => boolean }>}
 */
const RULES = [
  { id: 'ct-nome', message: 'Informe seu nome.', isValid: (v) => v.length > 0 },
  { id: 'ct-email', message: 'Informe um e-mail válido, como voce@empresa.com.', isValid: (v) => EMAIL_PATTERN.test(v) },
  { id: 'ct-tel', message: 'Informe um telefone com DDD.', isValid: (v) => v.replace(/\D/g, '').length >= MIN_PHONE_DIGITS },
  { id: 'ct-emp', message: 'Informe a empresa.', isValid: (v) => v.length > 0 },
  { id: 'ct-func', message: 'Selecione o número de funcionários.', isValid: (v) => v.length > 0 },
  { id: 'ct-assunto', message: 'Informe o assunto.', isValid: (v) => v.length > 0 },
  { id: 'ct-msg', message: `Escreva uma mensagem com pelo menos ${MIN_MESSAGE_LENGTH} caracteres.`, isValid: (v) => v.length >= MIN_MESSAGE_LENGTH },
];

/** @param {string} id */
const field = (id) => /** @type {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} */ (byId(id));

/**
 * Preenche o assunto do formulário (usado por squad, stacks e seletor de quantidade).
 * @param {string} subject
 */
export function prefillSubject(subject) {
  if (subject) field('ct-assunto').value = subject;
}

/**
 * Preenche o assunto, rola até o contato e foca o primeiro campo.
 * @param {string} subject
 */
export function requestProfessional(subject) {
  prefillSubject(subject);
  byId('contato').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  window.setTimeout(() => field('ct-nome').focus({ preventScroll: true }), reducedMotion ? 0 : FOCUS_DELAY_MS);
}

export function initContactForm() {
  const form = byId('contact-form', HTMLFormElement);
  const status = byId('form-status');

  /** @param {'is-success' | 'is-error'} kind @param {import('../core/dom.js').SafeHtml} content */
  const showStatus = (kind, content) => {
    status.className = `form-status ${kind}`;
    render(status, content);
  };

  const submit = /** @type {HTMLButtonElement} */ (form.querySelector('button[type="submit"]'));
  let sending = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    for (const rule of RULES) {
      field(rule.id).removeAttribute('aria-invalid');
      field(rule.id).removeAttribute('aria-describedby');
    }

    const failed = RULES.find((rule) => !rule.isValid(field(rule.id).value.trim()));
    if (failed) {
      const input = field(failed.id);
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', 'form-status');
      showStatus('is-error', html`${failed.message}`);
      input.focus();
      return;
    }

    /** @type {Record<string, string>} */
    const payload = { origem: window.location.href, website: /** @type {HTMLInputElement} */ (form.elements.namedItem('website'))?.value ?? '' };
    for (const [key, id] of Object.entries(FIELDS)) payload[key] = field(id).value.trim();

    sending = true;
    submit.disabled = true;
    status.className = 'form-status';
    render(status, html`Enviando…`);
    try {
      const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(`HTTP ${response.status}`);
      form.reset();
      showStatus('is-success', html`Mensagem enviada. Um especialista da Devgo responde em breve.`);
    } catch {
      showStatus('is-error', html`Não conseguimos enviar agora. Tente de novo em instantes ou fale com a gente pelo <a href="${FALLBACK_CHANNEL}" target="_blank" rel="noopener noreferrer">LinkedIn</a>.`);
    } finally {
      sending = false;
      submit.disabled = false;
    }
  });

  // ao corrigir um campo marcado como inválido, o destaque sai
  form.addEventListener('input', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    if (target.getAttribute('aria-invalid') !== 'true') return;
    target.removeAttribute('aria-invalid');
    target.removeAttribute('aria-describedby');
  });
}
