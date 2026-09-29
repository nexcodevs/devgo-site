// @ts-check
/** Grupos de perfis do "monte seu squad". */
import { PRODUCT_ILLUSTRATION, ENGINEERING_ILLUSTRATION, MOBILE_ILLUSTRATION, QUALITY_ILLUSTRATION } from './illustrations.js';

/**
 * @typedef {object} ProfileGroup
 * @property {string} title
 * @property {string} description
 * @property {string} icon arquivo em assets/
 * @property {string} color cor do grupo, como token (bordas, contador, bolinhas do squad)
 * @property {string} ink cor do texto e do ícone sobre `color` (token)
 * @property {string} illustration SVG estático
 * @property {string[]} roles nomes únicos entre todos os grupos
 */

/** @type {ProfileGroup[]} */
export const PROFILE_GROUPS = [
  {
    title: 'Produto e Design',
    description: 'Quem define o que construir e como a experiência funciona.',
    icon: 'card1.svg', color: 'var(--blue-500)', ink: 'var(--text-on-brand)', illustration: PRODUCT_ILLUSTRATION,
    roles: ['Product Manager', 'Product Owner', 'UX/UI Designer', 'UX Research'],
  },
  {
    title: 'Engenharia de software',
    description: 'Quem constrói e sustenta o produto, do front ao back.',
    icon: 'card2.svg', color: 'var(--blue-400)', ink: 'var(--text-on-brand)', illustration: ENGINEERING_ILLUSTRATION,
    roles: ['Front-end', 'Back-end', 'Full-stack', 'Tech Lead', 'Arquiteto'],
  },
  {
    title: 'Mobile',
    description: 'Apps nativos e multiplataforma, do protótipo à loja.',
    icon: 'card3.svg', color: 'var(--blue-300)', ink: 'var(--text-on-tint)', illustration: MOBILE_ILLUSTRATION,
    roles: ['iOS', 'Android', 'Cross-platform'],
  },
  {
    title: 'Qualidade e Operação',
    description: 'Quem garante que o que foi entregue funciona e continua funcionando.',
    icon: 'card4.svg', color: 'var(--blue-100)', ink: 'var(--text-on-tint)', illustration: QUALITY_ILLUSTRATION,
    roles: ['QA', 'Automação de testes', 'DevOps', 'Sustentação'],
  },
];
