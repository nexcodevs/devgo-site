// @ts-check
/** "Monte seu squad": plataformas (passo 1) e cargos por categoria (passo 2). */

/**
 * @typedef {object} Platform
 * @property {string} name
 * @property {string[]} roles especialistas da plataforma (vazio = sem aba própria)
 */

/**
 * @typedef {object} ProfileGroup
 * @property {string} title
 * @property {string} description
 * @property {string} icon arquivo em assets/
 * @property {string[]} roles nomes únicos entre todos os grupos e plataformas
 */

/** @type {Platform[]} */
export const PLATFORMS = [
  { name: 'Produto sob medida', roles: [] },
  { name: 'SAP', roles: ['Consultor SAP FI/CO', 'Consultor SAP SD/MM', 'Dev ABAP', 'SAP Basis', 'SAP BTP', 'Arquiteto S/4HANA'] },
  { name: 'TOTVS', roles: ['Dev ADVPL/TL++', 'Consultor Protheus', 'Especialista Fluig'] },
  { name: 'Salesforce', roles: ['Salesforce Admin', 'Salesforce Developer', 'Consultor Sales/Service Cloud', 'Consultor Marketing Cloud', 'Arquiteto Salesforce'] },
  { name: 'Dynamics 365', roles: ['Consultor Dynamics F&O', 'Dev Dynamics (X++)', 'Consultor Business Central'] },
  { name: 'VTEX', roles: ['Dev VTEX IO', 'Dev Front-end VTEX', 'Consultor VTEX', 'Integrações VTEX'] },
  { name: 'Shopify', roles: ['Dev Shopify (Liquid)', 'Dev Shopify Hydrogen', 'Integrações Shopify'] },
];

/** @type {ProfileGroup[]} */
export const PROFILE_GROUPS = [
  {
    title: 'Produto e Design',
    description: 'Quem define o que construir e como a experiência funciona.',
    icon: 'card1.svg',
    roles: ['Product Manager', 'Product Owner', 'UX/UI Designer', 'UX Research', 'Scrum Master'],
  },
  {
    title: 'Engenharia',
    description: 'Quem constrói e sustenta o produto, do front ao back.',
    icon: 'card2.svg',
    roles: ['Front-end', 'Back-end', 'Full-stack', 'Tech Lead', 'Arquiteto de Software'],
  },
  {
    title: 'Mobile',
    description: 'Apps nativos e multiplataforma, do protótipo à loja.',
    icon: 'card3.svg',
    roles: ['iOS', 'Android', 'React Native', 'Flutter'],
  },
  {
    title: 'Dados e IA',
    description: 'Quem organiza os dados e coloca modelos e IA em produção.',
    icon: 'card5.svg',
    roles: ['Engenharia de Dados', 'Análise de Dados e BI', 'Ciência de Dados', 'Machine Learning', 'IA e LLM'],
  },
  {
    title: 'Qualidade e Operação',
    description: 'Quem garante que o que foi entregue funciona e continua funcionando.',
    icon: 'card4.svg',
    roles: ['QA', 'Automação de testes', 'DevOps', 'SRE', 'Cloud', 'Sustentação'],
  },
];

/** Ícone da aba de especialistas da plataforma escolhida. */
export const PLATFORM_ICON = 'card6.svg';
