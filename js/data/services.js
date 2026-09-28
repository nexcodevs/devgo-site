// @ts-check
/** Modelos de contratação exibidos no acordeão de Soluções. */

/**
 * @typedef {'alloc' | 'squad' | 'lead' | 'match'} VizKind
 * @typedef {object} Service
 * @property {string} title
 * @property {string} subtitle
 * @property {string} description
 * @property {string[]} bullets
 * @property {string} idealFor
 * @property {VizKind} viz ilustração exibida ao lado do texto
 */

/** @type {Service[]} */
export const SERVICES = [
  {
    title: 'Alocação de profissionais',
    subtitle: 'Profissional dedicado ao seu time',
    description: 'Profissionais de tecnologia alocados no seu time em regime full-time, com a sua rotina, suas ferramentas e sua gestão.',
    bullets: ['Devs front, back, full-stack e mobile', 'QA, DevOps, dados e UX/UI', 'Substituição garantida', 'Cobrança mensal por profissional'],
    idealFor: 'Times que precisam de capacidade extra sem abrir vaga CLT.',
    viz: 'alloc',
  },
  {
    title: 'Squad as a Service',
    subtitle: 'Squad dedicado',
    description: 'Um time completo, com devs, QA, design, PM e PO, montado para rodar junto e entregar um produto ou frente de negócio.',
    bullets: ['Composição sob medida', 'Rituais ágeis desde a primeira sprint', 'Escala para cima ou para baixo', 'Cobrança mensal pela capacidade do squad'],
    idealFor: 'Empresas que querem acelerar um produto sem montar um time do zero.',
    viz: 'squad',
  },
  {
    title: 'Liderança sob demanda',
    subtitle: 'Tech leads, arquitetos, PMs e POs',
    description: 'A camada de gestão técnica e de produto que falta no seu time, 100% dedicada e dentro da sua operação.',
    bullets: ['Arquitetos e tech leads', 'Product managers e product owners', 'Dedicação integral, sem consultoria avulsa', 'Cobrança mensal por profissional'],
    idealFor: 'Times que cresceram e precisam de direção técnica ou de produto.',
    viz: 'lead',
  },
  {
    title: 'Hunting tech',
    subtitle: 'Recrutamento para contratação efetiva',
    description: 'Busca ativa com match por IA e curadoria humana para vagas que vão para a sua própria folha.',
    bullets: ['Match por IA na base e no mercado', 'Validação técnica, cultural e de carreira', 'Shortlist pronta para entrevista', 'Fee por contratação realizada'],
    idealFor: 'Empresas que querem contratar direto, com a assertividade de quem só faz tech.',
    viz: 'match',
  },
];

/** Squad ilustrativo em duas camadas: produto em cima, construção embaixo. [cargo, iniciais] */
export const SQUAD_EXAMPLE = {
  product: /** @type {[string, string][]} */ ([['Product Manager', 'PM'], ['Product Owner', 'PO']]),
  build: /** @type {[string, string][]} */ ([['Dev Sênior', 'DS'], ['Dev Pleno', 'DP'], ['QA', 'QA'], ['UX/UI', 'UX']]),
  sprints: 4,
};

/**
 * Camada de gestão ilustrativa numa matriz 2×2: colunas técnico/produto,
 * linhas estratégia/execução. [cargo, sigla, foco]
 */
export const LEADERSHIP_EXAMPLE = /** @type {[string, string, string][]} */ ([
  ['Arquiteto de soluções', 'AR', 'arquitetura e padrões'],
  ['Product Manager', 'PM', 'estratégia e roadmap'],
  ['Tech Lead', 'TL', 'qualidade e entrega'],
  ['Product Owner', 'PO', 'backlog e prioridades'],
]);

/** Notas ilustrativas do match: [critério, nota %]. */
export const MATCH_SCORES = /** @type {const} */ ([['técnica', 92], ['cultura', 86], ['carreira', 90]]);
