// @ts-check
/**
 * Ponto de entrada. Carrega só as features presentes nesta página
 * (ver registry.js) e inicia cada uma isolada: se uma falhar, as demais
 * continuam funcionando e o erro fica no console com o nome da feature.
 */
import { FEATURES } from './registry.js';

const active = FEATURES.filter((feature) => document.querySelector(feature.selector));
const loaded = await Promise.allSettled(active.map((feature) => import(feature.module)));

active.forEach((feature, i) => {
  const result = loaded[i];
  try {
    if (result.status === 'rejected') throw result.reason;
    /** @type {Record<string, unknown>} */
    const module = result.value;
    const init = module[feature.init];
    if (typeof init !== 'function') throw new Error(`${feature.module} não exporta ${feature.init}`);
    init();
  } catch (error) {
    console.error(`[devgo] falha ao iniciar "${feature.name}"`, error);
  }
});
