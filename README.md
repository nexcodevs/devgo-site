# devgo-site

Site institucional da Devgo (devgo.digital). HTML estático, sem build.

- `index.html` — página única
- `assets/` — imagens e vídeo de fundo
- `fonts/` — PP Neue Montreal (300/400/600/700)
- `vercel.json` — cache longo para assets/fonts

Deploy: Vercel (framework "Other", sem build command, output = raiz).

Sistema visual: os tokens de tipografia, espaço, movimento e cor ficam no bloco `/* ===== Refino UI/UX · sistema ===== */` no fim do CSS. Mudanças de estilo entram por esses tokens.

Pendente: o formulário de contato valida os campos, mas ainda não envia para nenhum destino. Hoje a mensagem de sucesso avisa isso e aponta para o LinkedIn.
