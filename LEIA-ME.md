# CosmoDash

Protótipo navegável de CRM com 12 abas: Painel, Conversas, Contatos, Funil de vendas, Tarefas, Instâncias WhatsApp, Metas e conquistas, Organizações, Equipe e permissões, Planos e pagamentos, Meu perfil e Suporte interno. Conversas e Instâncias WhatsApp são páginas iniciais, sem envio real de mensagens. O assistente se chama Cosmo.

## Como abrir

Na pasta do projeto, rode o comando abaixo e abra http://localhost:4173. Só precisa do Node.

    node demo/serve.js

Testes:

    node --test demo/

## O que tem aqui

- `project/*.dc.html`: uma tela por arquivo
- `project/app.js`: regras, persistência e menu lateral compartilhados
- `project/data.js`: dados de demonstração das 3 organizações
- `project/CosmoDash.css`: estilo compartilhado
- `demo/`: runtime das telas, servidor local e testes
- `project-original/`: cópia do protótipo como foi recebido

## Limites

Não há backend. Os dados ficam no `localStorage` deste navegador, e o Cosmo responde por regras, sem modelo de IA. E-mails, convites e pagamentos são simulados. Para voltar ao início, use Perfil, Restaurar dados originais.
