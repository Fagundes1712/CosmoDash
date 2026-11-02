# Fluxo de desenvolvimento

Como o repositório garante as regras do `CLAUDE.md`, e o que fazer quando algo dá errado.

## O que roda e onde

| Camada | Arquivo | O que faz |
| --- | --- | --- |
| Instruções do Claude Code | `CLAUDE.md` | Carregadas em toda sessão nesta pasta |
| Hook do Claude Code | `.claude/settings.json`, `.claude/hooks/guard-git.js` | Bloqueia commit e push na `main`, push forçado, `--no-verify`, `reset --hard` e outros comandos destrutivos; roda `lint` antes de commit e `verify` antes de push |
| Permissões do Claude Code | `.claude/settings.json` | Pede confirmação para merge, execução manual de workflow e edição do repositório; proíbe push forçado, `reset --hard` e `gh repo delete` |
| Verificação de PR | `.github/workflows/ci.yml` | Job `verify`: lint, testes, build, teste do site gerado |
| Proteção da `main` | `.github/branch-protection.json` | Exige PR, job `verify` aprovado, branch atualizada e conversas resolvidas, inclusive para administradores |
| Publicação | `.github/workflows/deploy.yml` | A cada push na `main`, se `DEPLOY_AUTOMATICO=true`: verifica, publica no GitHub Pages e confere o site |
| Atualização de actions | `.github/dependabot.yml` | Abre PR mensal; as actions são fixadas por hash do commit |

## Ambientes

- **Testes:** o job `verify` em cada PR.
- **Pré-visualização:** o artefato `site` de cada execução do CI, que vale por 7 dias. Baixe, extraia e sirva a pasta localmente. Não há URL pública por PR, porque o GitHub Pages não oferece isso.
- **Produção:** https://fagundes1712.github.io/CosmoDash/, atualizada pelo merge na `main` enquanto `DEPLOY_AUTOMATICO=true`, ou pela execução manual do Deploy.

O site é um protótipo estático, sem banco e sem variáveis de produção.

## Política de deploy

A publicação automática começa desligada. Para ligar ou desligar:

```bash
gh variable set DEPLOY_AUTOMATICO --body true
gh variable set DEPLOY_AUTOMATICO --body false
```

Com ela ligada, o merge de um PR aprovado na `main` é a autorização de publicação. Só o usuário autoriza o merge. O Deploy roda `npm run verify` de novo antes de publicar, então uma versão com falha não sai do build.

## Recuperação

Se o site publicado quebrar, a forma mais rápida é publicar de novo o último commit bom:

```bash
gh run list --workflow deploy.yml
gh workflow run deploy.yml -f ref=<commit-bom>
```

Depois, corrija a causa em um PR, ou reverta com `gh pr create` a partir de um `git revert` em uma branch. Sem isso, o próximo merge publica o problema outra vez.

Se o passo "Conferir o site publicado" falhar, a versão nova já está no ar. Use o procedimento acima.

## Requisitos de acesso

- `gh` autenticado com os escopos `repo` e `workflow`. Confira com `gh auth status`.
- Permissão de administrador no repositório, só para refazer a proteção ou as configurações abaixo.
- O GitHub Free só oferece proteção de branch e Pages em repositório público. Tornar o repositório privado sem o plano Pro desativa os dois.
- Nenhum segredo é necessário. O deploy usa o `GITHUB_TOKEN` temporário do Actions.

## Refazer a configuração do GitHub

```bash
gh api -X PUT repos/Fagundes1712/CosmoDash/branches/main/protection --input .github/branch-protection.json
gh api -X POST repos/Fagundes1712/CosmoDash/pages -f build_type=workflow
gh repo edit Fagundes1712/CosmoDash --delete-branch-on-merge
```
