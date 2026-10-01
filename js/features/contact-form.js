// @ts-check
/**
 * Formulário de contato: validação por campo (ao sair do campo e no envio),
 * máscara de telefone, captcha opcional (Cloudflare Turnstile) e atalhos que
 * outras seções usam para preencher o assunto.
 *
 * Com os dados válidos, envia para /api/lead (função da Vercel que cria o lead
 * no Pipedrive). Só mostra sucesso quando o servidor confirma; em caso de falha,
 * mantém os dados na tela e aponta um canal alternativo.
 */
import { byId, html, render, reducedMotion } from '../core/dom.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
const NAME_PATTERN = /^[\p{L}][\p{L}\p{M}' .-]*$/u;
const MIN_MESSAGE_LENGTH = 10;
const FOCUS_DELAY_MS = 600; // espera a rolagem suave terminar
const FALLBACK_CHANNEL = 'https://www.linkedin.com/company/devgodigital/';
const ENDPOINT = '/api/lead';
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const FIELDS = { nome: 'ct-nome', email: 'ct-email', telefone: 'ct-tel', empresa: 'ct-emp', funcionarios: 'ct-func', assunto: 'ct-assunto', mensagem: 'ct-msg' };

/** Só dígitos. @param {string} value */
const digits = (value) => value.replace(/\D/g, '');

/**
 * Formata telefone brasileiro enquanto a pessoa digita: (11) 98765-4321.
 * Números internacionais (começando com +) ficam como foram digitados.
 * @param {string} value
 */
export function formatPhone(value) {
  if (value.trim().startsWith('+')) return value.replace(/[^\d+ ()-]/g, '');
  const d = digits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Regras por campo, na ordem da tela. Cada uma devolve a mensagem de erro ou ''.
 * @type {Record<string, (value: string) => string>}
 */
export const RULES = {
  'ct-nome': (v) => (!v ? 'Informe seu nome.' : v.length < 2 || !NAME_PATTERN.test(v) ? 'Use apenas letras no nome.' : ''),
  'ct-email': (v) => (!v ? 'Informe seu e-mail.' : EMAIL_PATTERN.test(v) ? '' : 'Informe um e-mail válido, como voce@empresa.com.'),
  'ct-tel': (v) => {
    const n = digits(v).length;
    if (!n) return 'Informe um telefone.';
    if (v.trim().startsWith('+')) return n >= 10 && n <= 15 ? '' : 'Informe o telefone com código do país e DDD.';
    return n === 10 || n === 11 ? '' : 'Informe o telefone com DDD, como (11) 90000-0000.';
  },
  'ct-emp': (v) => (v.length >= 2 ? '' : 'Informe o nome da empresa.'),
  'ct-func': (v) => (v ? '' : 'Selecione o número de funcionários.'),
  'ct-assunto': (v) => (v.length >= 3 ? '' : 'Informe o assunto, como "alocar 2 devs back-end".'),
  'ct-msg': (v) => (v.length >= MIN_MESSAGE_LENGTH ? '' : `Conte um pouco mais: pelo menos ${MIN_MESSAGE_LENGTH} caracteres.`),
};

/** Campo do servidor → id do campo na tela. */
const SERVER_FIELD = /** @type {Record<string, string>} */ (Object.fromEntries(Object.entries(FIELDS)));

/** @param {string} id */
const field = (id) => /** @type {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} */ (byId(id));

/**
 * Preenche o assunto do formulário (usado por squad, stacks e seletor de quantidade).
 * @param {string} subject
 */
export function prefillSubject(subject) {
  if (!subject) return;
  field('ct-assunto').value = subject;
  setError('ct-assunto', '');
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

/** Mostra (ou limpa) o erro de um campo. @param {string} id @param {string} message */
function setError(id, message) {
  const input = field(id);
  const box = document.getElementById(`${id}-err`);
  if (box) box.textContent = message;
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', `${id}-err`);
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

/** Valida um campo e mostra o resultado. @param {string} id */
function check(id) {
  const message = RULES[id](field(id).value.trim());
  setError(id, message);
  return !message;
}

/**
 * Carrega o Turnstile só quando há chave configurada no build.
 * @param {HTMLElement} box
 * @returns {() => string} leitor do token atual
 */
function initCaptcha(box) {
  const sitekey = box.dataset.sitekey;
  if (!sitekey) { box.hidden = true; return () => ''; }
  let token = '';
  const script = document.createElement('script');
  script.src = TURNSTILE_SRC;
  script.async = true;
  script.addEventListener('load', () => {
    /** @type {any} */ (window).turnstile?.render(box, {
      sitekey,
      language: 'pt-br',
      theme: 'dark',
      callback: (/** @type {string} */ t) => { token = t; },
      'expired-callback': () => { token = ''; },
      'error-callback': () => { token = ''; },
    });
  });
  document.head.append(script);
  return () => token;
}

export function initContactForm() {
  const form = byId('contact-form', HTMLFormElement);
  const status = byId('form-status');
  const submit = /** @type {HTMLButtonElement} */ (form.querySelector('button[type="submit"]'));
  const captchaToken = initCaptcha(byId('form-captcha'));
  const startedAt = Date.now();
  /** Campos já visitados: só validam ao digitar depois da primeira saída. @type {Set<string>} */
  const touched = new Set();
  let sending = false;

  /** @param {'is-success' | 'is-error' | ''} kind @param {import('../core/dom.js').SafeHtml} content */
  const showStatus = (kind, content) => {
    status.className = `form-status ${kind}`.trim();
    render(status, content);
  };

  const phone = /** @type {HTMLInputElement} */ (field('ct-tel'));
  phone.addEventListener('input', () => {
    const atEnd = phone.selectionStart === phone.value.length;
    phone.value = formatPhone(phone.value);
    if (atEnd) phone.setSelectionRange(phone.value.length, phone.value.length);
  });

  form.addEventListener('focusout', (event) => {
    const id = /** @type {HTMLElement} */ (event.target).id;
    if (!(id in RULES)) return;
    const value = field(id).value.trim();
    if (!value && !touched.has(id)) return; // não acusa erro em campo só atravessado com Tab
    touched.add(id);
    check(id);
  });
  form.addEventListener('input', (event) => {
    const id = /** @type {HTMLElement} */ (event.target).id;
    if (id in RULES && touched.has(id)) check(id);
  });
  form.addEventListener('change', (event) => {
    const id = /** @type {HTMLElement} */ (event.target).id;
    if (id === 'ct-func') { touched.add(id); check(id); }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    const ids = Object.keys(RULES);
    ids.forEach((id) => touched.add(id));
    const invalid = ids.filter((id) => !check(id));
    if (invalid.length) {
      showStatus('is-error', html`${invalid.length === 1 ? 'Confira o campo destacado.' : `Confira os ${invalid.length} campos destacados.`}`);
      field(invalid[0]).focus();
      return;
    }
    const captcha = captchaToken();
    if (byId('form-captcha').dataset.sitekey && !captcha) {
      showStatus('is-error', html`Confirme que você não é um robô para enviar.`);
      return;
    }

    /** @type {Record<string, string | number>} */
    const payload = {
      origem: window.location.href,
      website: /** @type {HTMLInputElement} */ (form.elements.namedItem('website'))?.value ?? '',
      elapsed: Date.now() - startedAt,
      turnstile: captcha,
    };
    for (const [key, id] of Object.entries(FIELDS)) payload[key] = field(id).value.trim();

    sending = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    showStatus('', html`Enviando…`);
    try {
      const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok) {
        form.reset();
        touched.clear();
        showStatus('is-success', html`Mensagem enviada. Um especialista da Devgo responde em breve.`);
        return;
      }
      const serverField = SERVER_FIELD[result.error];
      if (response.status === 400 && serverField) {
        if (check(serverField)) setError(serverField, 'Confira este campo.'); // o servidor recusou mesmo passando na regra local
        showStatus('is-error', html`Confira o campo destacado.`);
        field(serverField).focus();
        return;
      }
      if (result.error === 'captcha') {
        showStatus('is-error', html`Não conseguimos confirmar o captcha. Recarregue a página e tente de novo.`);
        return;
      }
      console.error('[devgo] envio do formulário falhou', response.status, result);
      throw new Error(`HTTP ${response.status}`);
    } catch {
      showStatus('is-error', html`Não conseguimos enviar agora. Tente de novo em instantes ou fale com a gente pelo <a href="${FALLBACK_CHANNEL}" target="_blank" rel="noopener noreferrer">LinkedIn</a>.`);
    } finally {
      sending = false;
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
    }
  });
}
