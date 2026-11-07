# CosmoDash

SaaS de CRM com assistente de IA chamado Cosmo. Responda em português. O repositório é `Fagundes1712/CosmoDash`, e a branch principal é `main`.

Hoje o produto é um protótipo estático de 16 telas (14 abas, mais o perfil de colega e o de organização), sem backend e sem dependências:

- `project/`: as telas (`*.dc.html`), dados e regras (`data.js`, `app.js`) e estilo (`CosmoDash.css`)
- `project-original/`: cópia intacta do protótipo recebido, só para consulta
- `demo/`: servidor local e runtime das telas
- `scripts/`: verificação, build e teste do site publicado

Comandos, todos com Node 22 ou mais recente:

- `npm run dev`: demo em http://localhost:4173
- `npm run lint`: sintaxe de JS, JSON e telas, além de segredos expostos
- `npm test`: testes com `node --test`
- `npm run build`: gera o site em `dist/`
- `npm run verify`: os três acima
- Não há verificação de tipos, porque o projeto não usa TypeScript.

Detalhes de CI, deploy, recuperação e acessos estão em `docs/fluxo-de-desenvolvimento.md`.

## Para toda tarefa de desenvolvimento

Siga este fluxo sem esperar pedido, quando o usuário descrever algo a desenvolver:

1. Analise o pedido e identifique os critérios de aceitação.
2. Consulte as Issues com `gh issue list --state all --search "<termos>"` e evite duplicações.
3. Crie uma Issue com `gh issue create` quando a tarefa precisar de rastreamento e ainda não tiver uma.
4. Atualize a base com `git fetch origin main` e crie uma branch a partir de `origin/main`, como `feat/...`, `fix/...`, `docs/...` ou `chore/...`.
5. Implemente preservando a arquitetura e as funcionalidades existentes.
6. Rode `npm run verify` e, se a tela mudar, confira no navegador com a demo.
7. Corrija as falhas e repita os testes.
8. Revise o diff e procure regressões.
9. Faça commits descritivos e envie a branch com `git push -u origin <branch>`.
10. Abra ou atualize um PR para `main`, vinculado à Issue, usando o modelo do repositório.
11. Preencha no PR o objetivo, as alterações, os testes realizados, os riscos e as pendências.
12. Acompanhe as verificações com `gh pr checks` e informe falhas reais, com a causa.
13. Depois da integração autorizada, confira o workflow Deploy com `gh run list --workflow deploy.yml` e o site publicado.
14. Atualize a documentação quando o comportamento ou a arquitetura mudar.

Use `Closes #N` só quando o PR concluir a Issue. Caso contrário, use `Ref #N`.

Não crie Issues para perguntas, explicações ou tarefas que não mudem o repositório. Agrupe mudanças pequenas e relacionadas de maneira coerente.

## Autonomia

Execute sem pedir autorização as etapas rotineiras: inspeção, testes, Issues, branches, commits, push da branch e abertura de PR.

Peça a intervenção do usuário apenas em caso de falta de acesso, conflito relevante, decisão arquitetural importante, custo adicional, operação destrutiva ou risco significativo.

## Regras de segurança

- Preserve alterações preexistentes. Outras sessões podem estar editando esta mesma pasta, então confira `git status` antes de trocar de branch, adicione ao commit só os arquivos da sua tarefa e nunca descarte o que não é seu.
- Não desenvolva direto na `main`.
- Não faça merge sem autorização do usuário naquele PR. Com `DEPLOY_AUTOMATICO=true`, o merge na `main` publica em produção.
- Não contorne proteções de branch nem verificações que falharam.
- Nunca exponha segredos, tokens, senhas ou credenciais. O repositório é público, e tudo que entra nele fica visível.
- Não execute comandos destrutivos sem avaliar o impacto e obter autorização.
- Não altere hospedagem, domínio, banco de dados ou variáveis de produção sem autorização.
- Não use serviços ou APIs pagos sem autorização.
- Não invente resultados, links, testes ou operações concluídas.
