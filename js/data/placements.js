// @ts-check
/** Feed "profissionais alocados" do bloco de números: cargos de maior demanda. */

/** @typedef {{ role: string, context: string }} Placement */

/** @type {Placement[]} */
export const PLACEMENTS = [
  { role: 'Dev Sênior · Back-end Java', context: 'alocado em time de produto' },
  { role: 'QA · Automação de testes', context: 'alocado em squad de e-commerce' },
  { role: 'Tech Lead · .NET', context: 'alocado na camada de gestão' },
  { role: 'Engenharia de Dados', context: 'alocado em time de dados' },
  { role: 'Consultor SAP · FI/CO', context: 'alocado em projeto S/4HANA' },
  { role: 'Salesforce Developer', context: 'alocado em time de CRM' },
  { role: 'Dev VTEX IO', context: 'alocado em operação de e-commerce' },
  { role: 'IA e LLM · Python', context: 'alocado em squad de produto' },
  { role: 'DevOps · AWS', context: 'alocado em time de plataforma' },
  { role: 'Product Owner', context: 'alocado em time de produto' },
  { role: 'Dev ABAP', context: 'alocado em sustentação SAP' },
  { role: 'Dev React Native', context: 'alocado em squad mobile' },
  { role: 'Dev Front-end · React', context: 'alocado em time de produto' },
  { role: 'Salesforce Admin', context: 'alocado em time comercial' },
];

/** Fotos que se revezam nos cartões. */
export const PLACEMENT_FACES = ['fa1.webp', 'fa2.webp', 'fa3.webp', 'fa4.webp', 'fa5.webp'];
