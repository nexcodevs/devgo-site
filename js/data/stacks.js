// @ts-check
/**
 * Stacks e plataformas exibidas na órbita. Para incluir uma stack, adicione um
 * item em STACKS com uma categoria existente em CATEGORIES.
 */

/**
 * @typedef {object} Category
 * @property {string} name
 * @property {string} color  cor do anel/pílula (token category-*)
 * @property {string[]} roles perfis que alocamos nessa categoria
 */

/**
 * @typedef {object} Stack
 * @property {string} name
 * @property {string} [short] rótulo curto para a pílula da órbita
 * @property {string} category nome de uma Category
 * @property {string[]} tags
 * @property {boolean} hot alta demanda
 */

/** @type {Category[]} */
export const CATEGORIES = [
  { name: 'ERP', color: 'var(--category-erp)', roles: ['Consultor funcional', 'Desenvolvedor técnico', 'Arquiteto de soluções'] },
  { name: 'CRM', color: 'var(--category-crm)', roles: ['Desenvolvedor', 'Consultor funcional', 'Arquiteto'] },
  { name: 'E-commerce', color: 'var(--category-ecommerce)', roles: ['Dev front-end', 'Dev back-end e integrações', 'Tech Lead'] },
  { name: 'Cloud e DevOps', color: 'var(--category-cloud)', roles: ['DevOps / SRE', 'Engenheiro de cloud', 'Arquiteto cloud'] },
  { name: 'Dados e IA', color: 'var(--category-dados)', roles: ['Engenheiro de dados', 'Cientista de dados', 'Analista de BI'] },
  { name: 'Engenharia', color: 'var(--category-engenharia)', roles: ['Dev Pleno', 'Dev Sênior', 'Tech Lead'] },
];

/** @type {Stack[]} */
export const STACKS = [
  { name: 'SAP', category: 'ERP', tags: ['S/4HANA', 'ABAP', 'Fiori', 'BTP'], hot: true },
  { name: 'Oracle', category: 'ERP', tags: ['Oracle Cloud', 'E-Business Suite', 'PL/SQL'], hot: true },
  { name: 'TOTVS', category: 'ERP', tags: ['Protheus', 'RM', 'ADVPL'], hot: false },
  { name: 'Microsoft Dynamics 365', short: 'Dynamics 365', category: 'ERP', tags: ['Finance & Operations', 'Business Central'], hot: false },
  { name: 'Salesforce', category: 'CRM', tags: ['Sales', 'Service', 'Marketing Cloud', 'Apex'], hot: true },
  { name: 'ServiceNow', category: 'CRM', tags: ['ITSM', 'HRSD', 'desenvolvimento na plataforma'], hot: false },
  { name: 'HubSpot', category: 'CRM', tags: ['CRM', 'Marketing Hub', 'integrações'], hot: false },
  { name: 'VTEX', category: 'E-commerce', tags: ['VTEX IO', 'FastStore', 'integrações'], hot: true },
  { name: 'Salesforce Commerce Cloud', short: 'SF Commerce', category: 'E-commerce', tags: ['B2C Commerce', 'SFRA', 'headless'], hot: false },
  { name: 'Adobe Commerce', category: 'E-commerce', tags: ['Magento', 'PWA Studio'], hot: false },
  { name: 'Shopify Plus', category: 'E-commerce', tags: ['Apps', 'Hydrogen', 'checkout'], hot: false },
  { name: 'AWS', category: 'Cloud e DevOps', tags: ['Arquitetura', 'serverless', 'DevOps'], hot: true },
  { name: 'Microsoft Azure', short: 'Azure', category: 'Cloud e DevOps', tags: ['Infra', 'DevOps', '.NET na nuvem'], hot: true },
  { name: 'Google Cloud', short: 'GCP', category: 'Cloud e DevOps', tags: ['GKE', 'BigQuery', 'Cloud Run'], hot: false },
  { name: 'Kubernetes e Terraform', short: 'K8s · Terraform', category: 'Cloud e DevOps', tags: ['Containers', 'IaC', 'SRE'], hot: false },
  { name: 'Databricks', category: 'Dados e IA', tags: ['Lakehouse', 'Spark', 'MLflow'], hot: true },
  { name: 'Snowflake', category: 'Dados e IA', tags: ['Data warehouse', 'dbt', 'pipelines'], hot: false },
  { name: 'Power BI', category: 'Dados e IA', tags: ['Modelagem', 'DAX', 'dashboards'], hot: false },
  { name: 'IA generativa', category: 'Dados e IA', tags: ['LLMs', 'RAG', 'agentes', 'MLOps'], hot: true },
  { name: 'Java', category: 'Engenharia', tags: ['Spring Boot', 'microsserviços'], hot: true },
  { name: '.NET', category: 'Engenharia', tags: ['C#', 'ASP.NET Core'], hot: false },
  { name: 'Node.js e TypeScript', short: 'Node · TS', category: 'Engenharia', tags: ['APIs', 'NestJS', 'serverless'], hot: true },
  { name: 'React e Next.js', short: 'React · Next', category: 'Engenharia', tags: ['Front-end web', 'design systems'], hot: true },
  { name: 'Python', category: 'Engenharia', tags: ['Back-end', 'dados', 'automação'], hot: true },
  { name: 'Go', category: 'Engenharia', tags: ['Sistemas distribuídos', 'alta performance'], hot: false },
  { name: 'Flutter e React Native', short: 'Flutter · RN', category: 'Engenharia', tags: ['Apps iOS e Android'], hot: false },
  { name: 'Kotlin e Swift', short: 'Kotlin · Swift', category: 'Engenharia', tags: ['Apps nativos'], hot: false },
  { name: 'Qualidade e automação', short: 'QA automação', category: 'Engenharia', tags: ['Cypress', 'Playwright', 'Appium'], hot: false },
];
