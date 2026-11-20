# VELYRA — Future Agency Concept

Website futurista editável em HTML, CSS e JavaScript puro.

## Como executar no VS Code

1. Extrai o ZIP e abre a pasta no VS Code.
2. Instala a extensão **Live Server** (opcional).
3. Clica em **Go Live** ou abre `index.html` no browser.
4. Altera `style.css`, `index.html` ou `app.js` e guarda com Ctrl+S. O Live Server atualiza a página.

## Funcionalidades

- Landing page responsiva, efeitos visuais e animações em canvas.
- Português/inglês, alternância de modos visuais, laboratório de identidades.
- Formulário de contacto que copia uma mensagem para a área de transferência.
- `admin.html`: **demonstração local não ligada ao site público** de gestão de criadores, contactos, campanhas e tarefas com armazenamento `localStorage` e exportação JSON.

## Limitações importantes

**Não há autenticação real nesta versão.** `admin.html` é apenas uma demonstração local, não uma dashboard privada segura. Não coloques dados sensíveis nela nem publiques a dashboard como se estivesse protegida.

Para uma versão de produção: implementar autenticação no servidor (com 2FA), PostgreSQL/Supabase com regras de acesso, APIs protegidas, armazenamento privado, backups, auditoria e RGPD. O website público e a dashboard deverão ser separados antes do deploy.

O nome VELYRA é uma proposta criativa. Verificar disponibilidade de domínio e marca antes de utilização comercial.
