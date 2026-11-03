# CosmoDash

Protótipo navegável de CRM com 9 telas: Dashboard, Funis de vendas, Contatos, Tarefas, Suporte interno, Metas e conquistas, Equipe e acessos, Perfil, Planos e pagamentos. O assistente se chama Cosmo.

## Como abrir

Na pasta do projeto, rode o comando abaixo e abra http://localhost:4173. Só precisa do Node.

    node demo/serve.js

Testes:

    node --test demo/

## O que tem aqui

- `project/*.dc.html`: uma tela por arquivo
- `project/app.js`: regras, persistência e menu lateral compartilhados
- `project/data.js`: dados de demonstração das 3 organizações
- `project/orbita.css`: estilo compartilhado
- `demo/`: runtime das telas, servidor local e testes
- `project-original/`: cópia do protótipo como foi recebido

## Limites

Não há backend. Os dados ficam no `localStorage` deste navegador, e o Cosmo responde por regras, sem modelo de IA. E-mails, convites e pagamentos são simulados. Para voltar ao início, use Perfil, Restaurar dados originais.
