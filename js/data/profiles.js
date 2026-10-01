// @ts-check
/** "Monte seu squad": plataformas (passo 1) e cargos por categoria (passo 2). */

/**
 * @typedef {object} Platform
 * @property {string} name
 * @property {string} kind tipo de plataforma, exibido no cartão
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
  { name: 'Sob medida', kind: 'Web, mobile e APIs', roles: [] },
  { name: 'SAP', kind: 'ERP', roles: ['Consultor SAP FI/CO', 'Consultor SAP SD/MM', 'Dev ABAP', 'SAP Basis', 'SAP BTP', 'Arquiteto S/4HANA', 'Dev SAP Commerce (Hybris)', 'Consultor SAP Commerce (Hybris)'] },
  { name: 'TOTVS', kind: 'ERP', roles: ['Dev ADVPL/TL++', 'Consultor Protheus', 'Suporte Protheus', 'Consultor TOTVS RM', 'Dev TOTVS RM', 'Consultor Datasul', 'Especialista Fluig'] },
  { name: 'Oracle', kind: 'ERP', roles: ['Consultor Oracle Fusion', 'Consultor Oracle EBS', 'Dev Oracle PL/SQL', 'Dev Oracle Integration (OIC)', 'DBA Oracle'] },
  { name: 'Dynamics', kind: 'ERP e CRM', roles: ['Consultor Dynamics F&O', 'Dev Dynamics (X++)', 'Consultor Business Central', 'Consultor Dynamics CE (CRM)'] },
  { name: 'Salesforce', kind: 'CRM', roles: ['Salesforce Admin', 'Salesforce Developer', 'Consultor Sales/Service Cloud', 'Consultor Marketing Cloud', 'Dev Salesforce Commerce Cloud', 'Arquiteto Salesforce'] },
  { name: 'ServiceNow', kind: 'ITSM', roles: ['Dev ServiceNow', 'Admin ServiceNow', 'Consultor ServiceNow ITSM', 'Arquiteto ServiceNow'] },
  { name: 'HubSpot', kind: 'CRM', roles: ['Admin HubSpot', 'Dev HubSpot (CMS)', 'Consultor HubSpot RevOps'] },
  { name: 'VTEX', kind: 'E-commerce', roles: ['Dev VTEX IO', 'Dev Front-end VTEX', 'Consultor VTEX', 'Integrações VTEX'] },
  { name: 'Adobe Commerce', kind: 'E-commerce', roles: ['Dev Adobe Commerce (Magento)', 'Arquiteto Adobe Commerce', 'Integrações Adobe Commerce'] },
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
    roles: ['iOS', 'Android', 'React Native', 'Flutter', 'Kotlin Multiplatform', 'Tech Lead Mobile', 'QA Mobile'],
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
