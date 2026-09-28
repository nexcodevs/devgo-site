# devgo-site

Site institucional da Devgo (devgo.digital). HTML, CSS e JavaScript estáticos:
sem framework, sem build e sem dependências em produção.

## Estrutura

```
index.html            marcação da página (todo o texto indexável está aqui)
css/site.css          estilos: tokens → base → layout → componentes → seções → movimento
js/main.js            ponto de entrada; inicia cada feature isolada (uma falha não derruba as outras)
js/core/dom.js        helpers de DOM, template `html` com escape automático, visibilidade
js/data/*.js          conteúdo: serviços, stacks, perfis, cidades, ilustrações, pontos do globo
js/features/*.js      comportamento de cada seção (acordeão, globo, stacks, squad, formulário…)
assets/ fonts/        imagens, vídeo e a fonte PP Neue Montreal
tests/                ferramentas de desenvolvimento e testes (não vão para produção)
vercel.json           cabeçalhos de segurança (CSP) e política de cache
```

### Convenções

- **Conteúdo separado de comportamento.** Para mudar um serviço, uma stack ou um perfil, edite só `js/data/`.
- **HTML dinâmico sempre pelo template `html`** (`js/core/dom.js`), que escapa toda interpolação.
  Só SVG estático do próprio site passa por `trusted()`.
- **Estados em CSS com prefixo `is-`** (`is-active`, `is-open`, `is-pending`…).
- **Tokens primeiro.** Cores, tipografia, espaço e movimento ficam em `:root`; componentes usam os tokens.
- **Movimento reduzido é respeitado em tudo:** nada fica escondido, acordeão e globo ficam estáticos.
- JS com `// @ts-check` e JSDoc: tipado sem etapa de build.

## Desenvolvimento

Qualquer servidor estático na raiz serve o site (os módulos ES não abrem via `file://`):

```
python3 -m http.server 8000
```

Checagens (tipos, lint e testes de ponta a ponta com Playwright):

```
npm --prefix tests install
npm --prefix tests test
```

Os testes sobem um servidor que aplica os mesmos cabeçalhos do `vercel.json`, então uma violação da CSP
quebra o teste antes de chegar à produção. Ao criar um módulo em `js/`, inclua o `<link rel="modulepreload">`
correspondente no `index.html` (há um teste que confere a lista).

## Deploy

Vercel, ligado a este repositório: cada push na `main` publica em produção e cada branch gera uma prévia.
Projeto sem build command; a raiz é o diretório de saída. `.vercelignore` deixa `tests/` fora do deploy.

## Pendências de conteúdo

- O formulário valida os campos, mas ainda não envia para nenhum destino. Com os dados válidos, a mensagem
  avisa isso e aponta para o LinkedIn. Falta definir o destino (e-mail, CRM ou planilha).
- Domínio devgo.digital ainda não aponta para este projeto.
