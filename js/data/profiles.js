// @ts-check
/** Grupos de perfis do "monte seu squad". */
import { PRODUCT_ILLUSTRATION, ENGINEERING_ILLUSTRATION, MOBILE_ILLUSTRATION, QUALITY_ILLUSTRATION } from './illustrations.js';

/**
 * @typedef {object} ProfileGroup
 * @property {string} title
 * @property {string} description
 * @property {string} icon arquivo em assets/
 * @property {string} color cor do grupo (bordas, contador, bolinhas do squad)
 * @property {string} ink cor do texto sobre `color`
 * @property {string} illustration SVG estático
 * @property {string[]} roles nomes únicos entre todos os grupos
 */

/** @type {ProfileGroup[]} */
export const PROFILE_GROUPS = [
  {
    title: 'Produto e Design',
    description: 'Quem define o que construir e como a experiência funciona.',
    icon: 'card1.svg', color: '#3C3CF3', ink: '#fff', illustration: PRODUCT_ILLUSTRATION,
    roles: ['Product Manager', 'Product Owner', 'UX/UI Designer', 'UX Research'],
  },
  {
    title: 'Engenharia de software',
    description: 'Quem constrói e sustenta o produto, do front ao back.',
    icon: 'card2.svg', color: '#5A5AF6', ink: '#fff', illustration: ENGINEERING_ILLUSTRATION,
    roles: ['Front-end', 'Back-end', 'Full-stack', 'Tech Lead', 'Arquiteto'],
  },
  {
    title: 'Mobile',
    description: 'Apps nativos e multiplataforma, do protótipo à loja.',
    icon: 'card3.svg', color: '#9C9CFF', ink: '#fff', illustration: MOBILE_ILLUSTRATION,
    roles: ['iOS', 'Android', 'Cross-platform'],
  },
  {
    title: 'Qualidade e Operação',
    description: 'Quem garante que o que foi entregue funciona e continua funcionando.',
    icon: 'card4.svg', color: '#DEDEFF', ink: '#150B95', illustration: QUALITY_ILLUSTRATION,
    roles: ['QA', 'Automação de testes', 'DevOps', 'Sustentação'],
  },
];
