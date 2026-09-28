# devgo-site

Site institucional da Devgo (devgo.digital). HTML, CSS e JavaScript estáticos:
sem framework, sem build e sem dependências em produção.

## Estrutura

```
site/pages/*.html     páginas (home, como-funciona, especialidades, contato, insights)
site/pages/insights/  artigos de Insights, um arquivo por artigo
site/partials/*.html  trechos compartilhados: head, header, footer, contato, FAQ, etapas…
build/build.mjs       monta as páginas, pré-renderiza blocos de js/data e gera dist/
build/renderers.mjs   blocos gerados a partir dos dados (prévia de especialidades, tabela de modelos)
css/site.css          estilos: tokens → base → layout → componentes → seções → movimento
js/main.js            ponto de entrada; carrega só as features presentes na página
js/registry.js        lista de features, seletor e módulo de cada uma (usada também pelo build)
js/core/              helpers de DOM e estado compartilhado
js/data/*.js          conteúdo: serviços, stacks, perfis, cidades, ilustrações, pontos do globo
js/features/*.js      comportamento de cada seção (acordeão, globo, stacks, squad, formulário…)
assets/ fonts/        imagens, vídeo e a fonte PP Neue Montreal
tests/                ferramentas de desenvolvimento e testes (não vão para produção)
vercel.json           build, cabeçalhos de segurança (CSP) e política de cache
```

### Páginas

Cada página em `site/pages` começa com uma linha de metadados:

```
<!--page {"slug":"como-funciona","nav":"como-funciona","title":"…","description":"…"} -->
```

`<!-- include:nome -->` insere `site/partials/nome.html` e `<!-- render:nome -->` insere um bloco de
`build/renderers.mjs`. O build marca o link da página no menu, pré-carrega só os módulos JS que a página
usa e gera `sitemap.xml` e `robots.txt`.

Para publicar um artigo, copie um arquivo de `site/pages/insights/`, troque os metadados (`slug`, `title`,
`description`, `category`, `date`, `readingTime`, `summary`) e o texto. A listagem de Insights, o bloco da home,
"Continue lendo" e os dados estruturados do artigo são gerados a partir desses metadados. Para trocar o domínio, altere `SITE_URL` em `build/build.mjs`.

### Convenções

- **Conteúdo separado de comportamento.** Para mudar um serviço, uma stack ou um perfil, edite só `js/data/`.
- **HTML dinâmico sempre pelo template `html`** (`js/core/dom.js`), que escapa toda interpolação.
  Só SVG estático do próprio site passa por `trusted()`.
- **Estados em CSS com prefixo `is-`** (`is-active`, `is-open`, `is-pending`…).
- **Tokens primeiro.** Cores, tipografia, espaço e movimento ficam em `:root`; componentes usam os tokens.
- **Movimento reduzido é respeitado em tudo:** nada fica escondido, acordeão e globo ficam estáticos.
- JS com `// @ts-check` e JSDoc: tipado sem etapa de build.

## Desenvolvimento

Gere o site e sirva a pasta `dist/` (os módulos ES não abrem via `file://`):

```
node build/build.mjs
python3 -m http.server 8000 -d dist
```

Checagens (tipos, lint e testes de ponta a ponta com Playwright):

```
npm --prefix tests install
npm --prefix tests test
```

Os testes sobem um servidor que aplica os mesmos cabeçalhos do `vercel.json`, então uma violação da CSP
quebra o teste antes de chegar à produção. Ao criar uma feature, registre-a
em `js/registry.js`; o build calcula os pré-carregamentos sozinho.

## Deploy

Vercel, ligado a este repositório: cada push na `main` publica em produção e cada branch gera uma prévia.
O build roda `node build/build.mjs` (sem dependências) e publica `dist/`. `.vercelignore` deixa `tests/` fora do deploy.

## Pendências de conteúdo

- O formulário valida os campos, mas ainda não envia para nenhum destino. Com os dados válidos, a mensagem
  avisa isso e aponta para o LinkedIn. Falta definir o destino (e-mail, CRM ou planilha).
- Domínio devgo.digital ainda não aponta para este projeto.
